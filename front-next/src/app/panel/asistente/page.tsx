import type { Metadata } from "next";

import { AssistantView } from "@/app/panel/asistente/assistant-view";
import { apiFetch, type Me } from "@/lib/api";

export const metadata: Metadata = { title: "Asistente · Softflyer" };

export default async function AssistantPage() {
  const me = await apiFetch<Me>("auth/yo");

  if (!me.ok || !me.data.permisos.includes("reportes.ventas")) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <p className="font-bold">Acceso restringido</p>
        <p className="mt-1 text-sm">El asistente está disponible para el administrador del restaurante.</p>
      </div>
    );
  }

  return <AssistantView />;
}
