import { DemoDashboard, Greeting, PaidDashboard, type DashboardSummary } from "@/app/panel/dashboard";
import { redirect } from "next/navigation";

import { firstAllowedHref } from "@/app/panel/navigation";
import { apiFetch, type Me } from "@/lib/api";

export default async function PanelPage() {
  const me = await apiFetch<Me>("auth/yo");

  // Inicio es del administrador; los demás roles van directo a su primera sección (spec 004).
  if (me.ok && !me.data.permisos.includes("panel.ver")) {
    const href = firstAllowedHref(me.data.permisos);
    if (href && href !== "/panel") redirect(href);
  }

  const summary = await apiFetch<DashboardSummary>("panel/resumen");

  if (!me.ok || !summary.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-bold">No pudimos cargar tu panel.</p>
        <p className="mt-1 text-sm">{!summary.ok ? summary.error.mensaje : "Intenta recargar la página."}</p>
      </div>
    );
  }

  const isDemo = me.data.inquilino.modo === "DEMO";

  return (
    <>
      <Greeting
        name={me.data.usuario.nombre}
        subtitle={
          isDemo
            ? "Te damos la bienvenida al restaurante de ejemplo de Softflyer."
            : `Este es el panel de control de ${me.data.inquilino.nombre}.`
        }
      />
      {isDemo ? <DemoDashboard summary={summary.data} /> : <PaidDashboard summary={summary.data} />}
    </>
  );
}
