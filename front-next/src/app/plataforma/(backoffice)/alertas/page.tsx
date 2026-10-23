import Link from "next/link";

import type { FiscalAlert } from "@/app/plataforma/types";
import { formatDateTime } from "@/app/plataforma/ui";
import { apiFetch } from "@/lib/api";

const TITLES: Record<FiscalAlert["tipo"], string> = {
  CREDENCIALES: "Credenciales SOL rechazadas",
  SIN_CDR: "Sin constancia de recepción (CDR)",
  VENCIDO: "Fuera de plazo",
  PENDIENTES: "Pendientes de envío",
  CERTIFICADO: "Certificado digital",
};

export default async function AlertsPage() {
  const result = await apiFetch<FiscalAlert[]>("plataforma/alertas");

  return (
    <>
      <h1 className="text-3xl font-bold text-tinta">Alertas de facturación</h1>
      <p className="mt-1 max-w-2xl text-slate-600">
        Lo que necesita tu atención en la emisión de cada cliente. Los envíos se reintentan solos; aquí aparece lo que ya no depende de SUNAT.
      </p>

      {!result.ok ? (
        <p className="mt-8 text-red-700">{result.error.mensaje}</p>
      ) : result.data.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">Todo en orden: no hay alertas.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {result.data.map((alert) => (
            <li key={`${alert.slug}-${alert.tipo}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${alert.severidad === "alta" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                    {alert.severidad === "alta" ? "Urgente" : "Revisar"}
                  </span>
                  <p className="font-bold text-tinta">{TITLES[alert.tipo]}</p>
                  {alert.tipo !== "CERTIFICADO" ? <span className="text-sm font-semibold text-slate-500">× {alert.cantidad}</span> : null}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  <span className="font-semibold text-tinta">{alert.cliente}</span> · {alert.detalle}
                </p>
              </div>
              <Link href={`/plataforma/clientes/${alert.slug}`} className="rounded-xl border-2 border-azul px-3 py-2 text-xs font-bold text-azul transition hover:bg-azul hover:text-white">
                Ver cliente
              </Link>
              {alert.comprobantes.length > 0 ? (
                <details className="w-full text-sm">
                  <summary className="cursor-pointer font-semibold text-azul">
                    Ver comprobantes{alert.cantidad > alert.comprobantes.length ? ` (los ${alert.comprobantes.length} más antiguos de ${alert.cantidad})` : ""}
                  </summary>
                  <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100">
                    {alert.comprobantes.map((receipt) => (
                      <li key={receipt.numero} className="px-3 py-2">
                        <p className="font-semibold text-tinta">
                          {receipt.numero} <span className="font-normal text-slate-500">· {receipt.tipo} · S/ {receipt.total} · {formatDateTime(receipt.emitido_en)} · {receipt.intentos} {receipt.intentos === 1 ? "intento" : "intentos"}</span>
                        </p>
                        {receipt.error ? <p className="text-xs text-slate-500">{receipt.error}</p> : null}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
