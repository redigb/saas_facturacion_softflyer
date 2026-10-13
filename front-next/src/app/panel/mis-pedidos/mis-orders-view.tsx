"use client";

import { useRouter } from "next/navigation";

import { useActiveOrders } from "@/app/panel/pedidos/queries";
import { minutesSince, useNow } from "@/app/panel/pedidos/use-now";
import { Skeleton } from "@/app/panel/carta/ui";
import { Button, EmptyState } from "@/components/ui";

/**
 * Mis órdenes (spec 024): los pedidos activos que abrió este usuario, para retomarlos.
 * Se alimenta de la misma lista en vivo que el salón (PedidoActualizado la mantiene al día).
 */
export function MisOrdersView({ userId }: { userId: number | null }) {
  const router = useRouter();
  const now = useNow();
  const orders = useActiveOrders();

  const mine = (orders.data ?? []).filter((order) => order.mozo?.id === userId);

  if (orders.isPending) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="h-9 w-56 animate-pulse rounded-xl bg-slate-200" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (orders.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-bold">No pudimos cargar tus órdenes.</p>
        <p className="mt-1 text-sm">{orders.error.message}</p>
        <Button variant="secondary" onClick={() => void orders.refetch()} className="mt-4">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-tinta sm:text-3xl">Mis órdenes</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Tus pedidos activos, en orden. Toca uno para seguir atendiéndolo.
        </p>
      </div>

      {mine.length === 0 ? (
        <EmptyState
          icon="pedidos"
          title="No tienes órdenes activas"
          description="Cuando abras una mesa o un pedido para llevar, aparecerá aquí para que lo retomes rápido."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((order) => (
            <li key={order.id}>
              <button
                type="button"
                onClick={() => router.push(`/panel/pedidos/${order.id}`)}
                className="group flex h-28 w-full flex-col justify-between rounded-2xl border-2 border-slate-200/90 bg-white p-4 text-left transition-all hover:border-azul/80 hover:shadow-xs active:scale-[0.98]"
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="min-w-0 truncate text-lg font-black tracking-tight text-tinta transition-colors group-hover:text-azul">
                    {order.mesa ? `Mesa ${order.mesa.codigo}` : "Para llevar"}{" "}
                    <span className="text-slate-400">#{order.numero}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${
                      order.estado === "POR_COBRAR" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-azul"
                    }`}
                  >
                    {order.estado === "POR_COBRAR" ? "Por cobrar" : "Abierta"}
                  </span>
                </div>
                <div className="flex w-full items-end justify-between">
                  <span className="text-xs font-medium text-slate-400 tabular-nums">
                    {minutesSince(order.abierto_en, now)} min · {order.platos} {order.platos === 1 ? "plato" : "platos"}
                  </span>
                  <span className="text-lg font-black text-tinta tabular-nums">S/ {order.total}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
