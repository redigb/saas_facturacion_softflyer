import Link from "next/link";
import { notFound } from "next/navigation";

import { ClientActions } from "@/app/plataforma/(backoffice)/clientes/[slug]/client-actions";
import type { ClientDetail, Plan } from "@/app/plataforma/types";
import { ACTION_LABELS, cardClass, ClientStatus, formatDate, formatDateTime } from "@/app/plataforma/ui";
import { apiFetch } from "@/lib/api";
import { tenantUrl } from "@/lib/tenant";

export default async function ClientPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [result, plans] = await Promise.all([
    apiFetch<ClientDetail>(`plataforma/clientes/${encodeURIComponent(slug)}`),
    apiFetch<Plan[]>("plataforma/planes"),
  ]);

  if (!result.ok) {
    if (result.status === 404) {
      notFound();
    }
    return <p className="text-red-700">{result.error.mensaje}</p>;
  }

  const c = result.data;

  return (
    <>
      <Link href="/plataforma/clientes" className="text-sm font-semibold text-azul hover:text-celeste">
        ← Clientes
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-tinta">{c.nombre}</h1>
        <ClientStatus client={c} />
      </div>
      <a href={tenantUrl(c.slug, "/login")} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-slate-500 hover:text-azul">
        {tenantUrl(c.slug, "")} ↗
      </a>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <section className={cardClass}>
            <h2 className="text-lg font-bold text-tinta">Datos del cliente</h2>
            <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <Item label="RUC" value={c.ruc} mono />
              <Item label="Razón social" value={c.razon_social} />
              <Item label="Contacto" value={c.contacto.nombre} />
              <Item label="Correo" value={c.contacto.correo} />
              <Item label="Celular" value={c.contacto.telefono} />
              <Item label="Origen" value={c.origen === "PRUEBA_WEB" ? "Prueba gratis desde la web" : "Alta manual (ventas)"} />
              <Item label="Registrado" value={formatDate(c.creado_en)} />
              <Item label="Uso" value={`${c.usuarios} usuarios · ${c.conteos.mesas} mesas · ${c.conteos.productos} productos`} />
            </dl>
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-bold text-tinta">Facturación electrónica</h2>
            <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <Item label="Estado" value={c.fiscal.listo_para_emitir ? "Lista para emitir" : "Falta configurar"} />
              <Item label="Entorno" value={c.fiscal.entorno === "PRODUCCION" ? "Producción" : "Pruebas (beta)"} />
              <Item
                label="Certificado"
                value={c.fiscal.certificado ? `${c.fiscal.certificado.titular ?? "Cargado"} · ${c.fiscal.certificado.vigente ? `vence ${formatDate(c.fiscal.certificado.vence_en)}` : "vencido"}` : null}
              />
              <Item label="Usuario SOL" value={c.fiscal.usuario_sol ? `${c.fiscal.usuario_sol}${c.fiscal.tiene_clave_sol ? " · clave guardada" : " · sin clave"}` : null} />
              <Item label="Tasa de IGV" value={c.fiscal.tasa_igv ? `${c.fiscal.tasa_igv.nombre} · ${c.fiscal.tasa_igv.tasa}%` : null} />
              <Item label="Homologado en SUNAT" value={c.fiscal.homologado ? "Sí" : "No"} />
            </dl>
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-bold text-tinta">Historial de suscripciones</h2>
            <table className="mt-4 w-full text-left text-sm">
              <thead className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="pb-2">Plan</th>
                  <th className="pb-2">Estado</th>
                  <th className="pb-2">Desde</th>
                  <th className="pb-2">Hasta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {c.suscripciones.map((s, i) => (
                  <tr key={i} className={i === 0 ? "font-semibold text-tinta" : "text-slate-500"}>
                    <td className="py-2">{s.plan}{i === 0 && <span className="ml-2 text-xs font-bold text-celeste">VIGENTE</span>}</td>
                    <td className="py-2">{s.estado}</td>
                    <td className="py-2">{formatDate(s.fecha_inicio)}</td>
                    <td className="py-2">{formatDate(s.fecha_vencimiento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className={cardClass}>
            <h2 className="text-lg font-bold text-tinta">Bitácora</h2>
            {c.bitacora.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Sin acciones del equipo sobre este cliente.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {c.bitacora.map((entry, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-celeste" />
                    <div>
                      <p className="font-semibold text-tinta">
                        {ACTION_LABELS[entry.accion] ?? entry.accion}
                        <span className="font-normal text-slate-500"> · {entry.administrador} · {formatDateTime(entry.creado_en)}</span>
                      </p>
                      <p className="text-slate-500">
                        {Object.entries(entry.detalle).map(([key, value]) => `${key}: ${value}`).join(" · ")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <ClientActions client={c} plans={plans.ok ? plans.data : []} />
      </div>
    </>
  );
}

function Item({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className={`mt-0.5 text-tinta ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
    </div>
  );
}
