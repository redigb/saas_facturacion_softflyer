import type { Metadata } from "next";

import { MisOrdersView } from "@/app/panel/mis-pedidos/mis-orders-view";
import { apiFetch, type Me } from "@/lib/api";

export const metadata: Metadata = { title: "Órdenes · Softflyer" };

export default async function MisOrdersPage() {
  const me = await apiFetch<Me>("auth/yo");
  const userId = me.ok ? me.data.usuario.id : null;
  const permissions = me.ok ? me.data.permisos : [];

  return <MisOrdersView userId={userId} isAdmin={permissions.includes("panel.ver")} canCharge={permissions.includes("ventas.crear")} />;
}
