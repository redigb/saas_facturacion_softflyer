import { DemoDashboard, Greeting, PaidDashboard, type DashboardSummary } from "@/app/panel/dashboard";
import { apiFetch, type Me } from "@/lib/api";

export default async function PanelPage() {
  const [me, summary] = await Promise.all([
    apiFetch<Me>("auth/yo"),
    apiFetch<DashboardSummary>("panel/resumen"),
  ]);

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
