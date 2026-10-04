"use server";

import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { tenantUrl } from "@/lib/tenant";

export type RegisterState = {
  enviado?: boolean;
  correo?: string;
  mensaje?: string;
  errores?: Record<string, string[]>;
  valores?: Record<string, string>;
};

const FIELDS = ["ruc", "razon_social", "nombre_comercial", "slug", "nombre_contacto", "correo", "telefono"] as const;

export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const values = Object.fromEntries(FIELDS.map((field) => [field, String(formData.get(field) ?? "").trim()]));

  const result = await apiFetch<{ correo: string }>("registro", {
    method: "POST",
    body: JSON.stringify({
      ...values,
      contrasena: formData.get("contrasena"),
      contrasena_confirmation: formData.get("contrasena_confirmation"),
    }),
  });

  if (!result.ok) {
    return { mensaje: result.error.mensaje, errores: result.error.detalles ?? undefined, valores: values };
  }

  return { enviado: true, correo: result.data.correo };
}

export async function resend(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const correo = String(formData.get("correo") ?? "");
  const result = await apiFetch("registro/reenviar", { method: "POST", body: JSON.stringify({ correo }) });

  return {
    enviado: true,
    correo,
    mensaje: result.ok ? "Te enviamos un nuevo enlace." : result.error.mensaje,
  };
}

export type VerifyState = { mensaje?: string; codigo?: string };

export async function verify(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const result = await apiFetch<{ slug: string }>("registro/verificar", {
    method: "POST",
    body: JSON.stringify({ token: formData.get("token") }),
  });

  if (!result.ok) {
    return { mensaje: result.error.mensaje, codigo: result.error.codigo };
  }

  redirect(tenantUrl(result.data.slug, "/login?verificado=1"));
}
