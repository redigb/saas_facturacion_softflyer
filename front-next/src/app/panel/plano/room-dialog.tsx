"use client";

import { useState } from "react";

import { errorMessage } from "@/app/panel/carta/queries";
import { Drawer, Field } from "@/app/panel/carta/ui";
import { useDeleteRoom, useReorderRooms, useSaveRoom } from "@/app/panel/plano/queries";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { Button, Input, Switch } from "@/components/ui";
import { ApiRequestError } from "@/lib/browser-api";
import type { Room } from "@/lib/schemas/plano";

type Props = {
  open: boolean;
  room?: Room;
  rooms: Room[];
  onClose: () => void;
  onCreated: (room: Room) => void;
};

/** Crear un salón, o renombrarlo, moverlo, ocultarlo y eliminarlo. */
export function RoomDialog({ open, room, rooms, onClose, onCreated }: Props) {
  const toast = useToast();
  const save = useSaveRoom();
  const remove = useDeleteRoom();
  const reorder = useReorderRooms();
  const isNew = room === undefined;

  const [name, setName] = useState(room?.nombre ?? "");
  const [active, setActive] = useState(room?.es_activo ?? true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Ponle un nombre al salón.");
      return;
    }
    try {
      const { data } = await save.mutateAsync({ id: room?.id, body: isNew ? { nombre: name.trim() } : { nombre: name.trim(), es_activo: active } });
      toast({ tone: "ok", message: isNew ? `Salón ${data.nombre} creado.` : "Cambios guardados." });
      if (isNew) onCreated(data);
      onClose();
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.detalles?.nombre) {
        setError(caught.detalles.nombre[0]);
      } else {
        toast({ tone: "error", message: errorMessage(caught) });
      }
    }
  }

  function move(delta: number) {
    if (!room) return;
    const ids = rooms.map((candidate) => candidate.id);
    const from = ids.indexOf(room.id);
    const to = from + delta;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    reorder.mutate(ids, { onError: (caught) => toast({ tone: "error", message: errorMessage(caught) }) });
  }

  async function onDelete() {
    if (!room) return;
    try {
      await remove.mutateAsync(room.id);
      toast({ tone: "ok", message: `Salón ${room.nombre} eliminado.` });
      onClose();
    } catch (caught) {
      setConfirmDelete(false);
      toast({ tone: "error", message: errorMessage(caught) });
    }
  }

  const position = room ? rooms.findIndex((candidate) => candidate.id === room.id) : -1;

  return (
    <Drawer
      title={isNew ? "Nuevo salón" : "Configurar salón"}
      open={open}
      onClose={onClose}
      footer={
        <>
          <Button type="submit" form="salon-form" isLoading={save.isPending}>
            {save.isPending ? "Guardando…" : isNew ? "Crear salón" : "Guardar"}
          </Button>
          {!isNew && (
            <div className="ml-auto">
              {confirmDelete ? (
                <span className="flex items-center gap-1">
                  <Button variant="danger" onClick={() => void onDelete()} isLoading={remove.isPending}>
                    Sí, eliminar
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                    No
                  </Button>
                </span>
              ) : (
                <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="text-red-600 hover:text-red-700">
                  <Icon name="basura" className="h-4 w-4" />
                  Eliminar
                </Button>
              )}
            </div>
          )}
        </>
      }
    >
      <form id="salon-form" noValidate onSubmit={submit} className="space-y-5">
        <Field label="Nombre" error={error ?? undefined} hint={isNew ? "Ej. Salón principal, Terraza, 2.º piso" : undefined}>
          {(id, describedBy) => (
            <Input
              id={id}
              value={name}
              maxLength={60}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              autoComplete="off"
              hasError={!!error}
              aria-describedby={describedBy}
            />
          )}
        </Field>

        {!isNew && (
          <>
            <div className="flex min-h-[44px] items-center justify-between gap-4 rounded-xl bg-niebla px-4 py-3">
              <span>
                <span className="block text-sm font-bold text-tinta">Salón en uso</span>
                <span className="block text-xs text-slate-500">Desactívalo si está cerrado por temporada.</span>
              </span>
              <Switch checked={active} onCheckedChange={setActive} aria-label="Salón en uso" />
            </div>

            {rooms.length > 1 && (
              <div>
                <span className="mb-1.5 block text-sm font-bold text-tinta">Orden de las pestañas</span>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => move(-1)} disabled={position <= 0} className="flex-1">
                    ← Antes
                  </Button>
                  <Button variant="secondary" onClick={() => move(1)} disabled={position >= rooms.length - 1} className="flex-1">
                    Después →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </form>
    </Drawer>
  );
}
