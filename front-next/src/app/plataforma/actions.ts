"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { PLATFORM_COOKIE } from "@/lib/session";

export type FormState = {
  ok?: boolean;
  mensaje?: string;
  errores?: Record<string, string[]>;
  resultado?: Record<string, string>;
};

export async function platformLogin(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await apiFetch<{ token: string; expira_en: string }>("plataforma/auth/login", {
    method: "POST",
    body: JSON.stringify({ correo: formData.get("correo"), contrasena: formData.get("contrasena") }),
  });

  if (!result.ok) {
    return { mensaje: result.error.mensaje, errores: result.error.detalles ?? undefined };
  }

  (await cookies()).set(PLATFORM_COOKIE, result.data.token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(result.data.expira_en),
  });

  redirect("/plataforma");
}

export async function platformLogout(): Promise<void> {
  await apiFetch("plataforma/auth/logout", { method: "POST" });
  (await cookies()).delete(PLATFORM_COOKIE);

  redirect("/plataforma/login");
}

/** Ejecuta una acción sobre un cliente y refresca su ficha. */
async function clientAction(slug: string, action: string, body: Record<string, unknown>, success: string): Promise<FormState> {
  const result = await apiFetch(`plataforma/clientes/${slug}/${action}`, { method: "POST", body: JSON.stringify(body) });

  if (!result.ok) {
    return { mensaje: result.error.mensaje, errores: result.error.detalles ?? undefined };
  }

  revalidatePath("/plataforma", "layout");

  return { ok: true, mensaje: success };
}

export async function activatePlan(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  return clientAction(slug, "activar-plan", { plan: formData.get("plan"), meses: Number(formData.get("meses")) }, "Plan activado. El cliente ya es de pago.");
}

export async function extendTrial(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  return clientAction(slug, "extender-prueba", { dias: Number(formData.get("dias")) }, "Prueba extendida.");
}

export async function suspendClient(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  return clientAction(slug, "suspender", { motivo: formData.get("motivo") }, "Cliente suspendido.");
}

export async function reactivateClient(slug: string): Promise<FormState> {
  return clientAction(slug, "reactivar", {}, "Cliente reactivado.");
}

export async function createClient(_prev: FormState, formData: FormData): Promise<FormState> {
  const fields = ["ruc", "razon_social", "nombre_comercial", "slug", "nombre_contacto", "correo", "plan"];
  const body = Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? "").trim()]));

  const result = await apiFetch<{ slug: string; correo: string; contrasena_temporal: string }>("plataforma/clientes", {
    method: "POST",
    body: JSON.stringify({ ...body, meses: Number(formData.get("meses")) }),
  });

  if (!result.ok) {
    return { mensaje: result.error.mensaje, errores: result.error.detalles ?? undefined, resultado: body };
  }

  revalidatePath("/plataforma", "layout");

  return { ok: true, resultado: result.data };
}

export async function resendLink(id: number): Promise<FormState> {
  const result = await apiFetch(`plataforma/solicitudes/${id}/reenviar`, { method: "POST" });

  return result.ok ? { ok: true, mensaje: "Enlace reenviado." } : { mensaje: result.error.mensaje };
}
