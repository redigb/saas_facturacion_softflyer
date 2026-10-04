import Link from "next/link";

import type { Overview } from "@/app/plataforma/types";
import { cardClass, ClientStatus, formatDate } from "@/app/plataforma/ui";
import { apiFetch } from "@/lib/api";

export default async function PlatformOverviewPage() {
  const result = await apiFetch<Overview>("plataforma/resumen");

  if (!result.ok) {
    return <p className="text-red-700">{result.error.mensaje}</p>;
  }

  const o = result.data;
  const tiles = [
    { label: "Clientes", value: o.clientes, hint: "Restaurantes registrados", tone: "text-tinta" },
    { label: "En prueba", value: o.en_prueba, hint: `${o.por_vencer} vencen en 2 días o menos`, tone: "text-azul" },
    { label: "Pruebas vencidas", value: o.pruebas_vencidas, hint: "Esperan contacto de ventas", tone: "text-amber-600" },
    { label: "De pago", value: o.de_pago, hint: "Con plan activo", tone: "text-emerald-600" },
    { label: "Suspendidos", value: o.suspendidos, hint: "Sin acceso a operar", tone: "text-red-600" },
    { label: "Solicitudes", value: o.solicitudes_pendientes, hint: "Registros sin verificar", tone: "text-tinta" },
    { label: "Conversión", value: o.conversion === null ? "—" : `${o.conversion}%`, hint: "Pruebas web que pagan", tone: "text-azul" },
  ];

  return (
    <>
      <h1 className="text-3xl font-bold text-tinta">Resumen</h1>
      <p className="mt-1 text-slate-600">Cómo va el negocio hoy.</p>

      <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{tile.label}</p>
            <p className={`mt-2 text-3xl font-bold ${tile.tone}`}>{tile.value}</p>
            <p className="mt-1 text-xs text-slate-500">{tile.hint}</p>
          </div>
        ))}
      </section>

      <section className={`${cardClass} mt-8`}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-tinta">Seguimiento de ventas</h2>
            <p className="text-sm text-slate-600">Pruebas que vencen pronto o ya vencieron: es el momento de llamar.</p>
          </div>
          <Link href="/plataforma/clientes" className="text-sm font-semibold text-azul hover:text-celeste">
            Ver todos los clientes →
          </Link>
        </div>

        {o.seguimiento.length === 0 ? (
          <p className="mt-6 rounded-xl bg-niebla p-4 text-sm text-slate-600">Nada urgente: ninguna prueba vence en los próximos 2 días.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {o.seguimiento.map((client) => (
              <li key={client.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/plataforma/clientes/${client.slug}`} className="font-bold text-tinta hover:text-azul">
                    {client.nombre}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {client.contacto.nombre} · {client.contacto.correo}
                    {client.contacto.telefono && ` · ${client.contacto.telefono}`}
                  </p>
                </div>
                <span className="text-sm text-slate-500">Vence {formatDate(client.prueba!.vence_en)}</span>
                <ClientStatus client={client} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
