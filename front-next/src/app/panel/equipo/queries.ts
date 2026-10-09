"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { errorMessage } from "@/app/panel/carta/queries";
import { useToast } from "@/app/panel/providers";
import { apiCommand, apiRequest } from "@/lib/browser-api";
import { dataOf } from "@/lib/schemas/carta";
import { memberSchema, roleSchema, type Member } from "@/lib/schemas/equipo";

export const keys = {
  members: ["usuarios"] as const,
  roles: ["roles"] as const,
};

export function useMembers() {
  return useQuery({
    queryKey: keys.members,
    queryFn: async () => (await apiRequest("usuarios", dataOf(z.array(memberSchema)))).data,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: keys.roles,
    queryFn: async () => (await apiRequest("roles", dataOf(z.array(roleSchema)))).data,
    staleTime: Infinity,
  });
}

export function useSaveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: Record<string, unknown> }) =>
      apiRequest(id ? `usuarios/${id}` : "usuarios", dataOf(memberSchema), { method: id ? "PATCH" : "POST", body }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.members }),
  });
}

/** Activar/desactivar: se ve al instante y se revierte con aviso si la API lo rechaza. */
export function useToggleActive() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, es_activo }: { id: number; es_activo: boolean }) =>
      apiRequest(`usuarios/${id}`, dataOf(memberSchema), { method: "PATCH", body: { es_activo } }),
    onMutate: async ({ id, es_activo }) => {
      await queryClient.cancelQueries({ queryKey: keys.members });
      const previous = queryClient.getQueryData<Member[]>(keys.members);
      queryClient.setQueryData<Member[]>(keys.members, (current = []) =>
        current.map((member) => (member.id === id ? { ...member, es_activo } : member)),
      );
      return { previous };
    },
    onError: (error, _, context) => {
      queryClient.setQueryData(keys.members, context?.previous);
      toast({ tone: "error", message: errorMessage(error) });
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: keys.members }),
  });
}

export function useSetPin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, pin }: { id: number; pin: string | null }) =>
      pin === null
        ? apiCommand(`usuarios/${id}/pin`, { method: "DELETE" })
        : apiCommand(`usuarios/${id}/pin`, { method: "PUT", body: { pin } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.members }),
  });
}
