"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { useToast } from "@/app/panel/providers";
import { apiCommand, apiRequest, ApiRequestError } from "@/lib/browser-api";
import {
  categorySchema,
  dataOf,
  modifierGroupSchema,
  paginationSchema,
  productSchema,
  stationSchema,
  type Category,
  type ModifierGroup,
  type Product,
  type Station,
} from "@/lib/schemas/carta";

export const keys = {
  categories: ["categorias"] as const,
  products: ["productos"] as const,
  stations: ["estaciones"] as const,
  groups: ["modificador-grupos"] as const,
};

const productPage = z.object({ data: z.array(productSchema), meta: paginationSchema });

export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: async () => (await apiRequest("categorias", dataOf(z.array(categorySchema)))).data,
  });
}

/** Toda la carta del editor en memoria: filtrar y buscar es instantáneo, sin ir al servidor. */
export function useProducts() {
  return useQuery({
    queryKey: keys.products,
    queryFn: async () => {
      const all: Product[] = [];
      for (let page = 1; ; page++) {
        const { data, meta } = await apiRequest(`productos?por_pagina=100&pagina=${page}`, productPage);
        all.push(...data);
        if (meta.pagina_actual * meta.por_pagina >= meta.total) return all;
      }
    },
  });
}

export function useStations() {
  return useQuery({
    queryKey: keys.stations,
    queryFn: async () => (await apiRequest("estaciones", dataOf(z.array(stationSchema)))).data,
  });
}

export function useModifierGroups() {
  return useQuery({
    queryKey: keys.groups,
    queryFn: async () => (await apiRequest("modificador-grupos", dataOf(z.array(modifierGroupSchema)))).data,
  });
}

// --- Escrituras --------------------------------------------------------------

/** Mensaje para el aviso cuando el error no es de validación de un formulario. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : "No se pudo guardar. Intenta de nuevo.";
}

export function useSaveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: Record<string, unknown> }) =>
      apiRequest(id ? `productos/${id}` : "productos", dataOf(productSchema), { method: id ? "PATCH" : "POST", body }),
    onSuccess: ({ data }) => {
      queryClient.setQueryData<Product[]>(keys.products, (current = []) =>
        current.some((product) => product.id === data.id)
          ? current.map((product) => (product.id === data.id ? data : product))
          : [...current, data],
      );
      void queryClient.invalidateQueries({ queryKey: keys.categories });
    },
  });
}

/**
 * Cambio rápido en la lista (precio, activo): se ve al instante y se revierte si falla.
 */
export function useQuickProductUpdate() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<Pick<Product, "precio_venta" | "es_activo">> }) =>
      apiRequest(`productos/${id}`, dataOf(productSchema), { method: "PATCH", body: patch }),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: keys.products });
      const previous = queryClient.getQueryData<Product[]>(keys.products);
      queryClient.setQueryData<Product[]>(keys.products, (current = []) =>
        current.map((product) => (product.id === id ? { ...product, ...patch } : product)),
      );

      return { previous };
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(keys.products, context?.previous);
      toast({ tone: "error", message: errorMessage(error), action: { label: "Reintentar", run: () => mutation.mutate(variables) } });
    },
    onSuccess: ({ data }) => {
      queryClient.setQueryData<Product[]>(keys.products, (current = []) =>
        current.map((product) => (product.id === data.id ? data : product)),
      );
    },
  });

  return mutation;
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiCommand(`productos/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Product[]>(keys.products, (current = []) => current.filter((product) => product.id !== id));
      void queryClient.invalidateQueries({ queryKey: keys.categories });
    },
  });
}

export function useSaveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: Record<string, unknown> }) =>
      apiRequest(id ? `categorias/${id}` : "categorias", dataOf(categorySchema), { method: id ? "PATCH" : "POST", body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.categories });
      // La estación de la categoría cambia la estación efectiva de sus platos.
      void queryClient.invalidateQueries({ queryKey: keys.products });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiCommand(`categorias/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.categories });
      void queryClient.invalidateQueries({ queryKey: keys.products });
    },
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (ids: number[]) => apiCommand("categorias/orden", { method: "PUT", body: { ids } }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: keys.categories });
      const previous = queryClient.getQueryData<Category[]>(keys.categories);
      queryClient.setQueryData<Category[]>(keys.categories, (current = []) =>
        ids.map((id, orden) => ({ ...current.find((category) => category.id === id)!, orden })),
      );

      return { previous };
    },
    onError: (error, _, context) => {
      queryClient.setQueryData(keys.categories, context?.previous);
      toast({ tone: "error", message: `No se guardó el nuevo orden. ${errorMessage(error)}` });
    },
  });
}

export function useSaveStation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: Partial<Pick<Station, "nombre" | "es_activa">> }) =>
      apiRequest(id ? `estaciones/${id}` : "estaciones", dataOf(stationSchema), { method: id ? "PATCH" : "POST", body }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.stations }),
  });
}

export function useSaveModifierGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: Record<string, unknown> }) =>
      apiRequest(id ? `modificador-grupos/${id}` : "modificador-grupos", dataOf(modifierGroupSchema), {
        method: id ? "PATCH" : "POST",
        body,
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: keys.groups }),
  });
}

export function useDeleteModifierGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiCommand(`modificador-grupos/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) =>
      queryClient.setQueryData<ModifierGroup[]>(keys.groups, (current = []) => current.filter((group) => group.id !== id)),
  });
}
