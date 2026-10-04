export type PlatformAdmin = { id: number; nombre: string; correo: string };

export type Client = {
  id: number;
  slug: string;
  nombre: string;
  estado: "PRUEBA" | "ACTIVO" | "MOROSO" | "SUSPENDIDO" | "CANCELADO";
  modo: "PRUEBA" | "PAGO";
  ruc: string | null;
  razon_social: string | null;
  plan: string | null;
  suscripcion: { estado: string; fecha_vencimiento: string; dias_restantes: number } | null;
  prueba: { vence_en: string; dias_restantes: number; vencida: boolean } | null;
  usuarios: number;
  origen: "PRUEBA_WEB" | "MANUAL";
  contacto: { nombre: string | null; correo: string | null; telefono: string | null };
  creado_en: string;
};

export type ClientDetail = Client & {
  suscripciones: { plan: string; estado: string; fecha_inicio: string; fecha_vencimiento: string }[];
  usuarios_detalle: { id: number; nombre: string; correo: string; es_activo: boolean }[];
  conteos: { mesas: number; productos: number; sucursales: number };
  bitacora: { accion: string; detalle: Record<string, unknown>; administrador: string; creado_en: string }[];
};

export type Overview = {
  clientes: number;
  en_prueba: number;
  por_vencer: number;
  pruebas_vencidas: number;
  de_pago: number;
  suspendidos: number;
  solicitudes_pendientes: number;
  conversion: number | null;
  seguimiento: Client[];
};

export type Plan = { codigo: string; nombre: string; precio_mensual: string };

export type PendingRegistration = {
  id: number;
  ruc: string;
  razon_social: string;
  nombre_comercial: string;
  nombre_contacto: string;
  correo: string;
  telefono: string | null;
  enlace_vigente: boolean;
  creado_en: string;
};
