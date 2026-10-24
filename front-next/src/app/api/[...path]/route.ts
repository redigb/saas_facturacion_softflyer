import type { NextRequest } from "next/server";

import { cookieForApiPath } from "@/lib/session";
import { hostFrom } from "@/lib/tenant";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000";

// Cabeceras del navegador que la API necesita; el resto no viaja.
const FORWARDED_REQUEST_HEADERS = ["content-type", "if-none-match", "idempotency-key"];
const FORWARDED_RESPONSE_HEADERS = ["content-type", "etag", "idempotency-replayed"];

/**
 * Proxy del navegador hacia Laravel (spec 002). Las pantallas de cliente (React Query)
 * llaman a /api/... y aquí se agrega el token de la cookie httpOnly: el JavaScript del
 * navegador nunca lo ve. Contrato y errores pasan sin cambios.
 */
async function forward(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const path = (await params).path.join("/");
  const host = hostFrom(request.headers);

  // Login, PIN y logout devuelven o manejan tokens: solo por acciones de servidor, que
  // los guardan en la cookie httpOnly. Por aquí el JavaScript del navegador podría leerlos.
  if (path.startsWith("auth/") && path !== "auth/yo") {
    return Response.json(
      { error: { codigo: "RECURSO_NO_ENCONTRADO", mensaje: "El recurso no existe.", detalles: null } },
      { status: 404 },
    );
  }

  // Escrituras solo desde la misma página: corta CSRF desde otro subdominio.
  if (request.method !== "GET" && request.method !== "HEAD" && !sameOrigin(request, host)) {
    return Response.json(
      { error: { codigo: "ORIGEN_NO_PERMITIDO", mensaje: "Solicitud rechazada.", detalles: null } },
      { status: 403 },
    );
  }

  const headers = new Headers({ Accept: "application/json", "X-Forwarded-Host": host });
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const token = request.cookies.get(cookieForApiPath(path))?.value;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const clientIp = request.headers.get("x-forwarded-for");
  if (clientIp) headers.set("X-Forwarded-For", clientIp);

  try {
    const upstream = await fetch(`${API_URL}/api/v1/${path}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(), // binarios intactos (spec 023)
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }

    const body = upstream.status === 204 || upstream.status === 304 ? null : await upstream.text();

    return new Response(body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    console.error(`[proxy] ${request.method} ${path} -> sin respuesta de ${API_URL}`, error);

    return Response.json(
      {
        error: {
          codigo: "API_NO_DISPONIBLE",
          mensaje: "No pudimos conectar con el servidor. Intenta de nuevo en unos segundos.",
          detalles: null,
        },
      },
      { status: 503 },
    );
  }
}

function sameOrigin(request: NextRequest, host: string): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return request.headers.get("sec-fetch-site") === "same-origin";
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
