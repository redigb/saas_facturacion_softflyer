import { headers } from "next/headers";

const ROOT_DOMAIN = process.env.APP_ROOT_DOMAIN ?? "localhost:3000";
// APP_PROTOCOL permite correr el build de producción sobre http (Docker local).
const PROTOCOL = process.env.APP_PROTOCOL ?? (process.env.NODE_ENV === "production" ? "https" : "http");

/** Cookies `Secure` solo cuando el sitio se sirve por https; si no, el navegador las descarta. */
export const SECURE_COOKIES = PROTOCOL === "https";

export const DEMO_SLUG = process.env.DEMO_SLUG ?? "demo";

// admin.{dominio} es el backoffice del dueño de la plataforma, no un restaurante.
export const PLATFORM_SLUG = "admin";
export const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

/**
 * Host con el que el navegador entró. Se prefiere x-forwarded-host porque, tras
 * el redirect de un Server Action, Next renderiza la página destino en una
 * petición interna cuyo `host` es `localhost:3000` y pierde el subdominio.
 */
export function hostFrom(incoming: Headers): string {
  return incoming.get("x-forwarded-host") ?? incoming.get("host") ?? ROOT_DOMAIN;
}

export async function getRequestHost(): Promise<string> {
  return hostFrom(await headers());
}

/** {slug}.{dominio raiz} identifica a la empresa (Doc. 06 §1.1). */
export function slugFromHost(host: string): string | null {
  const hostname = host.split(":")[0].toLowerCase();
  const root = ROOT_DOMAIN.split(":")[0];

  if (!hostname.endsWith(`.${root}`)) {
    return null;
  }

  const slug = hostname.slice(0, -(root.length + 1));

  return SLUG_PATTERN.test(slug) ? slug : null;
}

export function tenantUrl(slug: string, path: string): string {
  return `${PROTOCOL}://${slug}.${ROOT_DOMAIN}${path}`;
}

export function rootUrl(path: string): string {
  return `${PROTOCOL}://${ROOT_DOMAIN}${path}`;
}

export function rootDomainLabel(): string {
  return ROOT_DOMAIN;
}
