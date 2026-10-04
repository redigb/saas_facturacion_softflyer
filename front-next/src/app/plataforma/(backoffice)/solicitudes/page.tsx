import { ResendButton } from "@/app/plataforma/(backoffice)/solicitudes/resend-button";
import type { PendingRegistration } from "@/app/plataforma/types";
import { formatDateTime } from "@/app/plataforma/ui";
import { apiFetch } from "@/lib/api";

export default async function RegistrationsPage() {
  const result = await apiFetch<PendingRegistration[]>("plataforma/solicitudes");

  return (
    <>
      <h1 className="text-3xl font-bold text-tinta">Solicitudes de prueba</h1>
      <p className="mt-1 max-w-2xl text-slate-600">
        Personas que llenaron el registro pero todavía no confirmaron su correo. Son interesados reales: vale la pena
        contactarlos.
      </p>

      {!result.ok ? (
        <p className="mt-8 text-red-700">{result.error.mensaje}</p>
      ) : result.data.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          No hay solicitudes pendientes.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-niebla text-xs font-bold tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Restaurante</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Enviada</th>
                <th className="px-4 py-3">Enlace</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.data.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-tinta">{r.nombre_comercial}</p>
                    <p className="text-xs text-slate-500">{r.razon_social} · RUC {r.ruc}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.nombre_contacto}
                    <p className="text-xs text-slate-500">{r.correo}{r.telefono && ` · ${r.telefono}`}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(r.creado_en)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${r.enlace_vigente ? "bg-celeste/15 text-azul" : "bg-slate-200 text-slate-600"}`}>
                      {r.enlace_vigente ? "Vigente" : "Vencido"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ResendButton id={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
