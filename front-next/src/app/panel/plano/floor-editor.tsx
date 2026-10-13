"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useReducer, useState, useSyncExternalStore } from "react";

import { errorMessage } from "@/app/panel/carta/queries";
import { Skeleton } from "@/app/panel/carta/ui";
import { fromPlan, isDirty, newKey, nextTableCode, reducer, snap, toBody, type EditorState, type FloorItem } from "@/app/panel/plano/editor-state";
import { FloorCanvas, type DropPayload } from "@/app/panel/plano/floor-canvas";
import { ItemPropertiesCard, RoomDimensionsCard, ToolPalette } from "@/app/panel/plano/properties-panel";
import { fetchPlan, usePlan, useRooms, useSavePlan } from "@/app/panel/plano/queries";
import { RoomDialog } from "@/app/panel/plano/room-dialog";
import { RoomTabs } from "@/app/panel/plano/room-tabs";
import { useToast } from "@/app/panel/providers";
import { useRealtimeEvent } from "@/app/panel/realtime";
import { Icon } from "@/components/icons";
import { Button, ConfirmDialog, EmptyState } from "@/components/ui";
import { ApiRequestError } from "@/lib/browser-api";
import type { Plan, Room } from "@/lib/schemas/plano";

type DialogState = { open: false } | { open: true; room?: Room };

export function FloorEditor({ canEdit }: { canEdit: boolean }) {
  const rooms = useRooms();
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [dirty, setDirty] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState<number | null>(null);

  const sorted = [...(rooms.data ?? [])].sort((a, b) => a.orden - b.orden || a.id - b.id);
  const current = sorted.find((room) => room.id === selectedRoom) ?? sorted[0];

  if (rooms.isPending) {
    return <Skeleton className="h-[480px]" />;
  }

  if (rooms.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-bold">No pudimos cargar los salones.</p>
        <p className="mt-1 text-sm">{rooms.error.message}</p>
        <Button variant="secondary" onClick={() => void rooms.refetch()} className="mt-4">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <>
      {sorted.length === 0 ? (
        <EmptyState
          icon="plano"
          title="Dibuja tu local"
          description={
            canEdit
              ? "Crea tus salones y ubica las mesas como están en el local. Tus mozos tomarán los pedidos tocando cada mesa."
              : "Todavía no se dibujó el plano del local."
          }
          actionLabel={canEdit ? "Crear mi primer salón" : undefined}
          onAction={canEdit ? () => setDialog({ open: true }) : undefined}
        />
      ) : (
        <>
          <RoomTabs
            rooms={sorted}
            current={current.id}
            canEdit={canEdit}
            onSelect={(id) => {
              if (id === current.id) return;
              if (dirty) {
                setPendingRoomId(id);
                return;
              }
              setSelectedRoom(id);
            }}
            onCreate={() => setDialog({ open: true })}
            onEdit={(room) => setDialog({ open: true, room })}
          />
          <RoomPlan key={current.id} room={current} canEdit={canEdit} onDirtyChange={setDirty} />
        </>
      )}

      <ConfirmDialog
        open={pendingRoomId !== null}
        title="¿Salir sin guardar cambios?"
        description="Tienes modificaciones pendientes en este salón. Si cambias de salón ahora, esos cambios se perderán."
        confirmLabel="Salir sin guardar"
        cancelLabel="Seguir editando"
        variant="warning"
        onConfirm={() => {
          if (pendingRoomId !== null) {
            setDirty(false);
            setSelectedRoom(pendingRoomId);
            setPendingRoomId(null);
          }
        }}
        onCancel={() => setPendingRoomId(null)}
      />

      <RoomDialog
        key={dialog.open ? (dialog.room?.id ?? "nuevo") : "cerrado"}
        open={dialog.open}
        room={dialog.open ? dialog.room : undefined}
        rooms={sorted}
        onClose={() => setDialog({ open: false })}
        onCreated={(room) => setSelectedRoom(room.id)}
      />
    </>
  );
}

function RoomPlan({ room, canEdit, onDirtyChange }: { room: Room; canEdit: boolean; onDirtyChange: (dirty: boolean) => void }) {
  const plan = usePlan(room.id);

  if (plan.isPending) return <Skeleton className="mt-4 h-[480px]" />;
  if (plan.isError) {
    return (
      <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-6 font-semibold text-red-700">
        No pudimos cargar el plano: {plan.error.message}
      </p>
    );
  }

  return <PlanEditor plan={plan.data} canEdit={canEdit} onDirtyChange={onDirtyChange} />;
}

