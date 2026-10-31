"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/lib/browser-api";
import { analyticsSchema, type AnalyticsFilters } from "@/lib/schemas/analiticas";
import { dataOf } from "@/lib/schemas/carta";

export const analyticsKeys = { report: (filters: AnalyticsFilters) => ["analiticas", filters] as const };

export function useAnalytics(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.report(filters),
    queryFn: async () => {
      const params = new URLSearchParams({ desde: filters.desde, hasta: filters.hasta });
      if (filters.sucursalId !== null) params.set("sucursal_id", String(filters.sucursalId));
      if (filters.agrupar) params.set("agrupar", filters.agrupar);

      return (await apiRequest(`analiticas?${params.toString()}`, dataOf(analyticsSchema))).data;
    },
    placeholderData: keepPreviousData,
  });
}
