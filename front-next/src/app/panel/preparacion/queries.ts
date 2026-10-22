"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import type { Station } from "@/app/panel/cocina/queries";
import { apiRequest } from "@/lib/browser-api";
import { dataOf } from "@/lib/schemas/carta";
import { preparationSchema, preparationSummarySchema, type PreparationIngredient } from "@/lib/schemas/preparacion";

const preparationKey = (id: number) => ["preparaciones", "detalle", id] as const;
const listKey = (station: Station) => ["preparaciones", "estacion", String(station)] as const;

export function usePreparations(station: Station | null) {
  return useQuery({
    queryKey: station === null ? ["preparaciones", "sin-estacion"] : listKey(station),
    queryFn: async () => (await apiRequest(`preparaciones?estacion_id=${station}`, dataOf(z.array(preparationSummarySchema)))).data,
    enabled: station !== null,
  });
}

export function usePreparation(productId: number) {
  return useQuery({
    queryKey: preparationKey(productId),
    queryFn: async () => (await apiRequest(`preparaciones/${productId}`, dataOf(preparationSchema))).data,
  });
}

export function useSavePreparation(station: Station, productId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { ingredientes: PreparationIngredient[]; procedimiento: string | null; notas: string | null }) =>
      apiRequest(`preparaciones/${productId}`, dataOf(preparationSchema), { method: "PUT", body }),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(preparationKey(productId), data);
      void queryClient.invalidateQueries({ queryKey: listKey(station) });
    },
  });
}
