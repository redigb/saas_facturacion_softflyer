"use client";

import { useEffect, useState } from "react";

import { ReceiptTicket } from "@/app/panel/caja/receipt-ticket";
import { inputClass, Skeleton } from "@/app/panel/carta/ui";
import { useReceiptHistory, type BillingFilters } from "@/app/panel/facturacion/queries";
import { Icon } from "@/components/icons";
import { Button, CustomSelect, EmptyState, SearchInput, SegmentedControl } from "@/components/ui";
import { ApiRequestError } from "@/lib/browser-api";
import type { Receipt } from "@/lib/schemas/caja";

const todayInLima = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const STATUS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "ACEPTADOS", label: "Aceptados por SUNAT" },
  { value: "EN_PROCESO", label: "En proceso" },
  { value: "CON_PROBLEMAS", label: "Rechazados o vencidos" },
  { value: "SIMULADOS", label: "Simulados" },
];

type Tone = "ok" | "wait" | "bad" | "muted";

const TONE_CLASS: Record<Tone, string> = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  wait: "bg-amber-50 text-amber-800 ring-amber-200",
  bad: "bg-red-50 text-red-700 ring-red-200",
  muted: "bg-slate-100 text-slate-600 ring-slate-200",
};

/** Estado ante SUNAT en lenguaje simple: con texto, no solo color. */
function sunatStatus(receipt: Receipt): { label: string; tone: Tone } {
  if (receipt.es_simulado) return { label: "Simulado", tone: "muted" };
  switch (receipt.estado) {
    case "ACEPTADO":
      return { label: "Aceptado", tone: "ok" };
    case "OBSERVADO":
      return { label: "Observado", tone: "wait" };
    case "RECHAZADO":
      return { label: "Rechazado", tone: "bad" };
    case "VENCIDO":
      return { label: "Vencido", tone: "bad" };
    default:
      return { label: "En proceso", tone: "wait" };
  }
}

function initialFilters(): BillingFilters {
  const today = todayInLima();
  return { desde: today, hasta: today, tipo: "", estado: "", buscar: "", pagina: 1 };
}

