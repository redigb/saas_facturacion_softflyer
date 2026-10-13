import type { Metadata } from "next";

import { ConfigurationView } from "@/app/panel/configuracion/configuration-view";
import { apiFetch, type Me } from "@/lib/api";

export const metadata: Metadata = { title: "Configuración · Softflyer" };

export default async function ConfiguracionPage() {
  const me = await apiFetch<Me>("auth/yo");
  const permisos = me.ok ? me.data.permisos : [];

  return (
    <ConfigurationView
      can={{
        empresa: permisos.includes("configuracion.empresa"),
        sucursales: permisos.includes("configuracion.sucursales"),
      }}
    />
  );
}
