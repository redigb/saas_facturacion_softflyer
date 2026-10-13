"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { apiRequest } from "@/lib/browser-api";
import { dataOf } from "@/lib/schemas/carta";
import { branchesResponseSchema, branchSchema, companySchema, ubigeoSchema } from "@/lib/schemas/configuracion";

export const keys = {
  company: ["configuracion", "empresa"] as const,
  branches: ["configuracion", "sucursales"] as const,
  ubigeos: (term: string) => ["configuracion", "ubigeos", term] as const,
};

export function useCompany() {
  return useQuery({
    queryKey: keys.company,
    queryFn: async () => (await apiRequest("empresa", dataOf(companySchema))).data,
  });
}

export function useSaveCompany() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiRequest("empresa", dataOf(companySchema), { method: "PATCH", body }),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(keys.company, data);
      // El Inicio y su checklist leen estos datos desde el servidor.
      router.refresh();
    },
  });
}

export function useBranches() {
  return useQuery({
    queryKey: keys.branches,
    queryFn: async () => await apiRequest("sucursales", branchesResponseSchema),
  });
}

export function useSaveBranch() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: Record<string, unknown> }) =>
      apiRequest(id ? `sucursales/${id}` : "sucursales", dataOf(branchSchema), { method: id ? "PATCH" : "POST", body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.branches });
      // El selector de sucursal y el equipo dependen de las sucursales activas.
      router.refresh();
    },
  });
}

/** Distritos que coinciden con lo escrito; no pide nada con menos de 2 letras. */
export function useUbigeoSearch(term: string) {
  const clean = term.trim();

  return useQuery({
    queryKey: keys.ubigeos(clean),
    queryFn: async () => (await apiRequest(`ubigeos?q=${encodeURIComponent(clean)}`, dataOf(z.array(ubigeoSchema)))).data,
    enabled: clean.length >= 2,
    staleTime: Infinity,
  });
}
