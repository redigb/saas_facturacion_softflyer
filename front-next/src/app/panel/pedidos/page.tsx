import type { Metadata } from "next";

import { SalonView } from "@/app/panel/pedidos/salon-view";

export const metadata: Metadata = { title: "Pedidos · Softflyer" };

export default function PedidosPage() {
  return <SalonView />;
}
