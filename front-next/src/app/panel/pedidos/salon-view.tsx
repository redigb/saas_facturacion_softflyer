"use client";

import { useQueries } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Skeleton } from "@/app/panel/carta/ui";
import { useActiveOrders, useOpenOrder } from "@/app/panel/pedidos/queries";
import { minutesSince, useNow } from "@/app/panel/pedidos/use-now";
import { fetchPlan, keys as floorKeys, useRooms } from "@/app/panel/plano/queries";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { Button, EmptyState } from "@/components/ui";
import { ApiRequestError } from "@/lib/browser-api";
import type { OrderSummary } from "@/lib/schemas/pedidos";
import type { PlanTable } from "@/lib/schemas/plano";

const STATUS = {
  LIBRE: { label: "Libre", card: "border-slate-200 bg-white text-tinta" },
  OCUPADA: { label: "Ocupada", card: "border-azul bg-azul text-white" },
  POR_COBRAR: { label: "Por cobrar", card: "border-amarillo bg-amarillo/30 text-tinta" },
  BLOQUEADA: { label: "Bloqueada", card: "border-slate-200 bg-slate-100 text-slate-400" },
} as const;

/**
 * Vista del mozo: mesas como botones grandes por salón (spec 006). Un toque en una mesa
 * libre abre el pedido; en una ocupada, entra a su pedido.
 */
export function SalonView() {
  const router = useRouter();
  const toast = useToast();
  const now = useNow();
  const rooms = useRooms();
  const orders = useActiveOrders();
  const open = useOpenOrder();
  const [opening, setOpening] = useState<number | "llevar" | null>(null);

  const activeRooms = (rooms.data ?? []).filter((room) => room.es_activo).sort((a, b) => a.orden - b.orden);
  const plans = useQueries({
    queries: activeRooms.map((room) => ({ queryKey: floorKeys.plan(room.id), queryFn: () => fetchPlan(room.id) })),
  });

  const byTable = new Map<number, OrderSummary>();
  for (const order of orders.data ?? []) if (order.mesa) byTable.set(order.mesa.id, order);
  const takeAway = (orders.data ?? []).filter((order) => order.tipo === "PARA_LLEVAR");

  async function start(body: { tipo: "SALON" | "PARA_LLEVAR"; mesa_id?: number }, marker: number | "llevar") {
    if (opening !== null) return;
    setOpening(marker);
    try {
      const { data } = await open.mutateAsync(body);
      router.push(`/panel/pedidos/${data.id}`);
    } catch (error) {
      // Otro mozo se adelantó: se entra a su pedido en vez de mostrar un error.
      const existing = error instanceof ApiRequestError && error.codigo === "MESA_OCUPADA" ? (error.detalles as unknown as { pedido_id?: number })?.pedido_id : undefined;
      if (existing) router.push(`/panel/pedidos/${existing}`);
      else toast({ tone: "error", message: error instanceof Error ? error.message : "No se pudo abrir el pedido." });
      setOpening(null);
    }
  }

  function tap(table: PlanTable) {
    const order = byTable.get(table.id);
    if (order) router.push(`/panel/pedidos/${order.id}`);
    else if (table.estado !== "BLOQUEADA") void start({ tipo: "SALON", mesa_id: table.id }, table.id);
  }

  if (rooms.isPending || orders.isPending) {
    return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6" aria-busy="true">
        {Array.from({ length: 12 }, (_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Pedidos</h1>
          <p className="mt-1 text-sm text-slate-500">Toca una mesa libre para abrir su pedido.</p>
        </div>
        <Button size="lg" onClick={() => void start({ tipo: "PARA_LLEVAR" }, "llevar")} isLoading={opening === "llevar"}>
          <Icon name="mas" className="h-5 w-5" />
          Para llevar
        </Button>
      </div>

      {takeAway.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase">Para llevar</h2>
          <ul className="mt-2 flex gap-3 overflow-x-auto pb-1 touch-pan-x">
            {takeAway.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/panel/pedidos/${order.id}`)}
                  className="flex min-h-20 min-w-36 flex-col items-start justify-center rounded-2xl border-2 border-azul bg-white px-4 py-2 text-left transition-all active:scale-[0.97]"
                >
                  <span className="text-lg font-bold text-tinta">#{order.numero}</span>
                  <span className="text-sm text-slate-500 tabular-nums">S/ {order.total} · {minutesSince(order.abierto_en, now)} min</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeRooms.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon="plano"
          title="Todavía no hay mesas"
          description="El administrador debe dibujar el plano del local. Mientras tanto puedes tomar pedidos para llevar."
        />
      ) : (
        activeRooms.map((room, index) => {
          const plan = plans[index];
          const tables = [...(plan.data?.mesas ?? [])].sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));

          return (
            <section key={room.id} className="mt-6">
              <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase">{room.nombre}</h2>
              {plan.isPending ? (
                <Skeleton className="mt-2 h-28" />
              ) : (
                <ul className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {tables.map((table) => {
                    const order = byTable.get(table.id);
                    // Sin pedido activo la mesa está libre: el estado guardado en el plano puede estar desactualizado (spec 008).
                    const state = order ? (order.estado === "POR_COBRAR" ? "POR_COBRAR" : "OCUPADA") : table.estado === "BLOQUEADA" ? "BLOQUEADA" : "LIBRE";
                    const style = STATUS[state];

                    return (
                      <li key={table.id}>
                        <button
                          type="button"
                          onClick={() => tap(table)}
                          disabled={opening !== null || state === "BLOQUEADA"}
                          aria-label={`Mesa ${table.codigo}, ${style.label}${order ? `, pedido ${order.numero}` : ""}`}
                          className={`flex h-28 w-full flex-col items-center justify-center gap-0.5 rounded-2xl border-2 p-2 transition-all active:scale-[0.97] disabled:opacity-60 ${style.card}`}
                        >
                          <span className="text-2xl font-bold">{table.codigo}</span>
                          {order ? (
                            <>
                              <span className="text-xs font-semibold opacity-90 tabular-nums">
                                #{order.numero} · {minutesSince(order.abierto_en, now)} min
                              </span>
                              <span className="text-sm font-bold tabular-nums">S/ {order.total}</span>
                              {order.listos > 0 && <span className="mt-0.5 rounded-full bg-emerald-500 px-2 text-[11px] font-bold text-white">{order.listos} listo{order.listos > 1 ? "s" : ""}</span>}
                            </>
                          ) : (
                            <span className="text-xs font-semibold opacity-70">
                              {opening === table.id ? "Abriendo…" : `${style.label} · ${table.capacidad} pers.`}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
