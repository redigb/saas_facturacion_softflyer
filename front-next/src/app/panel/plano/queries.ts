"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { apiCommand, apiRequest } from "@/lib/browser-api";
import { dataOf } from "@/lib/schemas/carta";
import { planSchema, roomSchema, type PlanBody, type Room } from "@/lib/schemas/plano";

export const keys = {
  rooms: ["salones"] as const,
  plan: (roomId: number) => ["salones", roomId, "plano"] as const,
};

export function useRooms() {
  return useQuery({
    queryKey: keys.rooms,
    queryFn: async () => (await apiRequest("salones", dataOf(z.array(roomSchema)))).data,
  });
}

export function usePlan(roomId: number | null) {
  return useQuery({
    queryKey: keys.plan(roomId ?? 0),
    queryFn: async () => (await apiRequest(`salones/${roomId}/plano`, dataOf(planSchema))).data,
    enabled: roomId !== null,
    // El editor trabaja sobre una copia local: no se recarga sola mientras se edita.
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}

export function fetchPlan(roomId: number) {
  return apiRequest(`salones/${roomId}/plano`, dataOf(planSchema)).then((response) => response.data);
}

export function useSavePlan(roomId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: PlanBody) => apiRequest(`salones/${roomId}/plano`, dataOf(planSchema), { method: "PUT", body }),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(keys.plan(roomId), data);
      void queryClient.invalidateQueries({ queryKey: keys.rooms, exact: true });
    },
  });
}

export function useSaveRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: Partial<Pick<Room, "nombre" | "es_activo" | "ancho" | "alto">> }) =>
      apiRequest(id ? `salones/${id}` : "salones", dataOf(roomSchema), { method: id ? "PATCH" : "POST", body }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.rooms, exact: true }),
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiCommand(`salones/${id}`, { method: "DELETE" }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.rooms, exact: true }),
  });
}

export function useReorderRooms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: number[]) => apiCommand("salones/orden", { method: "PUT", body: { ids } }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: keys.rooms, exact: true });
      const previous = queryClient.getQueryData<Room[]>(keys.rooms);
      queryClient.setQueryData<Room[]>(keys.rooms, (current = []) =>
        ids.map((id, orden) => ({ ...current.find((room) => room.id === id)!, orden })),
      );

      return { previous };
    },
    onError: (_, __, context) => queryClient.setQueryData(keys.rooms, context?.previous),
  });
}
