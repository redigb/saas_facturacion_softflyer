import Link from "next/link";
import { Plus, Users } from "lucide-react";

import { ClientsTable } from "@/app/plataforma/(backoffice)/clientes/clients-table";
import type { Client } from "@/app/plataforma/types";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

export default async function ClientsPage() {
  const result = await apiFetch<Client[]>("plataforma/clientes");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Clientes</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Directorio completo de restaurantes en la plataforma (excluyendo la demo pública).
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/plataforma/clientes/nuevo">
            <Plus className="h-4 w-4" />
            <span>Nuevo cliente</span>
          </Link>
        </Button>
      </div>

      {result.ok ? (
        <ClientsTable clients={result.data} />
      ) : (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-bold">Error al cargar clientes</p>
          <p className="mt-1 text-sm">{result.error.mensaje}</p>
        </div>
      )}
    </div>
  );
}
