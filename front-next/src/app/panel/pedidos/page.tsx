import type { Metadata } from "next";

import { SalonView } from "@/app/panel/pedidos/salon-view";
import { apiFetch, type Me } from "@/lib/api";

export const metadata: Metadata = { title: "Pedidos · Softflyer" };

export default async function PedidosPage() {
  const me = await apiFetch<Me>("auth/yo");
  const user = me.ok
    ? {
        id: me.data.usuario.id,
        esJefe: me.data.permisos.includes("panel.ver") || me.data.permisos.includes("restaurante.mesas.gestionar"),
      }
    : { id: 0, esJefe: true };

  return <SalonView user={user} />;
}
