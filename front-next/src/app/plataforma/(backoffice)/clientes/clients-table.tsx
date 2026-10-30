"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ChevronRight, Search, SearchX, X } from "lucide-react";

import type { Client } from "@/app/plataforma/types";
import { ClientStatus, formatDate, needsAttention, statusOf } from "@/app/plataforma/ui";
import { EmptyPanel } from "@/components/backoffice/molecules/notice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "prueba", label: "En prueba" },
  { key: "vencidas", label: "Pruebas vencidas" },
  { key: "pago", label: "De pago" },
  { key: "suspendidos", label: "Suspendidos" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

/** Cuánto le queda al cliente y hasta cuándo, en una frase: lo que se mira para saber a quién escribirle. */
function Remaining({ client }: { client: Client }) {
  const trial = client.modo === "PRUEBA";
  const end = trial ? client.prueba?.vence_en : client.suscripcion?.fecha_vencimiento;
  const left = trial ? client.prueba?.dias_restantes : client.suscripcion?.dias_restantes;

  if (!end || left === undefined) {
    return <p className="text-sm text-muted-foreground">Sin periodo registrado</p>;
  }
  const expired = trial ? client.prueba?.vencida : left < 0;
  const soon = !expired && left <= 7;

  return (
    <>
      <p className={cn("text-sm font-semibold", expired ? "text-destructive" : "text-foreground")}>
        {expired ? "Venció" : left === 0 ? "Vence hoy" : `${trial ? "Prueba:" : "Vence en"} ${left} ${left === 1 ? "día" : "días"}`}
        {soon ? <span aria-hidden className="ml-2 inline-block size-2 rounded-full bg-warning align-middle" /> : null}
        {soon ? <span className="sr-only"> (por vencer)</span> : null}
      </p>
      <p className="text-[13px] text-muted-foreground">
        {trial ? "Termina el" : "Hasta el"} {formatDate(end)}
      </p>
    </>
  );
}

/** Etiqueta y detalle por etapa: qué validez tienen hoy sus comprobantes y qué le falta para la siguiente. */
const BILLING_STAGES = {
  CONFIGURAR: { label: "Simulado", tone: "bg-warning/25 text-foreground" },
  HOMOLOGAR: { label: "En pruebas", tone: "bg-muted text-foreground/80" },
  SERVIDOR_PRUEBAS: { label: "En pruebas", tone: "bg-muted text-foreground/80" },
  PRODUCCION: { label: "Con validez", tone: "bg-primary/10 text-primary" },
} as const;

/** En qué punto de la ruta a SUNAT está: lo que se mira para saber a quién hay que terminar de configurar. */
function BillingStage({ client }: { client: Client }) {
  const billing = client.facturacion;
  if (!billing) {
    return <p className="text-sm text-muted-foreground">Sin empresa</p>;
  }
  const { label, tone } = BILLING_STAGES[billing.etapa];
  const detail =
    billing.etapa === "CONFIGURAR"
      ? `Falta: ${billing.pendientes.join(", ")}`
      : billing.etapa === "HOMOLOGAR"
        ? "Falta homologar"
        : billing.etapa === "SERVIDOR_PRUEBAS"
          ? "Homologado; este servidor es de pruebas"
          : "Emite en SUNAT";

  return (
    <>
      <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", tone)}>
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
        {label}
      </span>
      <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{detail}</p>
    </>
  );
}

export function ClientsTable({ clients, initialFilter }: { clients: Client[]; initialFilter?: string }) {
  const [filter, setFilterState] = useState<FilterKey>(
    FILTERS.some((item) => item.key === initialFilter) ? (initialFilter as FilterKey) : "todos",
  );

  // El filtro vive en la URL (sin recargar): se puede compartir y los atajos del resumen caen ya filtrados.
  function setFilter(next: FilterKey) {
    setFilterState(next);
    window.history.replaceState(null, "", next === "todos" ? "/plataforma/clientes" : `?estado=${next}`);
  }
  const [search, setSearch] = useState("");
  const router = useRouter();

  const counts = useMemo(() => {
    const byKey: Record<string, number> = { todos: clients.length };
    for (const client of clients) {
      const key = statusOf(client).key;
      byKey[key] = (byKey[key] ?? 0) + 1;
    }
    return byKey;
  }, [clients]);

  // Primero los que necesitan atención (prueba vencida, por vencer, suspendidos); el resto conserva su orden.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return clients
      .filter((client) => {
        const matchesSearch =
          !term ||
          [client.nombre, client.slug, client.ruc, client.razon_social, client.contacto.correo, client.contacto.nombre]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(term));

        return matchesSearch && (filter === "todos" || statusOf(client).key === filter);
      })
      .map((client, index) => ({ client, index }))
      .sort((a, b) => Number(needsAttention(b.client)) - Number(needsAttention(a.client)) || a.index - b.index)
      .map(({ client }) => client);
  }, [clients, search, filter]);

  return (
    <Card className="overflow-hidden border-border bg-card shadow-xs">
      <div className="flex flex-col gap-3 border-b border-border/70 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar clientes por estado">
          {FILTERS.map((item) => {
            const selected = filter === item.key;

            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter(item.key)}
                className={cn(
                  "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full px-3.5 text-sm font-medium outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ring/40",
                  selected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/80 hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {item.label}
                <span className={cn("text-[13px] tabular-nums", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {counts[item.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full lg:w-80">
          <Search aria-hidden className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RUC o correo"
            aria-label="Buscar clientes"
            className="px-9 text-sm"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {visible.length} {visible.length === 1 ? "cliente" : "clientes"}
      </p>

      {visible.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[32%]">Restaurante</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Facturación</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead className="text-right">Usuarios</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Abrir</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((client) => (
              <TableRow
                key={client.id}
                className="group cursor-pointer"
                onClick={(event) => {
                  if (!(event.target as HTMLElement).closest("a,button")) router.push(`/plataforma/clientes/${client.slug}`);
                }}
              >
                <TableCell>
                  <Link
                    href={`/plataforma/clientes/${client.slug}`}
                    className="block truncate text-[15px] font-semibold text-foreground transition-colors group-hover:text-primary"
                  >
                    {client.nombre}
                  </Link>
                  <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                    RUC <span className="tabular-nums">{client.ruc ?? "sin registrar"}</span>
                    <span aria-hidden> · </span>
                    {client.origen === "PRUEBA_WEB" ? "Prueba web" : "Alta directa"}
                  </p>
                </TableCell>
                <TableCell>
                  <ClientStatus client={client} />
                </TableCell>
                <TableCell>
                  <p className="text-sm text-foreground/80">{client.plan ?? "Sin plan"}</p>
                  <Remaining client={client} />
                </TableCell>
                <TableCell className="max-w-[14rem] whitespace-normal">
                  <BillingStage client={client} />
                </TableCell>
                <TableCell>
                  <p className="truncate text-sm font-medium text-foreground">{client.contacto.nombre ?? "Sin nombre"}</p>
                  <p className="truncate text-[13px] text-muted-foreground">{client.contacto.correo ?? "Sin correo"}</p>
                </TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums text-foreground">{client.usuarios}</TableCell>
                <TableCell className="text-right">
                  <ChevronRight aria-hidden className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyPanel
          tone="neutral"
          icon={SearchX}
          title="Ningún cliente coincide"
          description="Prueba con otro nombre, RUC o correo, o quita el filtro de estado."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setFilter("todos");
              }}
            >
              Limpiar filtros
            </Button>
          }
        />
      )}
    </Card>
  );
}
