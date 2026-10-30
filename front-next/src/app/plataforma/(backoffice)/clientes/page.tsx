import { ClientsTable } from "@/app/plataforma/(backoffice)/clientes/clients-table";
import type { Client, Plan } from "@/app/plataforma/types";
import { needsAttention } from "@/app/plataforma/ui";
import { ErrorNotice } from "@/components/backoffice/molecules/notice";
import { NewClientDialog } from "@/components/backoffice/organisms/new-client-dialog";
import { apiFetch } from "@/lib/api";
import { rootDomainLabel } from "@/lib/tenant";

/** Una frase con lo que importa del directorio: cuántos son y a cuántos hay que atender. */
function summary(clients: Client[]): string {
  const total = `${clients.length} ${clients.length === 1 ? "restaurante" : "restaurantes"}`;
  const attention = clients.filter(needsAttention).length;

  return attention > 0 ? `${total}. ${attention} ${attention === 1 ? "necesita" : "necesitan"} atención y salen primero.` : `${total}. Todos al día.`;
}

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const [result, plansResult] = await Promise.all([
    apiFetch<Client[]>("plataforma/clientes"),
    apiFetch<Plan[]>("plataforma/planes"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Clientes</h1>
          <p className="text-sm font-medium text-foreground/70">{result.ok ? summary(result.data) : "No se pudo cargar el directorio."}</p>
        </div>
        <NewClientDialog plans={plansResult.ok ? plansResult.data : []} rootDomain={rootDomainLabel()} />
      </div>

      {result.ok ? (
        <ClientsTable clients={result.data} initialFilter={estado} />
      ) : (
        <ErrorNotice title="No pudimos cargar los clientes" message={result.error.mensaje} />
      )}
    </div>
  );
}
