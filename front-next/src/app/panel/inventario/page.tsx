import type { Metadata } from "next";

import { InventoryView } from "@/app/panel/inventario/inventory-view";
import { apiFetch, type Me } from "@/lib/api";

export const metadata: Metadata = { title: "Inventario · Softflyer" };

export default async function InventoryPage() {
  const me = await apiFetch<Me>("auth/yo");
  if (!me.ok) return null;

  return (
    <InventoryView
      branches={me.data.sucursales}
      canAdmin={me.data.permisos.includes("inventario.administrar")}
      canAdjust={me.data.permisos.includes("inventario.ajustar")}
    />
  );
}
