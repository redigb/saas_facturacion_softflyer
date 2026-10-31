"use client";

import { useState } from "react";

import { BarChart, DonutChart, RankBar } from "@/app/panel/analiticas/charts";
import { useAnalytics } from "@/app/panel/analiticas/queries";
import { Skeleton } from "@/app/panel/carta/ui";
import { Button, PriceText } from "@/components/ui";
import type { Analytics } from "@/lib/schemas/analiticas";
import { toCents } from "@/lib/schemas/caja";

/** Tablero de ventas del administrador (spec 039). */
export function AnalyticsView() {
  const today = isoDate(new Date());
  const [desde, setDesde] = useState(monthStart(today));
  const [hasta, setHasta] = useState(today);
  const [branch, setBranch] = useState<number | null>(null);
  const report = useAnalytics({ desde, hasta, sucursalId: branch });

  function range(start: string, end: string) {
    setDesde(start);
    setHasta(end);
  }

  function preset(target: "hoy" | "7d" | "mes" | "anio" | "anio-pasado") {
    const [start, end] = presetRange(target, today);
    range(start, end);
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <p className="text-xs font-bold tracking-widest text-azul uppercase">Reportes</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Analíticas</h1>
        <p className="mt-1 text-sm text-slate-500">Cómo van las ventas por año, mes y día, qué se vende más y a qué hora entra el dinero.</p>
      </div>

      <section aria-label="Filtros" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["hoy", "Hoy"],
              ["7d", "7 días"],
              ["mes", "Este mes"],
              ["anio", "Este año"],
              ["anio-pasado", "Año pasado"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" onClick={() => preset(id)} className="min-h-[40px] rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-azul hover:text-white">
              {label}
            </button>
          ))}

          <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />

          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            Desde
            <input type="date" value={desde} max={hasta} onChange={(event) => setDesde(event.target.value)} className="min-h-[40px] rounded-xl border border-slate-200 px-2 text-sm text-tinta" />
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            Hasta
            <input type="date" value={hasta} min={desde} onChange={(event) => setHasta(event.target.value)} className="min-h-[40px] rounded-xl border border-slate-200 px-2 text-sm text-tinta" />
          </label>

          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            Sucursal
            <select
              value={branch ?? ""}
              onChange={(event) => setBranch(event.target.value === "" ? null : Number(event.target.value))}
              className="min-h-[40px] rounded-xl border border-slate-200 px-2 text-sm text-tinta"
            >
              <option value="">Todas</option>
              {(report.data?.sucursales ?? []).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
          </label>

          {(report.data?.anios.length ?? 0) > 0 ? (
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              Año
              <select
                value={desde.slice(0, 4)}
                onChange={(event) => range(`${event.target.value}-01-01`, `${event.target.value}-12-31`)}
                className="min-h-[40px] rounded-xl border border-slate-200 px-2 text-sm text-tinta"
              >
                {(report.data?.anios ?? []).map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      </section>

      {report.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p className="font-bold">No pudimos cargar las analíticas.</p>
          <p className="mt-1">{report.error.message}</p>
          <Button variant="secondary" className="mt-4" onClick={() => void report.refetch()}>Reintentar</Button>
        </div>
      ) : report.isPending || !report.data ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}</div>
          <Skeleton className="h-72" />
          <div className="grid gap-4 xl:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
        </div>
      ) : (
        <Report data={report.data} loading={report.isFetching} />
      )}
    </div>
  );
}

