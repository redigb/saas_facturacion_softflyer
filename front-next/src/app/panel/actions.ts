"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/session";

export async function logout(): Promise<void> {
  // Revoca el token en Laravel aunque la cookie se borre igual si la API falla.
  await apiFetch("auth/logout", { method: "POST" });
  (await cookies()).delete(SESSION_COOKIE);

  redirect("/login");
}

export type SwitchUserResult = { codigo: string; mensaje: string };

/**
 * Cambio rápido de usuario con PIN (spec 004). La API exige la sesión actual del
 * dispositivo y la revoca al crear la nueva; aquí solo se guarda la nueva en la cookie.
 */
export async function switchUser(usuarioId: number, pin: string): Promise<SwitchUserResult> {
  const result = await apiFetch<{ token: string; expira_en: string }>("auth/pin", {
    method: "POST",
    body: JSON.stringify({ usuario_id: usuarioId, pin, dispositivo: "web" }),
  });

  if (!result.ok) {
    return { codigo: result.error.codigo, mensaje: result.error.mensaje };
  }

  (await cookies()).set(SESSION_COOKIE, result.data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(result.data.expira_en),
  });

  redirect("/panel");
}
