"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Client } from "@/app/plataforma/types";
import { ClientStatus, formatDate, statusOf } from "@/app/plataforma/ui";

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "prueba", label: "En prueba" },
  { key: "vencidas", label: "Pruebas vencidas" },
  { key: "pago", label: "De pago" },
  { key: "suspendidos", label: "Suspendidos" },
] as const;

export function ClientsTable({ clients }: { clients: Client[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("todos");
  const [search, setSearch] = useState("");

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
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar clientes">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={filter === item.key}
              onClick={() => setFilter(item.key)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                filter === item.key ? "bg-azul text-white" : "bg-niebla text-slate-600 hover:text-azul"
              }`}
            >
              {item.label} <span className="opacity-70">{counts[item.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, RUC o correo…"
          aria-label="Buscar clientes"
          className="ml-auto w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-azul focus:ring-4 focus:ring-celeste/25 sm:w-72"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-niebla text-xs font-bold tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Restaurante</th>
              <th className="px-4 py-3">RUC</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Plan · vence</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3 text-right">Usuarios</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((client) => (
              <tr key={client.id} className="hover:bg-niebla/60">
                <td className="px-4 py-3">
                  <Link href={`/plataforma/clientes/${client.slug}`} className="font-bold text-tinta hover:text-azul">
                    {client.nombre}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {client.slug} · {client.origen === "PRUEBA_WEB" ? "Prueba web" : "Alta manual"}
                  </p>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{client.ruc ?? "—"}</td>
                <td className="px-4 py-3">
                  <ClientStatus client={client} />
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {client.plan ?? "—"}
                  {client.suscripcion && <p className="text-xs text-slate-500">{formatDate(client.suscripcion.fecha_vencimiento)}</p>}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {client.contacto.nombre}
                  <p className="text-xs text-slate-500">{client.contacto.correo}</p>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-tinta">{client.usuarios}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No hay clientes con ese filtro.</p>}
      </div>
    </div>
  );
}