function Report({ data, loading }: { data: Analytics; loading: boolean }) {
  const maxDish = Math.max(...data.top_platos.map((dish) => toCents(dish.ventas)), 1);
  const maxCategory = Math.max(...data.top_categorias.map((category) => toCents(category.ventas)), 1);

  return (
    <div className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}>
      <section aria-label="Indicadores" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ventas totales" value={<PriceText amount={data.kpis.ventas} size="xl" />} hint={`${data.kpis.ordenes} cuentas cobradas`} delta={data.comparacion.ventas_pct} tone="bg-emerald-500" />
        <MetricCard label="Ticket promedio" value={<PriceText amount={data.kpis.ticket_promedio} size="xl" />} hint="Media por cuenta" delta={data.comparacion.ticket_pct} tone="bg-azul" />
        <MetricCard label="Platos vendidos" value={<span className="text-2xl font-bold text-tinta tabular-nums">{data.kpis.platos}</span>} hint="Unidades cobradas" delta={data.comparacion.platos_pct} tone="bg-celeste" />
        <MetricCard label="Cuentas cobradas" value={<span className="text-2xl font-bold text-tinta tabular-nums">{data.kpis.ordenes}</span>} hint={`IGV del periodo: S/ ${data.kpis.igv}`} delta={data.comparacion.ordenes_pct} tone="bg-amber-500" />
      </section>

      {data.kpis.ordenes === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
          Aún no hay ventas en este rango. Prueba con otro periodo o sucursal.
        </p>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Evolución de ventas" description={labelGroup(data.rango.agrupar)}>
              <BarChart points={data.serie.map((point) => ({ label: point.etiqueta, value: toCents(point.ventas), hint: `${point.ordenes} cuentas` }))} empty="Sin ventas en el periodo." />
            </Panel>
            <Panel title="Ventas por año" description="Compara el total anual">
              <BarChart points={data.por_anio.map((row) => ({ label: String(row.anio), value: toCents(row.ventas), hint: `${row.ordenes} cuentas` }))} tone="bg-celeste" empty="Sin años con ventas." />
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Platos más vendidos" description="Por unidades cobradas en el periodo">
              {data.top_platos.length === 0 ? <EmptyPanel /> : (
                <ul className="divide-y divide-slate-100">
                  {data.top_platos.map((dish, index) => (
                    <li key={dish.producto_id} className="py-2.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-semibold text-tinta"><span className="mr-1 text-slate-400 tabular-nums">{index + 1}.</span>{dish.nombre}</span>
                        <span className="shrink-0 text-right">
                          <span className="block font-bold text-tinta tabular-nums">S/ {dish.ventas}</span>
                          <span className="block text-xs text-slate-400 tabular-nums">{Number(dish.cantidad)} un.</span>
                        </span>
                      </div>
                      <div className="mt-1.5"><RankBar value={toCents(dish.ventas)} max={maxDish} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Categorías" description="Qué parte de la carta trae el dinero">
              {data.top_categorias.length === 0 ? <EmptyPanel /> : (
                <ul className="divide-y divide-slate-100">
                  {data.top_categorias.map((category) => (
                    <li key={category.nombre} className="py-2.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-semibold text-tinta">{category.nombre}</span>
                        <span className="shrink-0 font-bold text-tinta tabular-nums">S/ {category.ventas}</span>
                      </div>
                      <div className="mt-1.5"><RankBar value={toCents(category.ventas)} max={maxCategory} tone="bg-celeste" /></div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Métodos de pago" description="Cómo cobran tus clientes">
              <DonutChart items={data.por_metodo.map((method) => ({ label: method.nombre, value: toCents(method.ventas) }))} empty="Sin pagos en el periodo." />
            </Panel>
            <Panel title="Horas punta" description="Ventas por hora del día">
              <BarChart points={data.por_hora.map((row) => ({ label: row.hora, value: toCents(row.ventas), hint: `${row.ordenes} cuentas` }))} tone="bg-emerald-500" empty="Sin ventas en el periodo." />
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <Panel title="Días de la semana" description="Cuándo viene más gente">
              <BarChart points={data.por_dia_semana.map((row) => ({ label: row.etiqueta, value: toCents(row.ventas), hint: `${row.ordenes} cuentas` }))} tone="bg-amber-500" empty="Sin ventas en el periodo." />
            </Panel>
            <Panel title="Cobrado por" description="Turnos del equipo">
              <SimpleTable rows={data.por_cobrador.map((row) => ({ id: row.usuario_id, name: row.nombre, value: row.ventas, extra: `${row.ordenes} cuentas` }))} />
            </Panel>
            <Panel title="Sucursales" description="Rendimiento por local">
              <SimpleTable rows={data.por_sucursal.map((row) => ({ id: row.sucursal_id, name: row.nombre, value: row.ventas, extra: `${row.ordenes} cuentas` }))} />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, hint, delta, deltaLabel = "vs. periodo anterior", tone }: { label: string; value: React.ReactNode; hint: string; delta: number | null; deltaLabel?: string; tone: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
      <p className="flex items-center gap-2 text-xs font-semibold text-slate-500"><span className={`h-2 w-2 rounded-full ${tone}`} />{label}</p>
      <div className="mt-2">{value}</div>
      <p className="mt-1 text-xs text-slate-400 tabular-nums">{hint}</p>
      <p className="mt-2 flex items-center gap-1 text-xs">
        <Delta value={delta} />
        <span className="text-slate-400">{deltaLabel}</span>
      </p>
    </article>
  );
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="font-semibold text-slate-400">Sin comparación</span>;
  const up = value >= 0;

  return <span className={`font-bold tabular-nums ${up ? "text-emerald-600" : "text-red-600"}`}>{up ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%</span>;
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

function SimpleTable({ rows }: { rows: { id: number; name: string; value: string; extra: string }[] }) {
  if (rows.length === 0) return <EmptyPanel />;

  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <span className="min-w-0 truncate font-semibold text-tinta">{row.name}</span>
          <span className="shrink-0 text-right">
            <span className="block font-bold text-tinta tabular-nums">S/ {row.value}</span>
            <span className="block text-xs text-slate-400">{row.extra}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function EmptyPanel() {
  return <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">Sin datos en este rango.</p>;
}

function labelGroup(group: Analytics["rango"]["agrupar"]): string {
  return group === "dia" ? "Ventas por día" : group === "mes" ? "Ventas por mes" : "Ventas por año";
}

function isoDate(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function monthStart(today: string): string {
  return `${today.slice(0, 7)}-01`;
}

/** Rangos rápidos calculados fuera del render para mantener el componente puro. */
function presetRange(target: "hoy" | "7d" | "mes" | "anio" | "anio-pasado", today: string): [string, string] {
  const year = Number(today.slice(0, 4));

  if (target === "hoy") return [today, today];
  if (target === "7d") return [daysBefore(today, 6), today];
  if (target === "mes") return [monthStart(today), today];
  if (target === "anio") return [`${year}-01-01`, `${year}-12-31`];
  return [`${year - 1}-01-01`, `${year - 1}-12-31`];
}

function daysBefore(today: string, days: number): string {
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - days);

  return isoDate(date);
}
