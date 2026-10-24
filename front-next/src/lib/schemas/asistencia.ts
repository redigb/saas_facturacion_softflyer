import { z } from "zod";

export const attendanceBranchSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  geocerca: z.object({ latitud: z.number(), longitud: z.number(), radio_metros: z.number() }).nullable(),
});

export const workScheduleSchema = z.object({
  id: z.number(),
  usuario_id: z.number(),
  sucursal: z.object({ id: z.number(), nombre: z.string() }),
  dias_semana: z.array(z.number().int().min(1).max(7)),
  hora_entrada: z.string(),
  hora_salida: z.string(),
  tolerancia_minutos: z.number(),
  es_activo: z.boolean(),
});

export const attendanceMarkSchema = z.object({
  id: z.number(),
  tipo: z.enum(["ENTRADA", "SALIDA"]),
  marcado_en: z.string(),
  estado: z.enum(["PUNTUAL", "TARDANZA", "REGISTRADA"]),
  precision_metros: z.number(),
  distancia_metros: z.number(),
});

export const myAttendanceSchema = z.object({
  servidor_ahora: z.string(),
  zona_horaria: z.string(),
  sucursal: attendanceBranchSchema,
  horario: workScheduleSchema.nullable(),
  proxima_marcacion: z.enum(["ENTRADA", "SALIDA"]),
  marcaciones: z.array(attendanceMarkSchema),
});

export const markResultSchema = z.object({
  marcacion: attendanceMarkSchema,
  jornada: myAttendanceSchema,
});

export const attendanceSummarySchema = z.object({
  fecha: z.string(),
  servidor_ahora: z.string(),
  sucursal: attendanceBranchSchema,
  personas: z.array(z.object({
    usuario: z.object({ id: z.number(), nombre: z.string(), roles: z.array(z.string()) }),
    horario: workScheduleSchema,
    estado: z.enum(["SIN_MARCAR", "PUNTUAL", "TARDANZA", "EN_JORNADA"]),
    marcaciones: z.array(attendanceMarkSchema),
  })),
});

export type MyAttendance = z.infer<typeof myAttendanceSchema>;
export type WorkSchedule = z.infer<typeof workScheduleSchema>;
export type AttendanceSummary = z.infer<typeof attendanceSummarySchema>;

