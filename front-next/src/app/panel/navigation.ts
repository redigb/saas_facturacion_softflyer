import type { IconName } from "@/components/icons";

export type NavItem = {
  label: string;
  icon: IconName;
  href?: string; // sin href = modulo que todavia no existe
  /** Basta con tener uno de estos permisos para ver la sección (Doc. 06 §5). */
  permisos: string[];
};

export type NavSection = { title: string; items: NavItem[] };

// Secciones del panel, en el orden del roadmap del Doc. 08 §13.
export const NAVIGATION: NavSection[] = [
  {
    title: "General",
    items: [{ label: "Inicio", icon: "home", href: "/panel", permisos: ["panel.ver"] }],
  },
  {
    title: "Operación",
    items: [
      { label: "Plano del salón", icon: "plano", href: "/panel/plano", permisos: ["restaurante.plano.editar"] },
      { label: "Pedidos", icon: "pedidos", href: "/panel/pedidos", permisos: ["restaurante.pedidos.crear"] },
      { label: "Mis órdenes", icon: "lista", href: "/panel/mis-pedidos", permisos: ["restaurante.pedidos.crear"] },
      { label: "Cocina", icon: "cocina", href: "/panel/cocina", permisos: ["restaurante.cocina.actualizar_estado"] },
      { label: "Caja", icon: "caja", href: "/panel/caja", permisos: ["caja.abrir"] },
    ],
  },
  {
    title: "Gestión",
    items: [
      { label: "Carta", icon: "carta", href: "/panel/carta", permisos: ["productos.crear", "productos.editar", "productos.eliminar", "restaurante.pedidos.crear"] },
      { label: "Inventario", icon: "inventario", permisos: ["inventario.ver"] },
      { label: "Facturación", icon: "facturacion", permisos: ["comprobantes.emitir"] },
    ],
  },
  {
    title: "Administración",
    items: [
      { label: "Equipo", icon: "equipo", href: "/panel/equipo", permisos: ["usuarios.editar"] },
      { label: "Configuración", icon: "configuracion", href: "/panel/configuracion", permisos: ["configuracion.empresa", "configuracion.sucursales"] },
    ],
  },
];

/**
 * Lo que el rol puede usar. Los módulos que aún no existen ("Pronto") solo se le muestran
 * al administrador del panel: a un mozo no le sirve ver la hoja de ruta.
 */
export function visibleNavigation(permisos: string[]): NavSection[] {
  const canSeeRoadmap = permisos.includes("panel.ver");

  return NAVIGATION.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => item.permisos.some((permiso) => permisos.includes(permiso)) && (item.href !== undefined || canSeeRoadmap),
    ),
  })).filter((section) => section.items.length > 0);
}

/** Primera pantalla que el usuario puede abrir, o null si su rol todavía no tiene ninguna. */
export function firstAllowedHref(permisos: string[]): string | null {
  return visibleNavigation(permisos).flatMap((section) => section.items).find((item) => item.href)?.href ?? null;
}
