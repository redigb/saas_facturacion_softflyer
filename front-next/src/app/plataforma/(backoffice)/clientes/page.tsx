import Link from "next/link";

import { ClientsTable } from "@/app/plataforma/(backoffice)/clientes/clients-table";
import type { Client } from "@/app/plataforma/types";
import { primaryButton } from "@/app/plataforma/ui";
import { apiFetch } from "@/lib/api";

export default async function ClientsPage() {
  const result = await apiFetch<Client[]>("plataforma/clientes");

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-tinta">Clientes</h1>
          <p className="mt-1 text-slate-600">Todos los restaurantes de la plataforma (sin contar la demo pública).</p>
        </div>
        <Link href="/plataforma/clientes/nuevo" className={primaryButton}>
          + Nuevo cliente
        </Link>
      </div>

      {result.ok ? <ClientsTable clients={result.data} /> : <p className="mt-8 text-red-700">{result.error.mensaje}</p>}
    </>
  );
}
