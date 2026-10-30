"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/lib/browser-api";
import { receiptPageSchema } from "@/lib/schemas/caja";

export type BillingFilters = {
  desde: string;
  hasta: string;
  tipo: "" | "BOLETA" | "FACTURA";
  estado: "" | "ACEPTADOS" | "EN_PROCESO" | "CON_PROBLEMAS" | "SIMULADOS";
  buscar: string;
  pagina: number;
};

/** Historial de comprobantes (spec 037). Mantiene la página anterior mientras llega la siguiente. */
export function useReceiptHistory(filters: BillingFilters) {
  const params = new URLSearchParams({ pagina: String(filters.pagina), por_pagina: "20" });
  if (filters.desde) params.set("desde", filters.desde);
  if (filters.hasta) params.set("hasta", filters.hasta);
  if (filters.tipo) params.set("tipo", filters.tipo);
  if (filters.estado) params.set("estado", filters.estado);
  if (filters.buscar.trim()) params.set("buscar", filters.buscar.trim());

  return useQuery({
    queryKey: ["facturacion", "historial", params.toString()],
    queryFn: () => apiRequest(`comprobantes/historial?${params.toString()}`, receiptPageSchema),
    placeholderData: keepPreviousData,
  });
}
