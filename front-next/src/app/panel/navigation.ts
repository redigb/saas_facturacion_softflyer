import type { IconName } from "@/components/icons";

export type NavItem = {
  label: string;
  icon: IconName;
  href?: string; // sin href = modulo que todavia no existe
};

export type NavSection = { title: string; items: NavItem[] };

// Secciones del panel del administrador, en el orden del roadmap del Doc. 08 §13.
export const NAVIGATION: NavSection[] = [
  {
    title: "General",
    items: [{ label: "Inicio", icon: "home", href: "/panel" }],
  },
  {
    title: "Operación",
    items: [
      { label: "Plano del salón", icon: "plano" },
      { label: "Pedidos", icon: "pedidos" },
      { label: "Cocina", icon: "cocina" },
      { label: "Caja", icon: "caja" },
    ],
  },
  {
    title: "Gestión",
    items: [
      { label: "Carta", icon: "carta" },
      { label: "Inventario", icon: "inventario" },
      { label: "Facturación", icon: "facturacion" },
    ],
  },
  {
    title: "Administración",
    items: [
      { label: "Equipo", icon: "equipo" },
      { label: "Configuración", icon: "configuracion" },
    ],
  },
];
