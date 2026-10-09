import type { Metadata } from "next";

import { FloorEditor } from "@/app/panel/plano/floor-editor";
import { apiFetch, type Me } from "@/lib/api";

export const metadata: Metadata = { title: "Plano del salón · Softflyer" };

export default async function PlanoPage() {
  const me = await apiFetch<Me>("auth/yo");
  const canEdit = me.ok && me.data.permisos.includes("restaurante.plano.editar");

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Plano del salón</h1>
        <p className="mt-1 text-sm text-slate-500 sm:text-base">
          {canEdit ? "Dibuja tu local: ubica mesas, barra y puertas como son en realidad." : "Así está distribuido el local."}
        </p>
      </div>
      <div className="mt-6">
        <FloorEditor canEdit={canEdit} />
      </div>
    </>
  );
}
