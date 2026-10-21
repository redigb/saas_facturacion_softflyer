"use client";

import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/lib/browser-api";
import { dataOf } from "@/lib/schemas/carta";
import { fiscalStatusSchema, taxCatalogsSchema } from "@/lib/schemas/facturacion";

// El dueño solo lee su facturación: certificado, SOL, tasa y Amazonía los carga el backoffice.
export const fiscalKeys = {
  status: ["configuracion", "fiscal"] as const,
  catalogs: ["carta", "catalogos"] as const,
};

export function useFiscalStatus() {
  return useQuery({
    queryKey: fiscalKeys.status,
    queryFn: async () => (await apiRequest("configuracion-fiscal", dataOf(fiscalStatusSchema))).data,
  });
}

export function useTaxCatalogs() {
  return useQuery({
    queryKey: fiscalKeys.catalogs,
    queryFn: async () => (await apiRequest("carta/catalogos", dataOf(taxCatalogsSchema))).data,
    staleTime: Infinity,
  });
}
