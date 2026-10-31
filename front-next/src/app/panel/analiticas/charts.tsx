"use client";

export type BarPoint = { label: string; value: number; hint?: string };

const COLORS = ["stroke-emerald-500", "stroke-azul", "stroke-celeste", "stroke-amber-500", "stroke-slate-400"];

/** Barras verticales simples: mismos tokens que Caja, sin dependencias nuevas. */
export function BarChart({ points, tone = "bg-azul", empty }: { points: BarPoint[]; tone?: string; empty: string }) {
  if (points.length === 0 || points.every((point) => point.value === 0)) {
    return <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">{empty}</p>;
  }

  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="flex h-56 items-end gap-1.5 overflow-x-auto pb-1">
      {points.map((point) => (
        <div key={point.label} className="group flex h-full min-w-7 flex-1 flex-col items-center gap-1" title={`${point.label}: S/ ${(point.value / 100).toFixed(2)}${point.hint ? ` · ${point.hint}` : ""}`}>
          <div className="flex w-full flex-1 items-end">
            <div
              className={`w-full rounded-t-md ${tone} transition-all group-hover:opacity-80`}
              style={{ height: `${Math.max(2, (point.value / max) * 100)}%` }}
            />
          </div>
          <span className="max-w-full truncate text-[10px] text-slate-400">{point.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Dona de participación (métodos de pago). */
export function DonutChart({ items, empty }: { items: { label: string; value: number }[]; empty: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) {
    return <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">{empty}</p>;
  }

  const radius = 64;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90" role="img" aria-label="Distribución por método de pago">
          <circle cx="90" cy="90" r={radius} fill="none" className="stroke-slate-100" strokeWidth="26" />
          {items.map((item, index) => {
            const length = (item.value / total) * circumference;
            const offset = -items.slice(0, index).reduce((sum, previous) => sum + (previous.value / total) * circumference, 0);
            return <circle key={item.label} cx="90" cy="90" r={radius} fill="none" className={COLORS[index % COLORS.length]} strokeWidth="26" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={offset} />;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-slate-400">Total</span>
          <span className="text-lg font-bold text-tinta tabular-nums">S/ {(total / 100).toFixed(2)}</span>
        </div>
      </div>
      <ul className="w-full max-w-56 space-y-1.5">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-slate-600">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${["bg-emerald-500", "bg-azul", "bg-celeste", "bg-amber-500", "bg-slate-400"][index % 5]}`} />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="shrink-0 font-bold text-tinta tabular-nums">{((item.value / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barra horizontal para rankings (platos, categorías, cobradores). */
export function RankBar({ value, max, tone = "bg-azul" }: { value: number; max: number; tone?: string }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
      <span className={`block h-full rounded-full ${tone}`} style={{ width: `${max > 0 ? Math.max(2, (value / max) * 100) : 2}%` }} />
    </span>
  );
}
