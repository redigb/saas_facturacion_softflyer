import { formatDateTime } from "@/app/plataforma/ui";

/** Respuesta del alta directa (spec 036): un enlace de activación, nunca una contraseña. */
export type CreatedClient = { slug: string; correo: string; enlace_activacion: string; expira_en: string };

/** Texto listo para pegar en WhatsApp o en un correo propio. */
export function welcomeMessage(created: CreatedClient, rootDomain: string): string {
  return [
    "¡Bienvenido a Softflyer!",
    "",
    `Tu sistema ya está listo. Crea tu contraseña aquí (sirve una sola vez, vence el ${formatDateTime(created.expira_en)}):`,
    created.enlace_activacion,
    "",
    `Después entra siempre por: http://${created.slug}.${rootDomain}/login`,
    `Tu correo de acceso: ${created.correo}`,
  ].join("\n");
}
