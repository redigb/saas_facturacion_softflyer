import type { Metadata } from "next";

import { MenuEditor } from "@/app/panel/carta/menu-editor";
import { apiFetch, type Me } from "@/lib/api";

export const metadata: Metadata = { title: "Carta · Softflyer" };

export default async function CartaPage() {
  const me = await apiFetch<Me>("auth/yo");
  const permisos = me.ok ? me.data.permisos : [];

  return (
    <MenuEditor
      can={{
        create: permisos.includes("productos.crear"),
        edit: permisos.includes("productos.editar"),
        delete: permisos.includes("productos.eliminar"),
      }}
    />
  );
}
