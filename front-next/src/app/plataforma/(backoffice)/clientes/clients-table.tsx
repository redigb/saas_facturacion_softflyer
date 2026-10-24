"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Search, ArrowUpRight, Building2, User, X, SearchX } from "lucide-react";

import type { Client } from "@/app/plataforma/types";
import { ClientStatus, formatDate, statusOf } from "@/app/plataforma/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyPanel } from "@/components/backoffice/molecules/notice";

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "prueba", label: "En prueba" },
  { key: "vencidas", label: "Pruebas vencidas" },
  { key: "pago", label: "De pago" },
  { key: "suspendidos", label: "Suspendidos" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

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

  const visible = clients.filter((client) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      [client.nombre, client.slug, client.ruc, client.razon_social, client.contacto.correo, client.contacto.nombre]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));

    return matchesSearch && (filter === "todos" || statusOf(client).key === filter);
  });

  return (
    <Card className="mt-8 overflow-hidden border-border shadow-sm">
      {/* Controls Bar */}
      <div className="flex flex-col gap-4 border-b border-border/60 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar clientes por estado">
          {FILTERS.map((item) => {
            const isSelected = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setFilter(item.key)}
                className={`inline-flex items-center gap-1.5 cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold outline-none transition-all focus-visible:ring-4 focus-visible:ring-ring/40 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-muted/80 text-foreground/70 hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${
                    isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-card text-muted-foreground"
                  }`}
                >
                  {counts[item.key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, RUC o email…"
            aria-label="Buscar clientes"
            className="px-9 text-xs"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {visible.length} {visible.length === 1 ? "cliente" : "clientes"}
      </p>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[30%]">Restaurante</TableHead>
            <TableHead>RUC</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Plan / Suscripción</TableHead>
            <TableHead>Contacto</TableHead>
            <TableHead className="text-right">Usuarios</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((client) => (
            <TableRow key={client.id} className="group cursor-pointer" onClick={(event) => { if (!(event.target as HTMLElement).closest("a,button")) router.push(`/plataforma/clientes/${client.slug}`); }}>
              <TableCell className="font-medium">
                <Link
                  href={`/plataforma/clientes/${client.slug}`}
                  className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <Building2 className="h-4 w-4 text-muted-foreground/70 group-hover:text-primary shrink-0" />
                  <span className="truncate">{client.nombre}</span>
                </Link>
                <p className="mt-0.5 text-xs text-muted-foreground/70 pl-5.5">
                  <span className="font-mono">{client.slug}</span> ·{" "}
                  {client.origen === "PRUEBA_WEB" ? "Prueba web" : "Alta directa"}
                </p>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs font-semibold text-foreground/70 bg-muted px-2 py-0.5 rounded-md">
                  {client.ruc ?? "—"}
                </span>
              </TableCell>
              <TableCell>
                <ClientStatus client={client} />
              </TableCell>
              <TableCell>
                <div className="text-sm font-semibold text-foreground/70">{client.plan ?? "—"}</div>
                {client.suscripcion && (
                  <p className="text-xs text-muted-foreground/70">
                    Vence {formatDate(client.suscripcion.fecha_vencimiento)}
                  </p>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground/70">
                  <User className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                  <span>{client.contacto.nombre}</span>
                </div>
                <p className="text-xs text-muted-foreground/70 pl-5">{client.contacto.correo}</p>
              </TableCell>
              <TableCell className="text-right font-extrabold text-foreground tabular-nums">
                {client.usuarios}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-muted-foreground/70 group-hover:text-primary">
                  <Link href={`/plataforma/clientes/${client.slug}`} aria-label={`Ver ${client.nombre}`}>
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {visible.length === 0 && (
        <EmptyPanel
          tone="neutral"
          icon={SearchX}
          title="No se encontraron clientes"
          description="Prueba con otro término de búsqueda o quita el filtro."
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
