import type { Client } from "@/app/plataforma/types";
import { Badge } from "@/components/ui/badge";

/** Estado comercial de un cliente, en una sola etiqueta. */
export function ClientStatus({ client }: { client: Client }) {
  const { label, variant } = statusOf(client);

  return <Badge variant={variant} className="whitespace-nowrap font-bold px-2.5 py-0.5">{label}</Badge>;
}

export function statusOf(client: Client): { label: string; variant: "destructive" | "neutral" | "warning" | "info" | "success"; key: string } {
  if (client.estado === "SUSPENDIDO") {
    return { key: "suspendidos", label: "Suspendido", variant: "destructive" };
  }
  if (client.estado === "CANCELADO") {
    return { key: "cancelados", label: "Cancelado", variant: "neutral" };
  }
  if (client.prueba?.vencida) {
    return { key: "vencidas", label: "Prueba vencida", variant: "warning" };
  }
  if (client.modo === "PRUEBA") {
    const days = client.prueba?.dias_restantes ?? 0;
    return {
      key: "prueba",
      label: days === 0 ? "Prueba · vence hoy" : `Prueba · ${days} d`,
      variant: days <= 2 ? "warning" : "info",
    };
  }

  return { key: "pago", label: "De pago", variant: "success" };
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
  CLIENTE_EDITADO: "Datos corregidos",
  CLIENTE_CANCELADO: "Cliente cancelado",
  ACCESO_RESTABLECIDO: "Enlace de acceso enviado",
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

export const cardClass = "rounded-xl border bg-card p-6 text-card-foreground shadow-xs";
export const inputClass =
  "w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-sm outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/20";
export const primaryButton =
  "inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60 shadow-xs";
