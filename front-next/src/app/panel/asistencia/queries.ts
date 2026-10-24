"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/lib/browser-api";
import { dataOf } from "@/lib/schemas/carta";
import { attendanceSummarySchema, markResultSchema, myAttendanceSchema, workScheduleSchema } from "@/lib/schemas/asistencia";

const keys = {
  mine: (branchId: number) => ["asistencia", "mi-jornada", branchId] as const,
  summary: (branchId: number, date: string) => ["asistencia", "resumen", branchId, date] as const,
  schedule: (userId: number) => ["asistencia", "horario", userId] as const,
};

export function useMyAttendance(branchId: number) {
  return useQuery({
    queryKey: keys.mine(branchId),
    queryFn: async () => (await apiRequest(`asistencia/mi-jornada?sucursal_id=${branchId}`, dataOf(myAttendanceSchema))).data,
    enabled: branchId > 0,
    refetchInterval: 60_000,
  });
}

export function useMarkAttendance(branchId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (position: { latitud: number; longitud: number; precision_metros: number }) =>
      apiRequest("asistencia/marcaciones", dataOf(markResultSchema), {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: { sucursal_id: branchId, ...position },
      }),
    onSuccess: ({ data }) => queryClient.setQueryData(keys.mine(branchId), data.jornada),
  });
}

export function useAttendanceSummary(branchId: number, date: string) {
  return useQuery({
    queryKey: keys.summary(branchId, date),
    queryFn: async () => (await apiRequest(`asistencia/resumen?sucursal_id=${branchId}&fecha=${date}`, dataOf(attendanceSummarySchema))).data,
    enabled: branchId > 0,
  });
}

export function useWorkSchedule(userId: number | null) {
  return useQuery({
    queryKey: keys.schedule(userId ?? 0),
    queryFn: async () => (await apiRequest(`asistencia/horarios/${userId}`, dataOf(workScheduleSchema.nullable()))).data,
    enabled: userId !== null,
  });
}

export function useSaveWorkSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, body }: { userId: number; body: Record<string, unknown> }) =>
      apiRequest(`asistencia/horarios/${userId}`, dataOf(workScheduleSchema), { method: "PUT", body }),
    onSuccess: ({ data }) => {
      queryClient.setQueryData(keys.schedule(data.usuario_id), data);
      void queryClient.invalidateQueries({ queryKey: ["asistencia", "resumen"] });
    },
  });
}

