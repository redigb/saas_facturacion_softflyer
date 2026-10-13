"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest } from "@/lib/browser-api";
import { cashSessionSchema, cashSummarySchema, chargeResultSchema, closedSessionSchema, movementSchema, paymentMethodSchema, receiptSchema } from "@/lib/schemas/caja";
import { dataOf } from "@/lib/schemas/carta";
import { orderSummarySchema, type OrderSummary } from "@/lib/schemas/pedidos";

export const cashKeys = {
  session: ["caja", "sesion"] as const,
  summary: (id: number) => ["caja", "resumen", id] as const,
  billable: ["caja", "por-cobrar"] as const,
  methods: ["caja", "metodos-pago"] as const,
  receipts: (sessionId: number) => ["caja", "comprobantes", sessionId] as const,
};

/** El turno abierto del usuario, o null si no abrió caja. */
export function useCashSession() {
  return useQuery({
    queryKey: cashKeys.session,
    queryFn: async () => (await apiRequest("sesiones-caja/actual", dataOf(cashSessionSchema.nullable()))).data,
  });
}

export function useCashSummary(sessionId: number | null) {
  return useQuery({
    queryKey: cashKeys.summary(sessionId ?? 0),
    queryFn: async () => (await apiRequest(`sesiones-caja/${sessionId}/resumen`, dataOf(cashSummarySchema))).data,
    enabled: sessionId !== null,
  });
}

/** Pedidos que pidieron la cuenta. Se renueva con los avisos en vivo; sin ellos, cada 15 s. */
export function useBillableOrders(enabled: boolean, live: boolean) {
  return useQuery({
    queryKey: cashKeys.billable,
    queryFn: async () => (await apiRequest("pedidos/por-cobrar", dataOf(z.array(orderSummarySchema)))).data,
    enabled,
    refetchInterval: live ? false : 15_000,
  });
}

/** Comprobantes del turno, para reimprimir (spec 010). */
export function useReceipts(sessionId: number) {
  return useQuery({
    queryKey: cashKeys.receipts(sessionId),
    queryFn: async () => (await apiRequest(`comprobantes?sesion_caja_id=${sessionId}`, dataOf(z.array(receiptSchema)))).data,
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: cashKeys.methods,
    queryFn: async () => (await apiRequest("metodos-pago", dataOf(z.array(paymentMethodSchema)))).data,
    staleTime: Infinity,
  });
}

export function useOpenCash() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (amount: string) => apiRequest("sesiones-caja", dataOf(cashSessionSchema), { method: "POST", body: { monto_apertura: amount } }),
    onSuccess: ({ data }) => queryClient.setQueryData(cashKeys.session, data),
  });
}

export function useCashMovement(sessionId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { tipo: "INGRESO" | "EGRESO"; monto: string; concepto: string }) =>
      apiRequest(`sesiones-caja/${sessionId}/movimientos`, dataOf(movementSchema), { method: "POST", body }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: cashKeys.summary(sessionId) }),
  });
}

export function useCloseCash(sessionId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (declared: string) =>
      apiRequest(`sesiones-caja/${sessionId}/cierre`, dataOf(closedSessionSchema), { method: "POST", body: { monto_cierre_declarado: declared } }),
    onSuccess: () => queryClient.setQueryData(cashKeys.session, null),
  });
}

type ChargeBody = {
  detalle_ids?: number[];
  version?: number;
  cliente?: { tipo_documento: "DNI" | "RUC"; numero: string; nombre?: string };
  pagos: { metodo_pago_id: number; monto: string; monto_recibido?: string; referencia?: string }[];
};

/**
 * Cobrar. La clave la genera quien llama y la conserva mientras el cuerpo no cambie:
 * si la red falla, el reintento usa la misma y no se cobra doble (Doc. 07 §5).
 */
export function useChargeOrder(orderId: number, sessionId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, key }: { body: ChargeBody; key: string }) =>
      apiRequest(`pedidos/${orderId}/cobro`, dataOf(chargeResultSchema), { method: "POST", body, headers: { "Idempotency-Key": key } }),
    onSuccess: ({ data }) => {
      if (data.pedido.estado === "CERRADO") {
        queryClient.setQueryData<OrderSummary[]>(cashKeys.billable, (list) => list?.filter((order) => order.id !== orderId));
      }
      void queryClient.invalidateQueries({ queryKey: cashKeys.billable });
      void queryClient.invalidateQueries({ queryKey: ["pedidos", orderId] });
      void queryClient.invalidateQueries({ queryKey: cashKeys.summary(sessionId) });
      void queryClient.invalidateQueries({ queryKey: cashKeys.receipts(sessionId) });
      void queryClient.invalidateQueries({ queryKey: ["pedidos"], exact: true });
    },
  });
}
