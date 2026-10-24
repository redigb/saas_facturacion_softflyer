"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ChargeDrawer } from "@/app/panel/caja/charge-drawer";
import { useCashSession } from "@/app/panel/caja/queries";
import { Drawer, Skeleton } from "@/app/panel/carta/ui";
import { useActiveOrders, useOrder, useOrderAction, useOrdersOverview } from "@/app/panel/pedidos/queries";
import { minutesSince, useNow } from "@/app/panel/pedidos/use-now";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { Button, EmptyState } from "@/components/ui";
import type { OrderSummary } from "@/lib/schemas/pedidos";

const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export function MisOrdersView({ userId, isAdmin, canCharge }: { userId: number | null; isAdmin: boolean; canCharge: boolean }) {
  if (isAdmin) return <AdminOrdersView canCharge={canCharge} />;
  return <WaiterOrdersView userId={userId} />;
}

function WaiterOrdersView({ userId }: { userId: number | null }) {
  const router = useRouter();
  const now = useNow();
  const orders = useActiveOrders();
  const mine = (orders.data ?? []).filter((order) => order.mozo?.id === userId);

  if (orders.isPending) return <OrdersSkeleton compact />;
  if (orders.isError) return <LoadError message={orders.error.message} onRetry={() => void orders.refetch()} mine />;

  return (
    <div className="space-y-6 pb-12">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-tinta sm:text-3xl">Mis órdenes</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">Tus pedidos activos, en orden. Toca uno para seguir atendiéndolo.</p>
      </header>
      {mine.length === 0 ? (
        <EmptyState icon="pedidos" title="No tienes órdenes activas" description="Cuando abras una mesa o un pedido para llevar, aparecerá aquí para que lo retomes rápido." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((order) => (
            <li key={order.id}>
              <button type="button" onClick={() => router.push(`/panel/pedidos/${order.id}`)} className="group flex h-28 w-full flex-col justify-between rounded-2xl border-2 border-slate-200/90 bg-white p-4 text-left transition-all hover:border-azul/80 hover:shadow-xs active:scale-[0.98]">
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="min-w-0 truncate text-lg font-black tracking-tight text-tinta group-hover:text-azul">{order.mesa ? `Mesa ${order.mesa.codigo}` : "Para llevar"} <span className="text-slate-400">#{order.numero}</span></span>
                  <StatusPill order={order} />
                </div>
                <div className="flex w-full items-end justify-between"><span className="text-xs font-medium text-slate-400 tabular-nums">{minutesSince(order.abierto_en, now)} min · {order.platos} {order.platos === 1 ? "plato" : "platos"}</span><span className="text-lg font-black text-tinta tabular-nums">S/ {order.total}</span></div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AdminOrdersView({ canCharge }: { canCharge: boolean }) {
  const orders = useOrdersOverview(TODAY);
  const cash = useCashSession();
  const [state, setState] = useState("TODOS");
  const [type, setType] = useState("TODOS");
  const [waiter, setWaiter] = useState("TODOS");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [chargeId, setChargeId] = useState<number | null>(null);
  const list = useMemo(() => orders.data ?? [], [orders.data]);
  const people = useMemo(() => [...new Map(list.filter((order) => order.mozo).map((order) => [order.mozo!.id, order.mozo!])).values()].sort((a, b) => a.nombre.localeCompare(b.nombre)), [list]);
  const filtered = list.filter((order) => (state === "TODOS" || order.estado === state) && (type === "TODOS" || order.tipo === type) && (waiter === "TODOS" || String(order.mozo?.id ?? "SIN_ASIGNAR") === waiter)).sort((a, b) => b.abierto_en.localeCompare(a.abierto_en));
  const paid = list.filter((order) => order.estado === "CERRADO");
  const totalSales = paid.reduce((sum, order) => sum + Number(order.total), 0);

  if (orders.isPending) return <OrdersSkeleton />;
  if (orders.isError) return <LoadError message={orders.error.message} onRetry={() => void orders.refetch()} />;

  return (
    <div className="space-y-6 pb-12">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-black tracking-tight text-tinta sm:text-3xl">Órdenes</h1><p className="mt-1 text-sm font-medium text-slate-500">Supervisa y cobra las órdenes de hoy en un solo lugar.</p></div>
        <span className="rounded-full bg-celeste/10 px-3 py-1.5 text-xs font-extrabold text-azul">{formatDay(TODAY)}</span>
      </header>

      <section aria-label="Resumen de órdenes" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Total órdenes" value={String(list.length)} tone="slate" />
        <Metric label="Pagadas" value={String(paid.length)} note={list.length ? `${Math.round((paid.length / list.length) * 100)}% del total` : "Sin ventas aún"} tone="emerald" />
        <Metric label="Pago pendiente" value={String(list.filter((order) => order.estado === "POR_COBRAR").length)} tone="amber" />
        <Metric label="Total ventas" value={money(totalSales)} note={paid.length ? `Prom: ${money(totalSales / paid.length)}` : "Prom: S/ 0.00"} tone="blue" />
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:p-5" aria-label="Filtros de órdenes">
        <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-tinta"><Icon name="buscar" className="h-4.5 w-4.5 text-azul" />Filtros</div>
        <div className="grid gap-3 md:grid-cols-3">
          <Filter label="Estado" value={state} onChange={setState} options={[["TODOS", "Todos los estados"], ["ABIERTO", "En preparación"], ["POR_COBRAR", "Por cobrar"], ["CERRADO", "Pagadas"]]} />
          <Filter label="Tipo" value={type} onChange={setType} options={[["TODOS", "Todos los tipos"], ["SALON", "Mesa"], ["PARA_LLEVAR", "Para llevar"]]} />
          <Filter label="Persona asignada" value={waiter} onChange={setWaiter} options={[["TODOS", "Todas las personas"], ["SIN_ASIGNAR", "Sin asignar"], ...people.map((person) => [String(person.id), person.nombre] as [string, string])]} />
        </div>
      </section>

      {filtered.length === 0 ? (
        <EmptyState icon="lista" title={list.length ? "No hay coincidencias" : "Todavía no hay órdenes hoy"} description={list.length ? "Cambia o limpia los filtros para volver a ver las órdenes." : "Las órdenes aparecerán aquí apenas el equipo empiece a atender."} actionLabel={list.length ? "Limpiar filtros" : undefined} onAction={list.length ? () => { setState("TODOS"); setType("TODOS"); setWaiter("TODOS"); } : undefined} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((order) => <OrderCard key={order.id} order={order} onOpen={() => setSelectedId(order.id)} />)}</ul>
      )}

      {selectedId !== null ? <OrderDetailDrawer orderId={selectedId} cashSessionId={cash.data?.id ?? null} canCharge={canCharge} onClose={() => setSelectedId(null)} onCharge={(id) => { setSelectedId(null); setChargeId(id); }} /> : null}
      {chargeId !== null && cash.data ? <ChargeDrawer presentation="modal" orderId={chargeId} sessionId={cash.data.id} onClose={() => { setChargeId(null); void orders.refetch(); }} /> : null}
    </div>
  );
}

function OrderCard({ order, onOpen }: { order: OrderSummary; onOpen: () => void }) {
  return (
    <li>
      <button type="button" onClick={onOpen} className="group flex min-h-64 w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-2xs transition-all hover:-translate-y-0.5 hover:border-celeste hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-celeste/25 active:translate-y-0">
        <div className="w-full border-b border-slate-100 p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="text-lg font-black text-tinta">#{String(order.numero).padStart(4, "0")}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-extrabold text-slate-600">{order.tipo === "SALON" ? "Mesa" : "Para llevar"}</span></div><StatusPill order={order} /></div><div className="mt-2 flex items-end justify-between gap-3"><span className="text-xl font-black text-azul tabular-nums">S/ {order.total}</span><span className="text-xs font-semibold text-slate-400">{formatTime(order.cerrado_en ?? order.abierto_en)}</span></div><p className="mt-1 truncate text-sm font-bold text-slate-600">{order.mesa ? `Mesa ${order.mesa.codigo}` : "Pedido para llevar"}</p></div>
        <div className="w-full flex-1 p-4"><p className="mb-2 text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">Platos</p><ul className="space-y-1.5">{order.detalles_resumen.slice(0, 4).map((item) => <li key={item.id} className="flex gap-2 text-xs font-semibold text-slate-600"><span className="font-black text-tinta">{compactQty(item.cantidad)}×</span><span className="min-w-0 flex-1 truncate">{item.nombre ?? "Plato"}</span><span className="tabular-nums">S/ {item.subtotal}</span></li>)}</ul>{order.detalles_resumen.length > 4 ? <p className="mt-2 text-xs font-bold text-azul">+{order.detalles_resumen.length - 4} más</p> : null}</div>
        <div className="flex w-full items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-[11px] font-bold text-slate-500"><span>{order.platos} {order.platos === 1 ? "ítem" : "ítems"}</span><span className="truncate px-2">{order.mozo?.nombre ?? "Sin asignar"}</span><span>{formatDate(order.abierto_en)}</span></div>
      </button>
    </li>
  );
}

function OrderDetailDrawer({ orderId, cashSessionId, canCharge, onClose, onCharge }: { orderId: number; cashSessionId: number | null; canCharge: boolean; onClose: () => void; onCharge: (id: number) => void }) {
  const router = useRouter();
  const toast = useToast();
  const order = useOrder(orderId);
  const action = useOrderAction(orderId);
  async function requestAndCharge() { if (!order.data || !cashSessionId) return; try { await action.mutateAsync({ action: "cuenta" }); onCharge(orderId); } catch (error) { toast({ tone: "error", message: error instanceof Error ? error.message : "No se pudo solicitar la cuenta." }); } }
  const footer = order.data ? <div className="flex w-full flex-col gap-2">{order.data.estado === "POR_COBRAR" && canCharge && cashSessionId ? <Button size="lg" className="w-full" onClick={() => onCharge(orderId)}>Cobrar ahora · S/ {order.data.pendiente}</Button> : null}{order.data.estado === "ABIERTO" && canCharge && cashSessionId ? <Button size="lg" className="w-full" onClick={() => void requestAndCharge()} isLoading={action.isPending}>Solicitar cuenta y cobrar</Button> : null}{canCharge && !cashSessionId && order.data.estado !== "CERRADO" ? <div className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Abre tu turno en Caja para poder cobrar esta orden.</div> : null}<div className="grid grid-cols-2 gap-2"><Button variant="secondary" onClick={() => router.push(`/panel/pedidos/${orderId}`)}>Abrir pedido</Button><Button variant="secondary" onClick={onClose}>Cerrar</Button></div></div> : <Button variant="secondary" onClick={onClose}>Cerrar</Button>;

  return <Drawer title={`Orden #${order.data ? String(order.data.numero).padStart(4, "0") : orderId}`} open onClose={onClose} footer={footer}>{order.isPending ? <div className="space-y-3"><Skeleton className="h-24" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : null}{order.isError ? <LoadError message={order.error.message} onRetry={() => void order.refetch()} /> : null}{order.data ? <div className="space-y-5"><div className="rounded-2xl bg-linear-to-r from-azul to-celeste p-5 text-white"><div className="flex items-start justify-between gap-3"><div><p className="text-2xl font-black">#{String(order.data.numero).padStart(4, "0")}</p><p className="mt-1 text-sm font-semibold text-white/80">{order.data.mesa ? `Mesa ${order.data.mesa.codigo}` : "Para llevar"} · {order.data.mozo?.nombre ?? "Sin asignar"}</p></div><StatusPill order={{ estado: order.data.estado, pendientes: order.data.detalles.filter((item) => item.estado_cocina === "PENDIENTE" || item.estado_cocina === "EN_PREPARACION").length, platos: order.data.detalles.filter((item) => !item.anulado).length }} inverted /></div><div className="mt-5 flex items-end justify-between"><span className="text-xs font-extrabold tracking-widest text-white/70 uppercase">Total</span><span className="text-3xl font-black tabular-nums">S/ {order.data.total}</span></div></div><section><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-extrabold tracking-widest text-slate-400 uppercase">Ítems ({order.data.detalles.filter((item) => !item.anulado).length})</h3><span className="text-xs font-bold text-slate-400">{formatTime(order.data.abierto_en)}</span></div><ul className="space-y-2">{order.data.detalles.filter((item) => !item.anulado).map((item) => <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3.5"><div className="flex items-start gap-3"><span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-tinta">{compactQty(item.cantidad)}</span><div className="min-w-0 flex-1"><p className="text-sm font-extrabold text-tinta">{item.nombre ?? "Plato"}</p><p className="mt-1 text-xs font-bold text-slate-500">{kitchenLabel(item.estado_cocina)}{item.cobrado ? " · Cobrado" : ""}</p></div><span className="text-sm font-black text-tinta tabular-nums">S/ {item.subtotal}</span></div></li>)}</ul></section></div> : null}</Drawer>;
}

function Metric({ label, value, note, tone }: { label: string; value: string; note?: string; tone: "slate" | "emerald" | "amber" | "blue" }) { const colors = { slate: "bg-slate-400", emerald: "bg-emerald-500", amber: "bg-amber-500", blue: "bg-azul" }; return <div className="min-h-30 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-2xs sm:p-5"><p className="flex items-center gap-2 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase"><span className={`h-2 w-2 rounded-full ${colors[tone]}`} />{label}</p><p className="mt-3 text-2xl font-black text-tinta tabular-nums sm:text-3xl">{value}</p>{note ? <p className="mt-1 text-xs font-semibold text-slate-400">{note}</p> : null}</div>; }
function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) { return <label className="text-xs font-bold text-slate-500"><span className="mb-1.5 block">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base font-semibold text-tinta outline-none transition focus:border-azul focus:ring-4 focus:ring-azul/10">{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>; }
function StatusPill({ order, inverted = false }: { order: Pick<OrderSummary, "estado" | "pendientes" | "platos">; inverted?: boolean }) { let label = "Preparando"; let style = "bg-celeste/15 text-azul"; if (order.estado === "CERRADO") { label = "Pagada"; style = "bg-emerald-100 text-emerald-700"; } else if (order.estado === "POR_COBRAR") { label = "Por cobrar"; style = "bg-amber-100 text-amber-800"; } else if (order.platos > 0 && order.pendientes === 0) { label = "Lista"; style = "bg-emerald-100 text-emerald-700"; } else if (order.platos === 0) { label = "Nueva"; style = "bg-slate-100 text-slate-600"; } if (inverted) style = "bg-white/20 text-white"; return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${style}`}>{label}</span>; }
function OrdersSkeleton({ compact = false }: { compact?: boolean }) { return <div className="space-y-5" aria-busy="true"><div className="h-9 w-56 animate-pulse rounded-xl bg-slate-200" />{!compact ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-30" />)}</div> : null}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className={compact ? "h-28" : "h-64"} />)}</div></div>; }
function LoadError({ message, onRetry, mine = false }: { message: string; onRetry: () => void; mine?: boolean }) { return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"><p className="font-bold">No pudimos cargar {mine ? "tus órdenes" : "las órdenes"}.</p><p className="mt-1 text-sm">{message}</p><Button variant="secondary" onClick={onRetry} className="mt-4">Reintentar</Button></div>; }
function money(value: number) { return `S/ ${value.toFixed(2)}`; }
function compactQty(value: string) { return Number(value).toLocaleString("es-PE", { maximumFractionDigits: 3 }); }
function formatTime(value: string) { return new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function formatDate(value: string) { return new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)); }
function formatDay(value: string) { return new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00Z`)); }
function kitchenLabel(value: string) { return ({ PENDIENTE: "Pendiente", EN_PREPARACION: "En preparación", LISTO: "Listo", ENTREGADO: "Entregado" } as Record<string, string>)[value] ?? value; }
