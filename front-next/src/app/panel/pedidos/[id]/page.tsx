import type { Metadata } from "next";

import { OrderView } from "@/app/panel/pedidos/order-view";
import { apiFetch, type Me } from "@/lib/api";

export const metadata: Metadata = { title: "Pedido · Softflyer" };

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await apiFetch<Me>("auth/yo");
  const canVoid = me.ok && me.data.permisos.includes("restaurante.pedidos.anular_item");
  const user = me.ok
    ? {
        id: me.data.usuario.id,
        esJefe: me.data.permisos.includes("panel.ver") || me.data.permisos.includes("restaurante.mesas.gestionar"),
      }
    : { id: 0, esJefe: true };

  return <OrderView orderId={Number(id)} canVoid={canVoid} user={user} />;
}