/** Pantalla "Facturación" (spec 037): historial, estado ante SUNAT, reimpresión y descargas. */
export function BillingView() {
  const [filters, setFilters] = useState<BillingFilters>(initialFilters);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Receipt | null>(null);
  const history = useReceiptHistory(filters);

  // La búsqueda espera a que el usuario deje de escribir.
  useEffect(() => {
    const timer = window.setTimeout(() => setFilters((current) => (current.buscar === search ? current : { ...current, buscar: search, pagina: 1 })), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const update = (patch: Partial<BillingFilters>) => setFilters((current) => ({ ...current, ...patch, pagina: patch.pagina ?? 1 }));
  const reset = () => {
    setSearch("");
    setFilters(initialFilters());
  };

  const receipts = history.data?.data ?? [];
  const meta = history.data?.meta;

  return (
    <div className="space-y-6 pb-12">
      <header>
        <h1 className="text-2xl font-black tracking-tight text-tinta sm:text-3xl">Facturación</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">Tus boletas y facturas, su estado ante SUNAT y sus archivos.</p>
      </header>

      <section aria-label="Filtros" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-[auto_auto_1fr_220px]">
        <div className="flex gap-2">
          <label className="flex-1 text-xs font-bold text-slate-500">
            Desde
            <input type="date" className={`${inputClass} mt-1`} value={filters.desde} max={filters.hasta || undefined} onChange={(event) => update({ desde: event.target.value })} />
          </label>
          <label className="flex-1 text-xs font-bold text-slate-500">
            Hasta
            <input type="date" className={`${inputClass} mt-1`} value={filters.hasta} min={filters.desde || undefined} onChange={(event) => update({ hasta: event.target.value })} />
          </label>
        </div>
        <SegmentedControl
          className="self-end"
          value={filters.tipo || "TODOS"}
          onChange={(value) => update({ tipo: value === "TODOS" ? "" : value })}
          options={[
            { value: "TODOS", label: "Todos" },
            { value: "BOLETA", label: "Boletas" },
            { value: "FACTURA", label: "Facturas" },
          ]}
        />
        <SearchInput className="self-end" value={search} onChange={setSearch} placeholder="Número, DNI/RUC o cliente" aria-label="Buscar comprobante" />
        <CustomSelect className="self-end" value={filters.estado} onChange={(value) => update({ estado: value as BillingFilters["estado"] })} options={STATUS_OPTIONS} placeholder="Todos los estados" />
      </section>

      {history.isPending ? (
        <ListSkeleton />
      ) : history.isError ? (
        <LoadError error={history.error} onRetry={() => void history.refetch()} />
      ) : receipts.length === 0 ? (
        <EmptyState icon="facturacion" title="No hay comprobantes en estas fechas" description="Prueba con otro rango o limpia los filtros." actionLabel="Limpiar filtros" actionIcon="cerrar" onAction={reset} />
      ) : (
        <div className={history.isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <ReceiptTable receipts={receipts} onOpen={setSelected} />
          <ReceiptCards receipts={receipts} onOpen={setSelected} />
          {meta && meta.ultima_pagina > 1 ? (
            <nav aria-label="Páginas" className="mt-4 flex items-center justify-between gap-3">
              <Button variant="secondary" disabled={meta.pagina_actual <= 1} onClick={() => update({ pagina: meta.pagina_actual - 1 })}>
                Anterior
              </Button>
              <span className="text-sm font-medium text-slate-500 tabular-nums">
                Página {meta.pagina_actual} de {meta.ultima_pagina} · {meta.total} comprobantes
              </span>
              <Button variant="secondary" disabled={meta.pagina_actual >= meta.ultima_pagina} onClick={() => update({ pagina: meta.pagina_actual + 1 })}>
                Siguiente
              </Button>
            </nav>
          ) : null}
        </div>
      )}

      {selected ? <ReceiptDetail receipt={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

const formatDate = (iso: string) => new Date(iso).toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "short", timeStyle: "short" });

function StatusBadge({ receipt }: { receipt: Receipt }) {
  const status = sunatStatus(receipt);
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${TONE_CLASS[status.tone]}`}>{status.label}</span>;
}

function ReceiptTable({ receipts, onOpen }: { receipts: Receipt[]; onOpen: (receipt: Receipt) => void }) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-bold tracking-wide text-slate-500 uppercase">
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Número</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {receipts.map((receipt) => (
            <tr
              key={receipt.id}
              tabIndex={0}
              onClick={() => onOpen(receipt)}
              onKeyDown={(event) => event.key === "Enter" && onOpen(receipt)}
              className="cursor-pointer transition-colors hover:bg-niebla focus-visible:bg-niebla focus-visible:outline-none"
            >
              <td className="px-4 py-3 text-slate-500 tabular-nums">{formatDate(receipt.emitido_en)}</td>
              <td className="px-4 py-3 font-bold text-tinta tabular-nums">
                {receipt.numero}
                <span className="ml-2 text-xs font-medium text-slate-400">{receipt.tipo === "FACTURA" ? "Factura" : "Boleta"}</span>
              </td>
              <td className="px-4 py-3 text-tinta">
                <span className="block truncate">{receipt.cliente.nombre}</span>
                {receipt.cliente.numero ? <span className="text-xs text-slate-400 tabular-nums">{receipt.cliente.numero}</span> : null}
              </td>
              <td className="px-4 py-3 text-right font-bold text-tinta tabular-nums">S/ {receipt.total}</td>
              <td className="px-4 py-3">
                <StatusBadge receipt={receipt} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReceiptCards({ receipts, onOpen }: { receipts: Receipt[]; onOpen: (receipt: Receipt) => void }) {
  return (
    <ul className="grid gap-3 md:hidden">
      {receipts.map((receipt) => (
        <li key={receipt.id}>
          <button type="button" onClick={() => onOpen(receipt)} className="flex w-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all active:scale-[0.98]">
            <div className="flex w-full items-start justify-between gap-2">
              <span className="font-black text-tinta tabular-nums">{receipt.numero}</span>
              <StatusBadge receipt={receipt} />
            </div>
            <span className="truncate text-sm text-slate-600">{receipt.cliente.nombre}</span>
            <div className="flex w-full items-end justify-between">
              <span className="text-xs text-slate-400 tabular-nums">{formatDate(receipt.emitido_en)}</span>
              <span className="text-lg font-black text-tinta tabular-nums">S/ {receipt.total}</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Ticket del comprobante con su estado; el mensaje de SUNAT se muestra si lo observó o rechazó. */
function ReceiptDetail({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  const status = sunatStatus(receipt);

  return (
    <ReceiptTicket receipt={receipt} onClose={onClose} downloads>
      <div className={`mb-4 rounded-xl px-3.5 py-3 text-sm ring-1 ${TONE_CLASS[status.tone]}`}>
        <p className="font-bold">
          {status.label}
          {receipt.sucursal ? <span className="font-medium"> · {receipt.sucursal}</span> : null}
        </p>
        {status.tone === "wait" && !receipt.mensaje_sunat ? <p className="mt-0.5">SUNAT aún no responde. Se reintenta solo; no hace falta volver a emitirlo.</p> : null}
        {receipt.mensaje_sunat && status.tone !== "ok" ? <p className="mt-0.5">{receipt.mensaje_sunat}</p> : null}
      </div>
    </ReceiptTicket>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Cargando comprobantes">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

function LoadError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const forbidden = error instanceof ApiRequestError && error.status === 403;

  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50/60 p-8 text-center">
      <Icon name="alerta" className="h-8 w-8 text-red-500" />
      <p className="font-bold text-tinta">{forbidden ? "No tienes acceso a facturación" : "No pudimos cargar los comprobantes"}</p>
      {forbidden ? null : (
        <>
          <p className="text-sm text-slate-500">{error.message}</p>
          <Button variant="secondary" onClick={onRetry}>
            Reintentar
          </Button>
        </>
      )}
    </div>
  );
}
