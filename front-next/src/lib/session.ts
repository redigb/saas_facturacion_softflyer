// Cookies httpOnly con el token de Sanctum: el JavaScript del navegador nunca las lee.
export const SESSION_COOKIE = "sf_sesion";

// Sesión del backoffice (admin.{dominio}). Es otra cookie para que nunca se mezclen.
export const PLATFORM_COOKIE = "sf_plataforma";

/** Las rutas de la API bajo plataforma/ usan la sesión del backoffice. */
export function cookieForApiPath(path: string): string {
  return path.startsWith("plataforma/") ? PLATFORM_COOKIE : SESSION_COOKIE;
}
