import { z } from "zod";

// Contrato de specs/004-equipo/backend.md. Si la API cambia, se cambia primero la spec.

export const roleSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  es_sistema: z.boolean(),
  permisos: z.array(z.string()),
});

export const memberSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  correo: z.string(),
  es_activo: z.boolean(),
  tiene_pin: z.boolean(),
  roles: z.array(z.object({ id: z.number(), nombre: z.string() })),
  ultimo_acceso: z.string().nullable(),
  es_yo: z.boolean(),
});

export const switchableSchema = z.object({ id: z.number(), nombre: z.string(), roles: z.array(z.string()) });

export type Role = z.infer<typeof roleSchema>;
export type Member = z.infer<typeof memberSchema>;
export type Switchable = z.infer<typeof switchableSchema>;

const pin = z.string().regex(/^(\d{4,6})?$/, { error: "El PIN tiene de 4 a 6 dígitos." });

export const memberFormSchema = z.object({
  nombre: z.string().trim().min(1, { error: "Ingresa el nombre." }).max(120),
  correo: z.email({ error: "Ingresa un correo válido." }).trim(),
  contrasena: z.string(),
  rol_id: z.string().min(1, { error: "Elige un rol." }),
  pin,
});

export type MemberFormValues = z.input<typeof memberFormSchema>;

/** Contraseña legible para dictarla: sin 0/O ni 1/l/I. */
export function generatePassword(length = 12): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}
