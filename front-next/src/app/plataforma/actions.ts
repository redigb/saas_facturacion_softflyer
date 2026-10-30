"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { CreatedClient } from "@/app/plataforma/welcome-message";
import { apiFetch } from "@/lib/api";
import { PLATFORM_COOKIE } from "@/lib/session";
import { SECURE_COOKIES } from "@/lib/tenant";

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
    secure: SECURE_COOKIES,
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

/** Corrige los datos de la empresa; el RUC solo se acepta mientras no haya comprobantes reales. */
export async function updateClientData(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const body = JSON.stringify({
    ruc: formData.get("ruc"),
    razon_social: formData.get("razon_social"),
    nombre_comercial: formData.get("nombre_comercial"),
    direccion_fiscal: String(formData.get("direccion_fiscal") ?? "").trim() || null,
  });
  const result = await apiFetch(`plataforma/clientes/${slug}`, { method: "PATCH", body });

  if (!result.ok) {
    return { mensaje: result.error.mensaje, errores: result.error.detalles ?? undefined };
  }

  revalidatePath("/plataforma", "layout");

  return { ok: true, mensaje: "Datos guardados." };
}

/** Baja definitiva: se pide escribir el subdominio para evitar un clic por error. */
export async function cancelClient(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  if (String(formData.get("confirmacion") ?? "").trim() !== slug) {
    return { mensaje: `Escribe «${slug}» para confirmar la baja.` };
  }

  return clientAction(slug, "cancelar", { motivo: formData.get("motivo") }, "Cliente cancelado.");
}

export async function reactivateClient(slug: string): Promise<FormState> {
  return clientAction(slug, "reactivar", {}, "Cliente reactivado.");
}

export async function setHomologation(slug: string, homologated: boolean): Promise<FormState> {
  return clientAction(slug, "homologacion", { homologado: homologated }, homologated ? "Homologación marcada como completa." : "Homologación retirada.");
}

/** Acciones fiscales: la facturación del cliente la administra solo el backoffice. */
async function fiscalRequest(slug: string, path: string, init: RequestInit, success: string): Promise<FormState> {
  const result = await apiFetch(`plataforma/clientes/${slug}/fiscal/${path}`, init);

  if (!result.ok) {
    return { mensaje: result.error.mensaje, errores: result.error.detalles ?? undefined };
  }

  revalidatePath("/plataforma", "layout");

  return { ok: true, mensaje: success };
}

export async function uploadCertificate(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const file = formData.get("certificado");
  if (!(file instanceof File) || file.size === 0) {
    return { mensaje: "Sube el archivo del certificado." };
  }

  const body = new FormData();
  body.append("certificado", file);
  body.append("contrasena", String(formData.get("contrasena") ?? ""));

  return fiscalRequest(slug, "certificado", { method: "POST", body }, "Certificado cargado.");
}

export async function saveSolCredentials(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const body = JSON.stringify({ usuario_sol: formData.get("usuario_sol"), clave_sol: formData.get("clave_sol") });

  return fiscalRequest(slug, "credenciales-sol", { method: "PUT", body }, "Credenciales SOL guardadas.");
}

/** Pregunta a SUNAT si acepta el usuario y la clave SOL guardados; no emite nada. */
export async function testCredentials(slug: string): Promise<FormState> {
  const result = await apiFetch<{ resultado: string; mensaje: string }>(`plataforma/clientes/${slug}/fiscal/probar-credenciales`, { method: "POST" });

  if (!result.ok) {
    return { mensaje: result.error.mensaje };
  }

  return { ok: result.data.resultado !== "RECHAZADAS", mensaje: result.data.mensaje };
}

export async function setCompanyRate(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const body = JSON.stringify({ tasa_igv_id: Number(formData.get("tasa_igv_id")) });

  return fiscalRequest(slug, "tasa-igv", { method: "PUT", body }, "Tasa de la empresa guardada.");
}

/** Tasa propia del local (vacía hereda la de la empresa) y exoneración por la Amazonía con su leyenda. */
export async function setBranchTax(slug: string, branchId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  const rate = String(formData.get("tasa_igv_id") ?? "");
  const body = JSON.stringify({
    tasa_igv_id: !rate || rate === "empresa" ? null : Number(rate),
    exonerado_amazonia: formData.get("exonerado_amazonia") === "on",
    leyenda_amazonia: String(formData.get("leyenda_amazonia") ?? "2001"),
  });

  return fiscalRequest(slug, `sucursales/${branchId}`, { method: "PATCH", body }, "IGV del local guardado.");
}

export async function createClient(_prev: FormState, formData: FormData): Promise<FormState> {
  const fields = ["ruc", "razon_social", "nombre_comercial", "slug", "nombre_contacto", "correo", "plan"];
  const body = Object.fromEntries(fields.map((field) => [field, String(formData.get(field) ?? "").trim()]));

  const result = await apiFetch<CreatedClient>("plataforma/clientes", {
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

/** Soporte de acceso (spec 035): el usuario recibe un enlace para crear su contraseña; nadie la ve. */
export async function sendPasswordReset(slug: string, userId: number): Promise<FormState> {
  const result = await apiFetch<{ correo: string; enlace: string; expira_en: string }>(
    `plataforma/clientes/${slug}/usuarios/${userId}/restablecer-acceso`,
    { method: "POST" },
  );

  if (!result.ok) {
    return { mensaje: result.error.mensaje };
  }

  revalidatePath("/plataforma", "layout");

  return { ok: true, resultado: result.data };
}
