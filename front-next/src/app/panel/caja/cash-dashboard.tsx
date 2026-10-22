"use client";

import { useMemo, useState } from "react";

import { Skeleton } from "@/app/panel/carta/ui";
import { Badge, PriceText } from "@/components/ui";
import type { CashSession, CashSummary } from "@/lib/schemas/caja";
import { toCents } from "@/lib/schemas/caja";

const PAYMENT_COLORS = ["stroke-emerald-500", "stroke-azul", "stroke-celeste", "stroke-amber-500", "stroke-slate-400"];
const PAYMENT_DOTS = ["bg-emerald-500", "bg-azul", "bg-celeste", "bg-amber-500", "bg-slate-400"];

export function CashDashboard({ session, data, loading }: { session: CashSession; data?: CashSummary; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const summary = data.resumen;
  const lastSale = summary.ultima_venta;

  return (
    <div className="space-y-5">
      <section aria-label="Indicadores del turno" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ventas totales" value={<PriceText amount={summary.ventas.total} size="xl" />} hint={`${summary.ventas.cantidad} ${summary.ventas.cantidad === 1 ? "orden" : "órdenes"}`} dot="bg-emerald-500" />
        <MetricCard label="Ticket promedio" value={<PriceText amount={summary.ticket_promedio} size="xl" />} hint={`Media por ${summary.ventas.cantidad === 1 ? "venta" : "ventas"}`} dot="bg-azul" />
        <MetricCard label="Efectivo esperado" value={<PriceText amount={summary.efectivo_esperado} size="xl" />} hint={`Inicial: S/ ${session.monto_apertura}`} dot="bg-amber-500" accent />
        <MetricCard
          label="Última venta"
          value={<span className="text-2xl font-bold tracking-tight text-tinta tabular-nums">{lastSale ? formatTime(lastSale.creado_en) : "—"}</span>}
          hint={lastSale ? `Monto: S/ ${lastSale.monto}` : "Aún no hay ventas"}
          dot="bg-celeste"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Ventas por hora" description="Distribución de ventas durante el turno">
          <SalesLineChart points={summary.ventas_por_hora} />
        </Panel>
        <Panel title="Métodos de pago" description="Distribución por tipo de pago">
          <PaymentDonut methods={summary.por_metodo} />
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="Detalle de pagos" description="Cobros recibidos durante el turno">
          <PaymentDetails methods={summary.por_metodo} total={summary.ventas.total} />
        </Panel>
        <Panel title="Flujo de efectivo" description="Cómo se compone el dinero esperado en caja">
          <CashFlow session={session} data={data} />
        </Panel>
      </section>

      <OrdersTable orders={summary.ordenes} />
      <ExpensesTable movements={data.movimientos} />
    </div>
  );
}

function MetricCard({ label, value, hint, dot, accent = false }: { label: string; value: React.ReactNode; hint: string; dot: string; accent?: boolean }) {
  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-2xs ${accent ? "border-amber-200" : "border-slate-200"}`}>
      <p className="flex items-center gap-2 text-xs font-semibold text-slate-500"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</p>
      <div className={`mt-2 ${accent ? "text-amber-700" : ""}`}>{value}</div>
      <p className="mt-1 text-xs text-slate-400 tabular-nums">{hint}</p>
    </article>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
      <header className="px-5 pt-5">
        <h2 className="text-base font-bold text-tinta">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
      </header>
      <div className="p-5">{children}</div>
    </article>
  );
}

function SalesLineChart({ points }: { points: CashSummary["resumen"]["ventas_por_hora"] }) {
  if (points.length === 0) return <ChartEmpty message="La curva aparecerá con la primera venta." />;

  const width = 620;
  const height = 230;
  const padX = 48;
  const padY = 25;
  const values = points.map((point) => Number(point.monto));
  const max = Math.max(...values, 1);
  const coordinates = values.map((value, index) => {
    const x = points.length === 1 ? width / 2 : padX + (index / (points.length - 1)) * (width - padX * 2);
    const y = height - padY - (value / max) * (height - padY * 2);
    return { x, y };
  });
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfica de ventas por hora" className="min-h-56 min-w-[540px] text-emerald-500">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = height - padY - ratio * (height - padY * 2);
          return <line key={ratio} x1={padX} x2={width - padX} y1={y} y2={y} className="stroke-slate-100" strokeDasharray="5 5" />;
        })}
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {coordinates.map((point, index) => <circle key={points[index].hora} cx={point.x} cy={point.y} r="5" fill="white" stroke="currentColor" strokeWidth="3" />)}
        {points.map((point, index) => <text key={point.hora} x={coordinates[index].x} y={height - 4} textAnchor="middle" className="fill-slate-400 text-[11px]">{point.hora}</text>)}
        <text x="4" y={padY + 3} className="fill-slate-400 text-[11px]">S/ {max.toFixed(0)}</text>
        <text x="15" y={height - padY + 3} className="fill-slate-400 text-[11px]">S/ 0</text>
      </svg>
    </div>
  );
}

function PaymentDonut({ methods }: { methods: CashSummary["resumen"]["por_metodo"] }) {
  const total = methods.reduce((sum, method) => sum + Number(method.monto), 0);
  if (total <= 0) return <ChartEmpty message="La distribución aparecerá al registrar un cobro." />;

  const radius = 66;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <div className="relative h-52 w-52 shrink-0">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" role="img" aria-label="Distribución de métodos de pago">
          <circle cx="90" cy="90" r={radius} fill="none" className="stroke-slate-100" strokeWidth="28" />
          {methods.map((method, index) => {
            const fraction = Number(method.monto) / total;
            const length = fraction * circumference;
            const offset = -methods.slice(0, index).reduce((sum, previous) => sum + (Number(previous.monto) / total) * circumference, 0);
            return <circle key={method.metodo_pago_id} cx="90" cy="90" r={radius} fill="none" className={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} strokeWidth="28" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={offset} />;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-slate-400">Total</span>
          <span className="text-lg font-bold text-tinta tabular-nums">S/ {total.toFixed(2)}</span>
        </div>
      </div>
      <ul className="min-w-44 space-y-2">
        {methods.map((method, index) => (
          <li key={method.metodo_pago_id} className="flex items-center justify-between gap-5 text-xs">
            <span className="flex items-center gap-2 text-slate-600"><span className={`h-2.5 w-2.5 rounded-full ${PAYMENT_DOTS[index % PAYMENT_DOTS.length]}`} />{method.nombre}</span>
            <span className="font-bold text-tinta tabular-nums">{((Number(method.monto) / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaymentDetails({ methods, total }: { methods: CashSummary["resumen"]["por_metodo"]; total: string }) {
  if (methods.length === 0) return <ChartEmpty message="Todavía no hay pagos en el turno." />;
  return (
    <div className="space-y-2">
      {methods.map((method, index) => (
        <div key={method.metodo_pago_id} className="flex min-h-12 items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
          <span className={`h-2.5 w-2.5 rounded-full ${PAYMENT_DOTS[index % PAYMENT_DOTS.length]}`} />
          <span className="min-w-0 flex-1 text-sm font-semibold text-slate-600">{method.nombre}<span className="ml-2 text-xs font-normal text-slate-400">{method.cantidad} pagos</span></span>
          <PriceText amount={method.monto} size="sm" />
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-bold text-tinta"><span>Total cobrado</span><PriceText amount={total} size="sm" /></div>
    </div>
  );
}

function CashFlow({ session, data }: { session: CashSession; data: CashSummary }) {
  const cashSales = data.resumen.por_metodo.filter((method) => method.codigo === "EFECTIVO").reduce((sum, method) => sum + toCents(method.monto), 0);
  const withdrawals = data.movimientos.filter((movement) => movement.tipo === "EGRESO" && movement.categoria === "RETIRO").reduce((sum, movement) => sum + toCents(movement.monto), 0);
  const expenses = toCents(data.resumen.egresos) - withdrawals;
  const rows = [
    ["Monto de apertura", toCents(session.monto_apertura), "text-tinta"],
    ["Ventas en efectivo", cashSales, "text-emerald-600"],
    ["Ingresos manuales", toCents(data.resumen.ingresos), "text-emerald-600"],
    ["Gastos", -expenses, "text-red-600"],
    ["Retiros", -withdrawals, "text-red-600"],
  ] as const;

  return (
    <div className="space-y-2">
      {rows.map(([label, cents, tone]) => (
        <div key={label} className="flex min-h-10 items-center justify-between text-sm"><span className="text-slate-500">{label}</span><span className={`font-bold tabular-nums ${tone}`}>{cents < 0 ? "−" : cents > 0 && label !== "Monto de apertura" ? "+" : ""} S/ {(Math.abs(cents) / 100).toFixed(2)}</span></div>
      ))}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-bold text-tinta"><span>Efectivo esperado</span><PriceText amount={data.resumen.efectivo_esperado} size="sm" /></div>
    </div>
  );
}

function OrdersTable({ orders }: { orders: CashSummary["resumen"]["ordenes"] }) {
  const [filter, setFilter] = useState<"TODAS" | "SALON" | "PARA_LLEVAR">("TODAS");
  const visible = useMemo(() => orders.filter((order) => filter === "TODAS" || order.tipo === filter), [orders, filter]);
  const count = (kind: typeof filter) => kind === "TODAS" ? orders.length : orders.filter((order) => order.tipo === kind).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
      <header className="p-5 pb-3">
        <h2 className="text-base font-bold text-tinta">Todas las órdenes</h2>
        <p className="mt-0.5 text-xs text-slate-400">Total: {orders.length} órdenes cobradas</p>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {(["TODAS", "SALON", "PARA_LLEVAR"] as const).map((kind) => (
            <button key={kind} type="button" onClick={() => setFilter(kind)} className={`min-h-10 shrink-0 rounded-xl px-3 text-xs font-bold transition-colors ${filter === kind ? "bg-azul text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {kind === "TODAS" ? "Todas" : kind === "SALON" ? "Mesa" : "Para llevar"} <span className="ml-1 tabular-nums">{count(kind)}</span>
            </button>
          ))}
        </div>
      </header>
      {visible.length === 0 ? <div className="px-5 pb-6"><ChartEmpty message="No hay órdenes en este filtro." /></div> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-xs">
            <thead className="border-y border-slate-100 bg-slate-50 text-[10px] font-bold tracking-wide text-slate-400 uppercase"><tr><th className="px-5 py-3">#</th><th className="px-3 py-3">Tipo</th><th className="px-3 py-3">Mesa / cliente</th><th className="px-3 py-3">Ítems</th><th className="px-3 py-3">Pago</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Cobrado por</th><th className="px-5 py-3">Hora</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((order) => (
                <tr key={order.venta_id} className="text-slate-600 hover:bg-slate-50/70">
                  <td className="px-5 py-3 font-bold text-tinta tabular-nums">#{order.numero ?? order.venta_id}</td>
                  <td className="px-3 py-3"><Badge variant={order.tipo === "SALON" ? "info" : "success"}>{order.tipo === "SALON" ? "Mesa" : "Para llevar"}</Badge></td>
                  <td className="px-3 py-3">{order.tipo === "SALON" ? order.mesa ?? "Mesa" : order.cliente ?? "Cliente"}</td>
                  <td className="px-3 py-3 tabular-nums">{order.items}</td>
                  <td className="px-3 py-3">{order.metodos_pago.join(" + ")}</td>
                  <td className="px-3 py-3 font-bold text-tinta"><PriceText amount={order.total} size="sm" /></td>
                  <td className="px-3 py-3">{order.cobrado_por ?? "—"}</td>
                  <td className="px-5 py-3 text-slate-400 tabular-nums">{formatTime(order.creado_en)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ExpensesTable({ movements }: { movements: CashSummary["movimientos"] }) {
  const expenses = movements.filter((movement) => movement.tipo === "EGRESO" && movement.categoria !== "RETIRO");
  const total = expenses.reduce((sum, movement) => sum + Number(movement.monto), 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
      <header className="p-5"><h2 className="text-base font-bold text-tinta">Gastos del turno</h2><p className="mt-0.5 text-xs text-slate-400">Total: {expenses.length} gastos · <span className="tabular-nums">S/ {total.toFixed(2)}</span></p></header>
      {expenses.length === 0 ? <div className="px-5 pb-6"><ChartEmpty message="No hay gastos registrados en este turno." /></div> : (
        <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="border-y border-slate-100 bg-slate-50 text-[10px] font-bold tracking-wide text-slate-400 uppercase"><tr><th className="px-5 py-3">Categoría</th><th className="px-3 py-3">Descripción</th><th className="px-3 py-3">Hora</th><th className="px-5 py-3 text-right">Monto</th></tr></thead><tbody className="divide-y divide-slate-100">{expenses.map((movement) => <tr key={movement.id}><td className="px-5 py-3"><Badge variant="neutral">{labelCategory(movement.categoria)}</Badge></td><td className="px-3 py-3 text-slate-600">{movement.concepto}</td><td className="px-3 py-3 text-slate-400 tabular-nums">{movement.creado_en ? formatTime(movement.creado_en) : "—"}</td><td className="px-5 py-3 text-right font-bold text-red-600 tabular-nums">− S/ {movement.monto}</td></tr>)}</tbody></table></div>
      )}
    </section>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center text-sm text-slate-400">{message}</div>;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
}

function labelCategory(value: string | null) {
  if (!value) return "Otros";
  return value.charAt(0) + value.slice(1).toLowerCase();
}
