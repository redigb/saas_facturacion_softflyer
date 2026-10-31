"use client";

import { useState } from "react";

import { useCashHistory, useCashMovement, useCloseCash, usePaymentMethods } from "@/app/panel/caja/queries";
import { Drawer } from "@/app/panel/carta/ui";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { Badge, Button, Input, PriceText } from "@/components/ui";
import type { CashSession } from "@/lib/schemas/caja";
import { fromCents, toCents } from "@/lib/schemas/caja";

type Panel = "historial" | "gasto" | "ingreso" | "retiro" | "cierre" | null;
type MovementMode = Exclude<Panel, "historial" | "cierre" | null>;

const EXPENSE_CATEGORIES = ["ABARROTES", "INSUMOS", "SERVICIOS", "SALARIOS", "MANTENIMIENTO", "OTROS"] as const;

/** Métodos con los que se puede pagar un gasto sin tocar el efectivo de la caja (spec 038). */
const EXPENSE_METHOD_CODES = ["EFECTIVO", "YAPE", "PLIN", "TARJETA_DEBITO", "TARJETA_CREDITO", "TRANSFERENCIA"];

/** Acciones del turno separadas por intención para evitar confundir gasto, retiro e ingreso. */
export function TurnActions({
  session,
  expectedCash,
  onClosed,
}: {
  session: CashSession;
  expectedCash: string | null;
  onClosed: (session: CashSession) => void;
}) {
  const [panel, setPanel] = useState<Panel>(null);

  return (
    <>
      <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
        <Button variant="secondary" className="shrink-0" onClick={() => setPanel("historial")}>
          <Icon name="calendario" className="h-4.5 w-4.5" /> Historial
        </Button>
        <Button variant="secondary" className="shrink-0 border-amber-200 text-amber-800 hover:bg-amber-50" onClick={() => setPanel("gasto")}>Gasto</Button>
        <Button className="shrink-0" onClick={() => setPanel("ingreso")}>
          <Icon name="mas" className="h-4.5 w-4.5" /> Ingresar dinero
        </Button>
        <Button variant="secondary" className="shrink-0" onClick={() => setPanel("retiro")}>Retiro</Button>
        <Button variant="danger" className="shrink-0" onClick={() => setPanel("cierre")}>Cerrar caja</Button>
      </div>

      {panel === "historial" ? <HistoryDrawer onClose={() => setPanel(null)} /> : null}
      {panel === "gasto" || panel === "ingreso" || panel === "retiro" ? <MovementDrawer mode={panel} sessionId={session.id} onClose={() => setPanel(null)} /> : null}
      {panel === "cierre" ? (
        <CloseDrawer
          sessionId={session.id}
          expectedCash={expectedCash}
          onClose={() => setPanel(null)}
          onClosed={(closed) => {
            setPanel(null);
            onClosed(closed);
          }}
        />
      ) : null}
    </>
  );
}

