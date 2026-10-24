import { Users } from "lucide-react";

import { ClientsTable } from "@/app/plataforma/(backoffice)/clientes/clients-table";
import type { Client, Plan } from "@/app/plataforma/types";
import { ErrorNotice } from "@/components/backoffice/molecules/notice";
import { NewClientDialog } from "@/components/backoffice/organisms/new-client-dialog";
import { apiFetch } from "@/lib/api";
import { rootDomainLabel } from "@/lib/tenant";

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const [result, plansResult] = await Promise.all([
    apiFetch<Client[]>("plataforma/clientes"),
    apiFetch<Plan[]>("plataforma/planes"),
  ]);

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
        <NewClientDialog
          plans={plansResult.ok ? plansResult.data : []}
          rootDomain={rootDomainLabel()}
        />
      </div>

      {result.ok ? (
        <ClientsTable clients={result.data} initialFilter={estado} />
      ) : (
        <ErrorNotice title="Error al cargar clientes" message={result.error.mensaje} />
      )}
    </div>
  );
}
