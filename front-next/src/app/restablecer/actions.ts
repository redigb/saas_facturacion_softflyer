"use server";

import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api";

export type PasswordState = {
  ok?: boolean;
  mensaje?: string;
  codigo?: string;
  errores?: Record<string, string[]>;
  correo?: string;
};

/** Siempre responde lo mismo: la API no revela si el correo tiene cuenta (spec 035). */
export async function forgotPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const correo = String(formData.get("correo") ?? "").trim();
  const result = await apiFetch<{ mensaje: string }>("auth/contrasena/olvide", {
    method: "POST",
    body: JSON.stringify({ correo }),
  });

  if (!result.ok) {
    return { correo, mensaje: result.error.mensaje, errores: result.error.detalles ?? undefined };
  }

  return { ok: true, correo, mensaje: result.data.mensaje };
}

export async function resetPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const result = await apiFetch<{ correo: string }>("auth/contrasena/restablecer", {
    method: "POST",
    body: JSON.stringify({
      token: formData.get("token"),
      contrasena: formData.get("contrasena"),
      contrasena_confirmation: formData.get("contrasena_confirmation"),
    }),
  });

  if (!result.ok) {
    return { mensaje: result.error.mensaje, codigo: result.error.codigo, errores: result.error.detalles ?? undefined };
  }

  // La activación (spec 036) usa el mismo token; solo cambia el aviso del login.
  redirect(formData.get("modo") === "activar" ? "/login?activada=1" : "/login?restablecida=1");
}