function PlanEditor({ plan, canEdit, onDirtyChange }: { plan: Plan; canEdit: boolean; onDirtyChange: (dirty: boolean) => void }) {
  const toast = useToast();
  const save = useSavePlan(plan.salon.id);
  const [state, dispatch] = useReducer(reducer, plan, fromPlan);
  const [conflict, setConflict] = useState(false);
  const [remoteChange, setRemoteChange] = useState(false);
  const queryClient = useQueryClient();
  const isPhone = useMediaQuery("(max-width: 639px)");
  const editable = canEdit && !isPhone;
  const dirty = isDirty(state);

  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  // Aviso del navegador al salir con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useKeyboard(state, dispatch, editable, () => void onSave());

  async function onSave() {
    if (!dirty || save.isPending) return;
    const { body, tableKeys, elementKeys } = toBody(state);

    try {
      const { data } = await save.mutateAsync(body);
      dispatch({ type: "load", plan: data });
      setConflict(false);
      toast({ tone: "ok", message: "Plano guardado." });
    } catch (error) {
      if (!(error instanceof ApiRequestError)) {
        toast({ tone: "error", message: errorMessage(error) });
        return;
      }

      if (error.codigo === "PLANO_DESACTUALIZADO") {
        setConflict(true);
      } else if (error.codigo === "MESA_EN_USO") {
        // Las mesas ocupadas vuelven al lienzo tal como están en el servidor.
        const server = await fetchPlan(plan.salon.id);
        const busy = new Set((error.detalles as unknown as { mesas?: string[] } | null)?.mesas ?? []);
        const missing = fromPlan(server).items.filter((item) => item.kind === "mesa" && busy.has(item.codigo) && !state.items.some((own) => own.key === item.key));
        dispatch({ type: "restore", items: [...state.items, ...missing] });
        toast({ tone: "error", message: error.message });
      } else if (error.status === 422 && error.detalles) {
        const errors = mapErrors(error.detalles, tableKeys, elementKeys);
        dispatch({ type: "errors", errors });
        const first = Object.keys(errors)[0];
        if (first) dispatch({ type: "select", key: first });
        toast({ tone: "error", message: "Hay objetos con datos inválidos. Revísalos en rojo." });
      } else {
        toast({ tone: "error", message: error.message });
      }
    }
  }

  async function reload() {
    const fresh = await fetchPlan(plan.salon.id);
    dispatch({ type: "load", plan: fresh });
    setConflict(false);
    setRemoteChange(false);
  }

  // Otra persona guardó este plano (spec 005): si no hay cambios locales se recarga solo;
  // si los hay, se avisa antes de que el guardado termine en un 409.
  useRealtimeEvent("PlanoActualizado", (event) => {
    if (event.salon_id !== plan.salon.id || event.version <= state.version) return;
    void queryClient.invalidateQueries({ queryKey: ["salones"], exact: true });
    if (dirty) setRemoteChange(true);
    else void reload();
  });

  const selected = state.items.find((item) => item.key === state.selected);

  function handleDropItem(payload: DropPayload, coords: { x: number; y: number }) {
    const posX = Math.min(Math.max(snap(coords.x - payload.ancho / 2), 0), Math.max(0, state.width - payload.ancho));
    const posY = Math.min(Math.max(snap(coords.y - payload.alto / 2), 0), Math.max(0, state.height - payload.alto));

    if (payload.kind === "mesa") {
      const item: FloorItem = {
        key: newKey(),
        kind: "mesa",
        codigo: nextTableCode(state.items),
        capacidad: payload.capacidad,
        forma: payload.forma,
        estado: "LIBRE",
        pos_x: posX,
        pos_y: posY,
        ancho: payload.ancho,
        alto: payload.alto,
        rotacion: 0,
      };
      dispatch({ type: "add", item });
      dispatch({ type: "select", key: item.key });
    } else {
      const item: FloorItem = {
        key: newKey(),
        kind: "elemento",
        tipo: payload.tipo,
        etiqueta: payload.tipo === "TEXTO" ? "Texto" : null,
        capa: 0,
        pos_x: posX,
        pos_y: posY,
        ancho: payload.ancho,
        alto: payload.alto,
        rotacion: 0,
      };
      dispatch({ type: "add", item });
      dispatch({ type: "select", key: item.key });
    }
  }

  return (
    <div className="mt-4">
      {remoteChange && !conflict && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-celeste bg-celeste/10 px-4 py-3">
          <Icon name="alerta" className="h-5 w-5 shrink-0 text-azul" />
          <p className="flex-1 text-sm font-semibold text-tinta">Otra persona guardó este plano mientras editabas.</p>
          <Button onClick={() => void reload()}>Ver su versión</Button>
          <Button variant="secondary" onClick={() => setRemoteChange(false)}>
            Seguir editando
          </Button>
        </div>
      )}

      {conflict && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amarillo bg-amarillo/15 px-4 py-3">
          <Icon name="alerta" className="h-5 w-5 shrink-0 text-tinta" />
          <p className="flex-1 text-sm font-semibold text-tinta">Alguien actualizó este plano mientras editabas. Tus cambios no se guardaron.</p>
          <Button onClick={() => void reload()}>Recargar</Button>
          <Button variant="secondary" onClick={() => setConflict(false)}>
            Revisar
          </Button>
        </div>
      )}

      {canEdit && isPhone && (
        <p className="mb-3 rounded-xl bg-celeste/10 px-4 py-3 text-sm font-semibold text-azul">
          Para editar el plano usa una tablet o computadora.
        </p>
      )}

      <div
        className={`mt-2 gap-3.5 ${
          editable ? "xl:grid xl:grid-cols-[240px_1fr_240px] 2xl:grid-cols-[260px_1fr_260px] items-start" : ""
        }`}
      >
        {editable && (
          /* COLUMNA 1 (IZQUIERDA): Paleta compacta de Mesas y Elementos */
          <div className="xl:sticky xl:top-24">
            <ToolPalette />
          </div>
        )}

        {/* COLUMNA 2 (CENTRAL): ¡El plano del salón ocupa el máximo espacio disponible! */}
        <div className="min-w-0">
          <FloorCanvas
            width={state.width}
            height={state.height}
            items={state.items}
            selected={state.selected}
            errors={state.errors}
            editable={editable}
            dispatch={dispatch}
            onDropItem={handleDropItem}
          />
          {editable && (
            <p className="mt-2 text-center text-xs text-slate-500">
              Arrastra mesas y elementos hacia el salón · Arrastra para mover · esquina para cambiar tamaño
            </p>
          )}
        </div>

        {editable && (
          /* COLUMNA 3 (DERECHA): Guardado, Propiedades del elemento y Dimensiones del Salón */
          <div className="flex flex-col gap-3 xl:sticky xl:top-24">
            {/* Cuadrito de cambios sin guardar */}
            {dirty ? (
              <div
                role="status"
                className="flex flex-col gap-2.5 rounded-2xl border border-amber-200/90 bg-amber-50/90 p-3.5 shadow-2xs animate-in fade-in slide-in-from-top-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                    </span>
                    <span className="text-xs font-bold text-amber-950">
                      Cambios sin guardar
                    </span>
                  </div>
                  <kbd className="inline-flex items-center justify-center rounded-md border border-amber-200/90 bg-amber-100/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-900 shadow-2xs">
                    Ctrl + S
                  </kbd>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => dispatch({ type: "undo" })}
                    disabled={state.past.length === 0}
                    className="w-full text-xs font-bold"
                  >
                    Deshacer
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void onSave()}
                    isLoading={save.isPending}
                    className="w-full text-xs font-bold"
                  >
                    {save.isPending ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Propiedades del elemento seleccionado */}
            {selected && (
              <ItemPropertiesCard
                state={state}
                item={selected}
                error={state.errors[selected.key]}
                dispatch={dispatch}
              />
            )}

            {/* Dimensiones del Salón */}
            <RoomDimensionsCard
              width={state.width}
              height={state.height}
              dispatch={dispatch}
            />

            {/* Atajos de teclado cuando no hay un elemento seleccionado */}
            {!selected && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 text-xs shadow-2xs">
                <div className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                      <Icon name="calendario" className="h-3 w-3" />
                    </div>
                    <h4 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      Atajos rápidos
                    </h4>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">Teclado</span>
                </div>
                <ul className="space-y-1.5 text-slate-600">
                  <li className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] font-semibold text-slate-600">Mover</span>
                    <kbd className="inline-flex items-center justify-center rounded-md border border-slate-200/90 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">Flechas</kbd>
                  </li>
                  <li className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] font-semibold text-slate-600">Ajuste fino (1px)</span>
                    <span className="inline-flex items-center gap-1">
                      <kbd className="inline-flex items-center justify-center rounded-md border border-slate-200/90 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">Shift</kbd>
                      <span className="text-[10px] text-slate-400">+</span>
                      <kbd className="inline-flex items-center justify-center rounded-md border border-slate-200/90 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">Flechas</kbd>
                    </span>
                  </li>
                  <li className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] font-semibold text-slate-600">Girar 90°</span>
                    <kbd className="inline-flex items-center justify-center min-w-[20px] rounded-md border border-slate-200/90 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-azul shadow-2xs">R</kbd>
                  </li>
                  <li className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] font-semibold text-slate-600">Duplicar</span>
                    <span className="inline-flex items-center gap-1">
                      <kbd className="inline-flex items-center justify-center rounded-md border border-slate-200/90 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">Ctrl</kbd>
                      <span className="text-[10px] text-slate-400">+</span>
                      <kbd className="inline-flex items-center justify-center min-w-[18px] rounded-md border border-slate-200/90 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">D</kbd>
                    </span>
                  </li>
                  <li className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] font-semibold text-slate-600">Deshacer</span>
                    <span className="inline-flex items-center gap-1">
                      <kbd className="inline-flex items-center justify-center rounded-md border border-slate-200/90 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">Ctrl</kbd>
                      <span className="text-[10px] text-slate-400">+</span>
                      <kbd className="inline-flex items-center justify-center min-w-[18px] rounded-md border border-slate-200/90 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">Z</kbd>
                    </span>
                  </li>
                  <li className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] font-semibold text-slate-600">Guardar</span>
                    <span className="inline-flex items-center gap-1">
                      <kbd className="inline-flex items-center justify-center rounded-md border border-slate-200/90 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">Ctrl</kbd>
                      <span className="text-[10px] text-slate-400">+</span>
                      <kbd className="inline-flex items-center justify-center min-w-[18px] rounded-md border border-slate-200/90 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">S</kbd>
                    </span>
                  </li>
                  <li className="flex items-center justify-between py-0.5">
                    <span className="text-[11px] font-semibold text-slate-600">Eliminar</span>
                    <kbd className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-600 shadow-2xs">Supr</kbd>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** `mesas.3.codigo` → el objeto que estaba en el índice 3 del cuerpo enviado. */
