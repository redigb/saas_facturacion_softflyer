export const CLIENT_TABS = [
  { value: "cuenta", label: "Cuenta" },
  { value: "facturacion", label: "Facturación" },
  { value: "usuarios", label: "Usuarios" },
  { value: "bitacora", label: "Bitácora" },
] as const;

export type ClientTab = (typeof CLIENT_TABS)[number]["value"];

/** Pestañas que se fusionaron en "Cuenta": los enlaces guardados con el nombre anterior siguen funcionando. */
export const LEGACY_TABS: Record<string, ClientTab> = { resumen: "cuenta", suscripcion: "cuenta" };
