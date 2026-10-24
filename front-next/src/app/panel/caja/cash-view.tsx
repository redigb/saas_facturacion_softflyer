"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { ChargeDrawer } from "@/app/panel/caja/charge-drawer";
import { CashDashboard } from "@/app/panel/caja/cash-dashboard";
import { ReceiptTicket } from "@/app/panel/caja/receipt-ticket";
import { useBillableOrders, useCashSession, useCashSummary, useOpenCash, useReceipts, cashKeys } from "@/app/panel/caja/queries";
import { TurnActions } from "@/app/panel/caja/turn-actions";
import { Skeleton } from "@/app/panel/carta/ui";
import { minutesSince, useNow } from "@/app/panel/pedidos/use-now";
import { useToast } from "@/app/panel/providers";
import { useRealtime, useRealtimeEvent } from "@/app/panel/realtime";
import { Icon } from "@/components/icons";
import { Badge, Button, EmptyState, Input, PriceText } from "@/components/ui";
import type { CashSession, Receipt } from "@/lib/schemas/caja";
import type { OrderSummary } from "@/lib/schemas/pedidos";

/**
 * Pantalla del cajero (spec 009): abre su turno, cobra las cuentas que piden los mozos
 * y cierra con arqueo. Pensada para dejarse abierta todo el servicio.
 */
