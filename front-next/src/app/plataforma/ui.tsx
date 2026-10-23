import type { Client } from "@/app/plataforma/types";

/** Estado comercial de un cliente, en una sola etiqueta. */
export function ClientStatus({ client }: { client: Client }) {
  const { label, className } = statusOf(client);

  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap ${className}`}>{label}</span>;
}

export function statusOf(client: Client): { label: string; className: string; key: string } {
  if (client.estado === "SUSPENDIDO") {
    return { key: "suspendidos", label: "Suspendido", className: "bg-red-100 text-red-700" };
  }
  if (client.estado === "CANCELADO") {
    return { key: "cancelados", label: "Cancelado", className: "bg-slate-200 text-slate-600" };
  }
  if (client.prueba?.vencida) {
    return { key: "vencidas", label: "Prueba vencida", className: "bg-amarillo/40 text-tinta" };
  }
  if (client.modo === "PRUEBA") {
    const days = client.prueba?.dias_restantes ?? 0;
    return {
      key: "prueba",
      label: days === 0 ? "Prueba · vence hoy" : `Prueba · ${days} d`,
      className: days <= 2 ? "bg-amarillo text-tinta" : "bg-celeste/15 text-azul",
    };
  }

  return { key: "pago", label: "De pago", className: "bg-emerald-100 text-emerald-700" };
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso),
  );
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  }).format(new Date(iso));
}

export const ACTION_LABELS: Record<string, string> = {
  CLIENTE_CREADO: "Cliente creado",
  PLAN_ACTIVADO: "Plan activado",
  PRUEBA_EXTENDIDA: "Prueba extendida",
  CLIENTE_SUSPENDIDO: "Cliente suspendido",
  CLIENTE_REACTIVADO: "Cliente reactivado",
  ENLACE_REENVIADO: "Enlace reenviado",
  HOMOLOGACION_ACTUALIZADA: "Homologación actualizada",
  BLOQUEO_FISCAL_ACTUALIZADO: "Bloqueo fiscal actualizado",
  CERTIFICADO_CARGADO: "Certificado cargado",
  CREDENCIALES_SOL_ACTUALIZADAS: "Credenciales SOL actualizadas",
  IGV_LOCAL_ACTUALIZADO: "IGV del local actualizado",
  TASA_IGV_ACTUALIZADA: "Tasa de IGV actualizada",
  AMAZONIA_LOCAL_ACTUALIZADA: "Amazonía del local actualizada",
};

export const cardClass = "rounded-2xl border border-slate-200 bg-white p-6";
export const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-azul focus:ring-4 focus:ring-celeste/25";
export const primaryButton =
  "inline-flex items-center justify-center rounded-xl bg-azul px-4 py-2.5 text-sm font-bold text-white transition hover:bg-azul-oscuro disabled:opacity-60";
