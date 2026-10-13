"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { useToast } from "@/app/panel/providers";
import { apiRequest } from "@/lib/browser-api";
import { dataOf } from "@/lib/schemas/carta";
import { ticketSchema, type KitchenState, type Ticket } from "@/lib/schemas/cocina";

export type Station = number | "general";

export const boardKey = (station: Station) => ["cocina", String(station)] as const;

/** Comandas activas de la estación. Si el tiempo real está caído, se repide cada 15 s. */
export function useBoard(station: Station | null, live: boolean) {
  return useQuery({
    queryKey: boardKey(station ?? "general"),
    queryFn: async () => (await apiRequest(`cocina/comandas?estacion_id=${station}`, dataOf(z.array(ticketSchema)))).data,
    enabled: station !== null,
    refetchInterval: live ? false : 15_000,
  });
}

type Change = { kind: "item"; itemId: number; state: KitchenState } | { kind: "ticket"; ticketId: number };

/** Toques del cocinero: el plato cambia en 0 ms y se revierte con aviso si la API lo rechaza. */
export function useKitchenChange(station: Station) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const key = boardKey(station);

  return useMutation({
    mutationFn: (change: Change) =>
      change.kind === "item"
        ? apiRequest(`cocina/detalles/${change.itemId}`, dataOf(ticketSchema), { method: "PATCH", body: { estado_cocina: change.state } })
        : apiRequest(`cocina/comandas/${change.ticketId}/listo`, dataOf(ticketSchema), { method: "POST" }),
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Ticket[]>(key);
      queryClient.setQueryData<Ticket[]>(key, (tickets = []) => tickets.map((ticket) => applyChange(ticket, change)));
      return { previous };
    },
    onError: (error, _, context) => {
      queryClient.setQueryData(key, context?.previous);
      toast({ tone: "error", message: error instanceof Error ? error.message : "No se pudo actualizar." });
    },
    onSuccess: ({ data }) => {
      queryClient.setQueryData<Ticket[]>(key, (tickets = []) => tickets.map((ticket) => (ticket.id === data.id ? data : ticket)));
    },
  });
}

/** El mozo marca un plato listo como entregado (spec 007). */
export function useDeliver(orderId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => apiRequest(`cocina/detalles/${itemId}`, dataOf(ticketSchema), { method: "PATCH", body: { estado_cocina: "ENTREGADO" } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pedidos", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["pedidos"], exact: true });
    },
  });
}

/** La comanda salió del diálogo de impresión del navegador (spec 027). */
export function usePrintTicket(station: Station) {
  const queryClient = useQueryClient();
  const key = boardKey(station);

  return useMutation({
    mutationFn: (ticketId: number) => apiRequest(`cocina/comandas/${ticketId}/impresa`, dataOf(ticketSchema), { method: "POST" }),
    onSuccess: ({ data }) => {
      queryClient.setQueryData<Ticket[]>(key, (tickets = []) => tickets.map((ticket) => (ticket.id === data.id ? data : ticket)));
    },
  });
}

function applyChange(ticket: Ticket, change: Change): Ticket {
  const detalles = ticket.detalles.map((item) => {
    if (item.anulado) return item;
    if (change.kind === "item") return item.id === change.itemId ? { ...item, estado_cocina: change.state } : item;
    if (change.ticketId !== ticket.id) return item;
    return item.estado_cocina === "PENDIENTE" || item.estado_cocina === "EN_PREPARACION" ? { ...item, estado_cocina: "LISTO" as const } : item;
  });
  const completa = !detalles.some((item) => !item.anulado && (item.estado_cocina === "PENDIENTE" || item.estado_cocina === "EN_PREPARACION"));
  return { ...ticket, detalles, completa };
}
