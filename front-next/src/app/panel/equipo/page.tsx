import type { Metadata } from "next";

import { TeamView } from "@/app/panel/equipo/team-view";
import { apiFetch, type Me } from "@/lib/api";

export const metadata: Metadata = { title: "Equipo · Softflyer" };

export default async function EquipoPage() {
  const me = await apiFetch<Me>("auth/yo");
  const permisos = me.ok ? me.data.permisos : [];

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Equipo</h1>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">Quién trabaja en tu restaurante, qué puede hacer y cómo entra.</p>
      </div>
      <div className="mt-6">
        <TeamView can={{ create: permisos.includes("usuarios.crear"), assignRole: permisos.includes("usuarios.asignar_rol") }} />
      </div>
    </>
  );
}
