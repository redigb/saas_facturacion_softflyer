import { cookies, headers } from "next/headers";

import { cookieForApiPath } from "@/lib/session";
import { hostFrom } from "@/lib/tenant";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

export type Tenant = {
  nombre: string;
  slug: string;
  estado: "PRUEBA" | "ACTIVO" | "MOROSO" | "SUSPENDIDO" | "CANCELADO";
  modo: "DEMO" | "PRUEBA" | "PAGO";
  prueba: { vence_en: string; dias_restantes: number; vencida: boolean } | null;
  ventas_correo: string | null;
};

export type User = {
  id: number;
  nombre: string;
  correo: string;
};

export type Me = {
  usuario: User;
  inquilino: Tenant;
  roles: string[];
  permisos: string[];
};

export type ApiError = {
  codigo: string;
  mensaje: string;
  detalles: Record<string, string[]> | null;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: ApiError };

/**
 * Llama a Laravel desde el servidor de Next. Reenvia el host original para que
 * la API resuelva el inquilino por subdominio, y adjunta el token de la cookie.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  const incoming = await headers();
  const token = (await cookies()).get(cookieForApiPath(path))?.value;

  const requestHeaders = new Headers(init.headers);
  requestHeaders.set("Accept", "application/json");
  requestHeaders.set("X-Forwarded-Host", hostFrom(incoming));

  const clientIp = incoming.get("x-forwarded-for") ?? incoming.get("x-real-ip");
  if (clientIp) {
    requestHeaders.set("X-Forwarded-For", clientIp);
  }
  if (init.body) {
    requestHeaders.set("Content-Type", "application/json");
  }
  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/${path}`, {
      ...init,
      headers: requestHeaders,
      cache: "no-store",
    });

    if (response.status === 204) {
      return { ok: true, data: undefined as T };
    }

    const body = await response.json();

    if (!response.ok) {
      console.warn(
        `[api] ${init.method ?? "GET"} ${path} -> ${response.status} ${body?.error?.codigo ?? "?"}`,
        { host: hostFrom(incoming), conToken: Boolean(token) },
      );
    }

    return response.ok
      ? { ok: true, data: body.data as T }
      : { ok: false, status: response.status, error: body.error as ApiError };
  } catch (error) {
    console.error(`[api] ${init.method ?? "GET"} ${path} -> sin respuesta de ${API_URL}`, error);

    return {
      ok: false,
      status: 503,
      error: {
        codigo: "API_NO_DISPONIBLE",
        mensaje: "No pudimos conectar con el servidor. Intenta de nuevo en unos segundos.",
        detalles: null,
      },
    };
  }
}