function MovementDrawer({ mode, sessionId, onClose }: { mode: MovementMode; sessionId: number; onClose: () => void }) {
  const movement = useCashMovement(sessionId);
  const methods = usePaymentMethods();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState<string>(mode === "gasto" ? "OTROS" : mode === "retiro" ? "RETIRO" : "INGRESO");
  const [methodId, setMethodId] = useState<number | "">("");
  const valid = Number(amount) > 0 && concept.trim() !== "";
  const isIncome = mode === "ingreso";
  const title = mode === "gasto" ? "Registrar gasto" : mode === "retiro" ? "Retirar efectivo" : "Ingresar dinero";
  const methodOptions = (methods.data ?? []).filter((method) => EXPENSE_METHOD_CODES.includes(method.codigo));
  const effectiveMethodId = methodId !== "" ? methodId : (methodOptions.find((method) => method.es_efectivo)?.id ?? "");

  async function submit() {
    if (!valid || movement.isPending) return;
    try {
      await movement.mutateAsync({
        tipo: isIncome ? "INGRESO" : "EGRESO",
        monto: Number(amount).toFixed(2),
        concepto: concept.trim(),
        categoria: category,
        ...(mode === "gasto" && effectiveMethodId !== "" ? { metodo_pago_id: Number(effectiveMethodId) } : {}),
      });
      toast({ tone: "ok", message: mode === "gasto" ? "Gasto registrado." : mode === "retiro" ? "Retiro registrado." : "Ingreso registrado." });
      onClose();
    } catch (error) {
      toast({ tone: "error", message: error instanceof Error ? error.message : "No se pudo registrar el movimiento." });
    }
  }

  return (
    <Drawer title={title} open onClose={onClose} footer={<><Button onClick={() => void submit()} disabled={!valid} isLoading={movement.isPending}>Registrar</Button><Button variant="secondary" onClick={onClose}>Cancelar</Button></>}>
      <div className="space-y-5">
        <div className={`rounded-2xl border p-4 text-sm ${isIncome ? "border-emerald-200 bg-emerald-50 text-emerald-800" : mode === "gasto" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
          {mode === "gasto" ? "Registra una compra o gasto operativo del restaurante." : mode === "retiro" ? "Registra el efectivo que sale de la caja y deja el motivo auditado." : "Registra dinero adicional que entra físicamente a la caja."}
        </div>
        {mode === "gasto" ? (
          <>
            <div>
              <label htmlFor="mov-categoria" className="mb-1.5 block text-sm font-bold text-tinta">Categoría</label>
              <select id="mov-categoria" value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-tinta focus:border-azul focus:ring-4 focus:ring-azul/10 focus:outline-none">
                {EXPENSE_CATEGORIES.map((option) => <option key={option} value={option}>{labelCategory(option)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="mov-metodo" className="mb-1.5 block text-sm font-bold text-tinta">Método de pago</label>
              <select id="mov-metodo" value={effectiveMethodId} onChange={(event) => setMethodId(event.target.value === "" ? "" : Number(event.target.value))} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-tinta focus:border-azul focus:ring-4 focus:ring-azul/10 focus:outline-none">
                {methodOptions.length === 0 ? <option value="">Efectivo</option> : methodOptions.map((option) => <option key={option.id} value={option.id}>{option.nombre}</option>)}
              </select>
              <p className="mt-1 text-xs text-slate-500">Yape, Plin, tarjetas y transferencias no descuentan del efectivo del arqueo.</p>
            </div>
          </>
        ) : null}
        <div><label htmlFor="mov-monto" className="mb-1.5 block text-sm font-bold text-tinta">Monto (S/)</label><Input id="mov-monto" inputMode="decimal" autoFocus placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value.replace(",", "."))} className="text-xl font-bold tabular-nums" /></div>
        <div><label htmlFor="mov-concepto" className="mb-1.5 block text-sm font-bold text-tinta">Descripción</label><Input id="mov-concepto" maxLength={120} placeholder={mode === "gasto" ? "Ej. Compra semanal de abarrotes" : mode === "retiro" ? "Ej. Depósito al banco" : "Ej. Fondo adicional para sencillo"} value={concept} onChange={(event) => setConcept(event.target.value)} /></div>
      </div>
    </Drawer>
  );
}

function HistoryDrawer({ onClose }: { onClose: () => void }) {
  const history = useCashHistory(true);
  return (
    <Drawer title="Historial de caja" open onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}>
      {history.isPending ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}</div> : history.isError ? <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700"><p className="font-bold">No pudimos cargar el historial.</p><p className="mt-1">{history.error.message}</p><Button variant="secondary" className="mt-3" onClick={() => void history.refetch()}>Reintentar</Button></div> : (history.data ?? []).length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Todavía no hay turnos registrados.</p> : (
        <ul className="space-y-3">{(history.data ?? []).map((item) => <li key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-tinta">{item.caja.nombre}</p><p className="mt-0.5 text-xs text-slate-500">{formatDate(item.abierta_en)} · {item.abierta_por.nombre ?? "Sin responsable"}</p></div><Badge variant={item.estado === "ABIERTA" ? "success" : "neutral"}>{item.estado === "ABIERTA" ? "Abierta" : "Cerrada"}</Badge></div><div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-3"><div><p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Ventas</p><PriceText amount={item.resumen.ventas.total} size="sm" /></div><p className="text-xs text-slate-400 tabular-nums">{item.resumen.ventas.cantidad} órdenes</p></div></li>)}</ul>
      )}
    </Drawer>
  );
}

function CloseDrawer({ sessionId, expectedCash, onClose, onClosed }: { sessionId: number; expectedCash: string | null; onClose: () => void; onClosed: (session: CashSession) => void }) {
  const close = useCloseCash(sessionId);
  const toast = useToast();
  const [counted, setCounted] = useState("");
  const valid = counted.trim() !== "" && Number(counted) >= 0 && !Number.isNaN(Number(counted));
  const difference = valid && expectedCash !== null ? toCents(counted) - toCents(expectedCash) : null;

  async function submit() {
    if (!valid || close.isPending) return;
    try {
      const { data } = await close.mutateAsync(Number(counted).toFixed(2));
      onClosed(data);
    } catch (error) {
      toast({ tone: "error", message: error instanceof Error ? error.message : "No se pudo cerrar la caja." });
    }
  }

  return (
    <Drawer title="Cerrar caja" open onClose={onClose} footer={<><Button variant="danger" onClick={() => void submit()} disabled={!valid} isLoading={close.isPending}>Cerrar caja</Button><Button variant="secondary" onClick={onClose}>Seguir cobrando</Button></>}>
      <div className="space-y-5"><p className="text-sm text-slate-600">Cuenta el efectivo físico e ingrésalo. El sistema guardará la diferencia para el arqueo.</p><div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><p className="text-xs font-semibold text-slate-500">Efectivo esperado</p><PriceText amount={expectedCash} size="xl" /></div><div><label htmlFor="contado" className="mb-1.5 block text-sm font-bold text-tinta">Efectivo contado (S/)</label><Input id="contado" inputMode="decimal" autoFocus placeholder="0.00" value={counted} onChange={(event) => setCounted(event.target.value.replace(",", "."))} className="text-2xl font-bold tabular-nums" /></div>{difference !== null ? <p role="status" className={`rounded-xl px-4 py-3 text-sm font-bold ${difference === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{difference === 0 ? "La caja cuadra." : difference > 0 ? `Sobran S/ ${fromCents(difference)}.` : `Faltan S/ ${fromCents(-difference)}.`}</p> : null}</div>
    </Drawer>
  );
}

function labelCategory(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
