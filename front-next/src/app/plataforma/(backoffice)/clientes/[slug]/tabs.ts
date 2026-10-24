export const CLIENT_TABS = [
  { value: "resumen", label: "Resumen" },
  { value: "facturacion", label: "Facturación" },
  { value: "suscripcion", label: "Suscripción" },
  { value: "usuarios", label: "Usuarios" },
  { value: "bitacora", label: "Bitácora" },
] as const;

export type ClientTab = (typeof CLIENT_TABS)[number]["value"];
