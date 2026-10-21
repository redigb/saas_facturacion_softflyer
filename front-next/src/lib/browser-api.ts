import type { z } from "zod";

import type { ApiError } from "@/lib/api";

/** Error de la API con el formato estándar (Doc. 07 §3.3). */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    mensaje: string,
    readonly detalles: Record<string, string[]> | null = null,
  ) {
    super(mensaje);
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
};

/**
 * Llamada desde el navegador a través del proxy /api (spec 002). Devuelve el cuerpo
 * completo ({ data, meta }) validado con el esquema Zod del contrato.
 */
export async function apiRequest<S extends z.ZodType>(
  path: string,
  schema: S,
  options: RequestOptions = {},
): Promise<z.infer<S>> {
  const response = await send(path, options);
  const json = await response.json();

  return schema.parse(json);
}

/** Para respuestas sin cuerpo (204). */
export async function apiCommand(path: string, options: RequestOptions = {}): Promise<void> {
  await send(path, options);
}

async function send(path: string, { method = "GET", body, headers = {} }: RequestOptions): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(`/api/${path}`, {
      method,
      // Con FormData el navegador pone el Content-Type con su boundary.
      headers: { Accept: "application/json", ...(body === undefined || body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...headers },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError(0, "SIN_CONEXION", "No hay conexión. Revisa tu internet e intenta de nuevo.");
  }

  if (!response.ok) {
    const error = (await response.json().catch(() => null))?.error as ApiError | undefined;

    throw new ApiRequestError(
      response.status,
      error?.codigo ?? "ERROR_HTTP",
      error?.mensaje ?? "No se pudo completar la operación.",
      error?.detalles ?? null,
    );
  }

  return response;
}