export function CashView() {
  const session = useCashSession();
  const [closed, setClosed] = useState<CashSession | null>(null);

  if (session.isPending) {
    return <Skeleton className="h-[60vh]" />;
  }
  if (session.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-bold">No pudimos cargar tu caja.</p>
        <p className="mt-1 text-sm">{session.error.message}</p>
        <Button variant="secondary" className="mt-4" onClick={() => void session.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (session.data === null) {
    return <OpenTurn closed={closed} onDismiss={() => setClosed(null)} />;
  }

  return <Turn session={session.data} onClosed={setClosed} />;
}

function OpenTurn({ closed, onDismiss }: { closed: CashSession | null; onDismiss: () => void }) {
  const open = useOpenCash();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const invalid = amount.trim() === "" || Number.isNaN(Number(amount)) || Number(amount) < 0;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (invalid || open.isPending) return;

    try {
      await open.mutateAsync(Number(amount).toFixed(2));
      onDismiss();
    } catch (error) {
      toast({ tone: "error", message: error instanceof Error ? error.message : "No se pudo abrir la caja." });
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      {closed ? <ClosedSummary session={closed} onDismiss={onDismiss} /> : null}

      <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-azul/10 text-azul">
          <Icon name="caja" className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-tinta">Abre tu caja</h1>
        <p className="mt-1 text-sm text-slate-500">Indica con cuánto efectivo empiezas el turno. Sin caja abierta no se puede cobrar.</p>

        <label htmlFor="apertura" className="mt-6 block text-sm font-bold text-tinta">
          Monto inicial (S/)
        </label>
        <Input
          id="apertura"
          inputMode="decimal"
          autoFocus
          placeholder="0.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value.replace(",", "."))}
          className="mt-1.5 text-2xl font-bold tabular-nums"
        />

        <Button type="submit" size="lg" className="mt-6 w-full" disabled={invalid} isLoading={open.isPending}>
          Abrir caja
        </Button>
      </form>
    </div>
  );
}

function ClosedSummary({ session, onDismiss }: { session: CashSession; onDismiss: () => void }) {
  const difference = Number(session.diferencia ?? 0);
  const tone = difference === 0 ? "success" : "warning";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="success">Caja cerrada</Badge>
          <h2 className="mt-2 text-xl font-bold text-tinta">Arqueo del turno</h2>
        </div>
        <button type="button" onClick={onDismiss} aria-label="Cerrar resumen" className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100">
          <Icon name="cerrar" className="h-5 w-5" />
        </button>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <Row label="Efectivo esperado" value={session.monto_cierre_calculado} />
        <Row label="Efectivo contado" value={session.monto_cierre_declarado} />
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <dt className="font-bold text-tinta">Diferencia</dt>
          <dd>
            <Badge variant={tone}>
              {difference === 0 ? "Cuadra" : difference > 0 ? `Sobra S/ ${difference.toFixed(2)}` : `Falta S/ ${Math.abs(difference).toFixed(2)}`}
            </Badge>
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd>
        <PriceText amount={value} />
      </dd>
    </div>
  );
}

function Turn({ session, onClosed }: { session: CashSession; onClosed: (session: CashSession) => void }) {
  const { status, branches, watch } = useRealtime();
  const queryClient = useQueryClient();
  const live = status === "en-vivo";
  const summary = useCashSummary(session.id);
  const billable = useBillableOrders(true, live);
  const now = useNow(30_000);
  const [selected, setSelected] = useState<number | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const receipts = useReceipts(session.id);

  // Cobros y movimientos de otras personas de la misma sucursal.
  useEffect(() => {
    const branch = branches.find((item) => item.id === session.sucursal_id)?.id ?? branches[0]?.id;
    if (!branch) return;

    return watch(`sucursal.${branch}.caja`, ["CajaActualizada"], () => {
      void queryClient.invalidateQueries({ queryKey: cashKeys.summary(session.id) });
    });
  }, [branches, session.id, session.sucursal_id, watch, queryClient]);

  // Un mozo pidió la cuenta, o alguien cobró o reabrió un pedido.
  useRealtimeEvent("PedidoActualizado", () => {
    void queryClient.invalidateQueries({ queryKey: cashKeys.billable });
  });

  const orders = billable.data ?? [];
  const totals = summary.data?.resumen;

  return (
    <div className="space-y-6 pb-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-tinta">Caja</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Turno iniciado {new Date(session.abierta_en).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">Duración: {formatDuration(minutesSince(session.abierta_en, now))}</span>
            <span aria-hidden="true">·</span>
            <span>{session.caja.nombre}</span>
          </p>
        </div>
        <TurnActions session={session} onClosed={onClosed} expectedCash={totals?.efectivo_esperado ?? null} />
      </header>

      {summary.isError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p className="font-bold">No pudimos actualizar el resumen del turno.</p><p className="mt-1">{summary.error.message}</p><Button variant="secondary" className="mt-3" onClick={() => void summary.refetch()}>Reintentar</Button></div> : null}
      <CashDashboard session={session} data={summary.data} loading={summary.isPending} />

      <section aria-label="Cuentas por cobrar">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase">Por cobrar</h2>
          <span className="text-xs font-semibold text-slate-400">{live ? "Actualizado en vivo" : "Se actualiza cada 15 s"}</span>
        </div>

        {billable.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState icon="caja" title="No hay cuentas por cobrar" description="Cuando un mozo pida la cuenta de una mesa, aparecerá aquí al instante." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <li key={order.id}>
                <BillCard order={order} now={now} onOpen={() => setSelected(order.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Comprobantes del turno">
        <h2 className="mb-3 text-xs font-bold tracking-widest text-slate-400 uppercase">Comprobantes del turno</h2>
        {receipts.isPending ? (
          <Skeleton className="h-16" />
        ) : (receipts.data ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
            Aún no hay comprobantes en este turno.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {(receipts.data ?? []).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setReceipt(item)}
                  className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-slate-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-tinta">
                      {item.numero} <span className="font-medium text-slate-400">· {item.tipo === "FACTURA" ? "Factura" : "Boleta"}</span>
                    </span>
                    <span className="block truncate text-xs text-slate-500">{item.cliente.nombre}</span>
                  </span>
                  <PriceText amount={item.total} size="sm" />
                  <Icon name="abajo" className="h-4 w-4 -rotate-90 text-slate-300" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {receipt ? <ReceiptTicket receipt={receipt} onClose={() => setReceipt(null)} /> : null}
      {selected !== null ? <ChargeDrawer key={selected} orderId={selected} sessionId={session.id} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function BillCard({ order, now, onOpen }: { order: OrderSummary; now: number; onOpen: () => void }) {
  const waiting = minutesSince(order.abierto_en, now);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs transition-all hover:border-azul/40 hover:shadow active:scale-[0.99] focus-visible:ring-4 focus-visible:ring-celeste/40 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-tinta">{order.mesa ? `Mesa ${order.mesa.codigo}` : "Para llevar"}</p>
          <p className="truncate text-xs text-slate-500">
            #{order.numero} · {order.mozo?.nombre ?? "Sin mozo"}
          </p>
        </div>
        <Badge variant="warning">Pide la cuenta</Badge>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <span className="text-xs text-slate-500">
          {order.platos} {order.platos === 1 ? "plato" : "platos"} · abierto hace {waiting} min
        </span>
        <PriceText amount={order.total} size="lg" />
      </div>
    </button>
  );
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}h ${rest}m` : `${rest}m`;
}
