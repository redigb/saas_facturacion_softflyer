"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetch, type Tenant, type User } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/session";
import { DEMO_SLUG, getRequestHost, SECURE_COOKIES, slugFromHost } from "@/lib/tenant";

export type LoginState = {
  mensaje?: string;
  errores?: Record<string, string[]>;
  correo?: string;
};

type LoginResponse = {
  token: string;
  expira_en: string;
  usuario: User;
  inquilino: Tenant;
};

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  return authenticate(
    String(formData.get("correo") ?? ""),
    String(formData.get("contrasena") ?? ""),
  );
}

/** Entra a la cuenta demo publica; las credenciales solo existen en el servidor. */
export async function loginDemo(): Promise<LoginState> {
  const correo = process.env.DEMO_CORREO;
  const contrasena = process.env.DEMO_CONTRASENA;

  if (slugFromHost(await getRequestHost()) !== DEMO_SLUG || !correo || !contrasena) {
    return { mensaje: "La demo no está disponible en este momento." };
  }

  return authenticate(correo, contrasena);
}

async function authenticate(correo: string, contrasena: string): Promise<LoginState> {
  const result = await apiFetch<LoginResponse>("auth/login", {
    method: "POST",
    body: JSON.stringify({ correo, contrasena, dispositivo: "web" }),
  });

  if (!result.ok) {
    return {
      correo,
      mensaje: result.error.mensaje,
      errores: result.error.detalles ?? undefined,
    };
  }

  (await cookies()).set(SESSION_COOKIE, result.data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: SECURE_COOKIES,
    path: "/",
    expires: new Date(result.data.expira_en),
  });

  redirect("/panel");
}
