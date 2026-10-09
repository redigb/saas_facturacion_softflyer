import Echo from "laravel-echo";
import Pusher from "pusher-js";

export type RealtimeStatus = "conectando" | "en-vivo" | "reconectando" | "desactivado";

/**
 * Conexión con Reverb (spec 005). La autorización de cada canal privado pasa por el proxy
 * /api/broadcasting/auth: el token sigue en la cookie httpOnly y nunca llega aquí.
 * Sin NEXT_PUBLIC_REVERB_KEY el tiempo real queda desactivado y todo sigue por la API.
 */
export function createEcho(): Echo<"reverb"> | null {
  const key = process.env.NEXT_PUBLIC_REVERB_KEY;
  if (!key || typeof window === "undefined") return null;

  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? "http";
  const port = Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? (scheme === "https" ? 443 : 8080));

  return new Echo({
    broadcaster: "reverb",
    key,
    Pusher,
    // Sin host fijo, el del subdominio actual: donjose.localhost en local.
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST || window.location.hostname,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === "https",
    enabledTransports: ["ws", "wss"],
    channelAuthorization: {
      endpoint: "/api/broadcasting/auth",
      transport: "ajax",
      customHandler: ({ socketId, channelName }, callback) => {
        fetch("/api/broadcasting/auth", {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ socket_id: socketId, channel_name: channelName }),
        })
          .then(async (response) => {
            if (!response.ok) throw new Error(`Canal ${channelName} no autorizado (${response.status})`);
            callback(null, await response.json());
          })
          .catch((error: Error) => callback(error, null));
      },
    },
  });
}
