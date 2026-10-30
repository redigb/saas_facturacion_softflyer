import type { ClientDetail } from "@/app/plataforma/types";

type Fiscal = ClientDetail["fiscal"];

/** Tono visual de un estado: azul = hecho, amarillo = toca actuar, gris = en espera, rojo = bloqueado. */
export type StageTone = "done" | "attention" | "waiting" | "error";

export type RouteStepKey = "certificado" | "sol" | "homologacion" | "produccion";
export type RouteStepState = "done" | "current" | "pending" | "error";

export function certificateReady(fiscal: Fiscal): boolean {
  return Boolean(fiscal.certificado?.vigente);
}

export function solReady(fiscal: Fiscal): boolean {
  return Boolean(fiscal.usuario_sol && fiscal.tiene_clave_sol);
}

/**
 * Único vocabulario del estado SUNAT de un cliente: lo usan la cabecera, el resumen y la pestaña de facturación,
 * para que nunca convivan dos nombres para lo mismo.
 */
export function fiscalStage(fiscal: Fiscal): { label: string; tone: StageTone; summary: string } {
  if (fiscal.certificado && !fiscal.certificado.vigente) {
    return {
      label: "Certificado vencido",
      tone: "error",
      summary: "SUNAT rechaza lo que firma un certificado vencido. Carga uno nuevo para que el cliente vuelva a emitir.",
    };
  }
  if (!fiscal.certificado) {
    return {
      label: "Falta certificado",
      tone: "attention",
      summary: "Sin certificado digital el cliente no puede firmar sus comprobantes.",
    };
  }
  if (!solReady(fiscal)) {
    return {
      label: "Falta clave SOL",
      tone: "attention",
      summary: "Con el usuario y la clave SOL los comprobantes firmados llegan a SUNAT.",
    };
  }
  if (fiscal.entorno === "PRODUCCION") {
    return {
      label: "Emite con validez",
      tone: "done",
      summary: "Sus comprobantes van a SUNAT producción y tienen validez tributaria.",
    };
  }
  if (fiscal.homologado) {
    return {
      label: "Homologado",
      tone: "waiting",
      summary: "SUNAT ya lo reconoce como emisor, pero este servidor envía a SUNAT beta. En el servidor de producción sus comprobantes salen con validez.",
    };
  }

  return {
    label: "En pruebas",
    tone: "attention",
    summary: "Sus comprobantes van a SUNAT beta: SUNAT los revisa, pero no tienen validez tributaria hasta homologar al cliente.",
  };
}

/**
 * Las cuatro paradas hasta emitir con validez; la primera sin completar es la actual. Producción nunca es "el
 * siguiente paso": la activa el servidor, no alguien del equipo.
 */
export function routeSteps(fiscal: Fiscal): Record<RouteStepKey, RouteStepState> {
  const done: Record<RouteStepKey, boolean> = {
    certificado: certificateReady(fiscal),
    sol: solReady(fiscal),
    homologacion: fiscal.homologado,
    produccion: fiscal.entorno === "PRODUCCION",
  };
  const keys = Object.keys(done) as RouteStepKey[];
  const current = keys.find((key) => !done[key] && key !== "produccion");

  return Object.fromEntries(
    keys.map((key) => {
      if (key === "certificado" && fiscal.certificado && !fiscal.certificado.vigente) {
        return [key, "error"];
      }

      return [key, done[key] ? "done" : key === current ? "current" : "pending"];
    }),
  ) as Record<RouteStepKey, RouteStepState>;
}