function mapErrors(details: Record<string, string[]>, tableKeys: string[], elementKeys: string[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(details)) {
    const match = /^(mesas|elementos)\.(\d+)\./.exec(field);
    const key = match ? (match[1] === "mesas" ? tableKeys : elementKeys)[Number(match[2])] : undefined;
    if (key && !errors[key]) errors[key] = messages[0];
  }
  return errors;
}

function useKeyboard(state: EditorState, dispatch: (action: Parameters<typeof reducer>[1]) => void, enabled: boolean, save: () => void) {
  useEffect(() => {
    if (!enabled) return;

    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [role=dialog]")) return;
      const ctrl = event.ctrlKey || event.metaKey;

      if (ctrl && event.key.toLowerCase() === "z") {
        event.preventDefault();
        dispatch({ type: "undo" });
      } else if (ctrl && event.key.toLowerCase() === "s") {
        event.preventDefault();
        save();
      } else if (state.selected) {
        const item = state.items.find((candidate) => candidate.key === state.selected);
        if (!item) return;
        const step = event.shiftKey ? 1 : 10;
        const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };

        if (moves[event.key]) {
          event.preventDefault();
          const [dx, dy] = moves[event.key];
          dispatch({
            type: "update",
            key: item.key,
            record: true,
            patch: {
              pos_x: Math.min(Math.max(item.pos_x + dx, 0), state.width),
              pos_y: Math.min(Math.max(item.pos_y + dy, 0), state.height),
            },
          });
        } else if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault();
          dispatch({ type: "remove", key: item.key });
        } else if (ctrl && event.key.toLowerCase() === "d") {
          event.preventDefault();
          dispatch({ type: "duplicate", key: item.key });
        } else if (!ctrl && event.key.toLowerCase() === "r") {
          event.preventDefault();
          const oldW = item.ancho;
          const oldH = item.alto;
          const newW = oldH;
          const newH = oldW;
          const cx = item.pos_x + oldW / 2;
          const cy = item.pos_y + oldH / 2;
          const newX = Math.max(0, Math.min(state.width - newW, snap(cx - newW / 2)));
          const newY = Math.max(0, Math.min(state.height - newH, snap(cy - newH / 2)));
          dispatch({
            type: "update",
            key: item.key,
            record: true,
            patch: { ancho: newW, alto: newH, pos_x: newX, pos_y: newY },
          });
        } else if (event.key === "Escape") {
          dispatch({ type: "select", key: null });
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state, dispatch, enabled, save]);
}

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", notify);
      return () => media.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
