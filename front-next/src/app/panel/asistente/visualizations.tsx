"use client";

import { BarChart } from "@/app/panel/analiticas/charts";
import { PriceText } from "@/components/ui";
import { toCents } from "@/lib/schemas/caja";
import type { AssistantVisualization } from "@/lib/schemas/asistente";

/** Visualizaciones tipadas del asistente: solo se dibujan si el backend las envió válidas. */
export function Visualization({ visualization }: { visualization: AssistantVisualization }) {
  if (visualization.tipo === "metric") {
    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{visualization.titulo}</p>
        <div className="mt-1">
          <PriceText amount={visualization.valor} size="xl" />
        </div>
      </div>
    );
  }

  if (visualization.tipo === "barras") {
    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">{visualization.titulo}</p>
        <BarChart
          points={visualization.puntos.map((point) => ({ label: point.etiqueta, value: toCents(point.valor) }))}
          empty="Sin movimientos en el período."
        />
      </div>
    );
  }

  if (visualization.tipo === "comparacion") {
    const change = visualization.variacion_pct;
    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{visualization.titulo}</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-500">{visualization.actual.etiqueta}</p>
            <PriceText amount={visualization.actual.valor} />
          </div>
          <div>
            <p className="text-xs text-slate-500">{visualization.anterior.etiqueta}</p>
            <PriceText amount={visualization.anterior.valor} />
          </div>
        </div>
        {change !== null ? (
          <p className={`mt-2 text-xs font-bold tabular-nums ${change >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}% vs. período comparado
          </p>
        ) : null}
      </div>
    );
  }

  if (visualization.items.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">{visualization.titulo}</p>
      <ol className="mt-2 divide-y divide-slate-100">
        {visualization.items.map((item) => (
          <li key={`${item.titulo}-${item.detalle}`} className="py-2">
            <p className="text-sm font-semibold text-tinta">{item.titulo}</p>
            <p className="text-xs text-slate-500">{item.detalle}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
