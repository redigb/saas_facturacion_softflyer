"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest } from "@/lib/browser-api";
import { dataOf } from "@/lib/schemas/carta";
import { menuSchema, orderSchema, orderSummarySchema, type CartLine, type Order, type OrderSummary } from "@/lib/schemas/pedidos";

export const keys = {
  menu: ["carta"] as const,
  orders: ["pedidos"] as const,
  order: (id: number) => ["pedidos", id] as const,
  overview: (date: string) => ["pedidos", "admin", date] as const,
};

/** La carta se descarga una vez y se renueva con el aviso CartaActualizada (spec 005). */
export function useMenu() {
  return useQuery({
    queryKey: keys.menu,
    queryFn: async () => (await apiRequest("carta", dataOf(menuSchema))).data,
    staleTime: Infinity,
  });
}

export function useActiveOrders() {
  return useQuery({
    queryKey: keys.orders,
    queryFn: async () => (await apiRequest("pedidos", dataOf(z.array(orderSummarySchema)))).data,
    staleTime: 15_000,
  });
}

export function useOrdersOverview(date: string) {
  return useQuery({
    queryKey: keys.overview(date),
    queryFn: async () =>
      (await apiRequest(`pedidos?estado=ABIERTO,POR_COBRAR,CERRADO&fecha=${encodeURIComponent(date)}`, dataOf(z.array(orderSummarySchema)))).data,
    refetchInterval: 15_000,
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: keys.order(id),
    queryFn: async () => (await apiRequest(`pedidos/${id}`, dataOf(orderSchema))).data,
  });
}

/** Abrir pedido: una clave de idempotencia por intento (doble toque = un solo pedido). */
export function useOpenOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { tipo: "SALON" | "PARA_LLEVAR"; mesa_id?: number; mesa_referencia_id?: number; numero_comensales?: number }) =>
      apiRequest("pedidos", dataOf(orderSchema), { method: "POST", body, headers: { "Idempotency-Key": crypto.randomUUID() } }),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(keys.order(data.id), data);
      void queryClient.invalidateQueries({ queryKey: keys.orders, exact: true });
    },
  });
}

/**
 * Enviar a cocina. La clave la genera quien llama y la conserva hasta que el envío
 * termine bien: si la red falla, el reintento usa la misma y la cocina no recibe doble.
 */
export function useSendToKitchen(orderId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lines, key }: { lines: CartLine[]; key: string }) =>
      apiRequest(`pedidos/${orderId}/comandas`, dataOf(orderSchema), {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: {
          items: lines.map((line) => ({
            producto_id: line.producto_id,
            cantidad: line.cantidad,
            notas: line.notas.trim() || null,
            modificador_ids: line.modificador_ids,
          })),
        },
      }),
    onSuccess: ({ data }) => updateOrder(queryClient, data),
  });
}

export function useOrderAction(orderId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ action, body }: { action: "cuenta" | "reabrir" | "anular" | `detalles/${number}/anular`; body?: Record<string, unknown> }) =>
      apiRequest(`pedidos/${orderId}/${action}`, dataOf(orderSchema), { method: "POST", body: body ?? {} }),
    onSuccess: ({ data }) => updateOrder(queryClient, data),
  });
}

function updateOrder(queryClient: ReturnType<typeof useQueryClient>, order: Order) {
  queryClient.setQueryData(keys.order(order.id), order);
  void queryClient.invalidateQueries({ queryKey: keys.orders, exact: true });
  void queryClient.invalidateQueries({ queryKey: ["pedidos", "admin"] });
}

const FINISHED_ORDER_STATES = ["CERRADO", "ANULADO"];

/**
 * Aviso de que otra persona cambió un pedido (spec 008). En vez de recargar la lista completa
 * de pedidos, se quita el cerrado/anulado, se ignora lo que ya se conoce y, si hay algo nuevo,
 * se pide solo ese pedido y se actualizan su detalle y su fila. Si el servidor no responde,
 * la fila queda como estaba y se recupera al reconectar o al volver a la pantalla.
 */
export async function applyOrderEvent(
  queryClient: ReturnType<typeof useQueryClient>,
  event: { pedido_id: number; estado?: string; version?: number },
) {
  const { pedido_id: id } = event;

  if (event.estado && FINISHED_ORDER_STATES.includes(event.estado)) {
    queryClient.setQueryData<OrderSummary[]>(keys.orders, (list) => list?.filter((order) => order.id !== id));
    void queryClient.invalidateQueries({ queryKey: keys.order(id) });
    void queryClient.invalidateQueries({ queryKey: ["pedidos", "admin"] });
    return;
  }

  const known = queryClient.getQueryData<Order>(keys.order(id))?.version ?? queryClient.getQueryData<OrderSummary[]>(keys.orders)?.find((order) => order.id === id)?.version;
  if (event.version !== undefined && known !== undefined && known >= event.version) return;

  try {
    const order = await queryClient.fetchQuery({
      queryKey: keys.order(id),
      queryFn: async () => (await apiRequest(`pedidos/${id}`, dataOf(orderSchema))).data,
      staleTime: 0,
    });
    queryClient.setQueryData<OrderSummary[]>(keys.orders, (list) => (list ? upsertSummary(list, order) : list));
  } catch {
    void queryClient.invalidateQueries({ queryKey: keys.orders, exact: true });
  }
}

function upsertSummary(list: OrderSummary[], order: Order): OrderSummary[] {
  if (FINISHED_ORDER_STATES.includes(order.estado)) return list.filter((item) => item.id !== order.id);

  const items = order.detalles.filter((item) => !item.anulado);
  const summary: OrderSummary = {
    ...orderSummarySchema.omit({ platos: true, pendientes: true, listos: true, detalles_resumen: true }).parse(order),
    platos: items.length,
    pendientes: items.filter((item) => item.estado_cocina === "PENDIENTE" || item.estado_cocina === "EN_PREPARACION").length,
    listos: items.filter((item) => item.estado_cocina === "LISTO").length,
    detalles_resumen: items.map((item) => ({ id: item.id, nombre: item.nombre, cantidad: item.cantidad, subtotal: item.subtotal })),
  };

  return list.some((item) => item.id === order.id)
    ? list.map((item) => (item.id === order.id ? summary : item))
    : [...list, summary].sort((a, b) => a.abierto_en.localeCompare(b.abierto_en));
}
