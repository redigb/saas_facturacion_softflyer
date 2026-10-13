import Echo from "laravel-echo";
import Pusher from "pusher-js";

export type RealtimeStatus = "conectando" | "en-vivo" | "reconectando" | "desactivado";

type AuthCallback = (error: Error | null, data: { auth: string } | null) => void;

const BATCH_WINDOW_MS = 20;
const BATCH_MAX = 20; // tope del contrato (specs/008-tiempo-real-eficiente/backend.md)

/**
 * Pusher autoriza cada canal por separado; aquí las que llegan en una misma ventana corta
 * (spec 008) viajan en una sola petición. Un canal denegado solo falla su propia suscripción.
 */
function batchedAuthorizer() {
  let queue: { socketId: string; channelName: string; callback: AuthCallback }[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function send(batch: typeof queue) {
    const channels = [...new Set(batch.map((item) => item.channelName))];

    try {
      const response = await fetch("/api/broadcasting/auth/lote", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ socket_id: batch[0].socketId, canales: channels }),
      });
      if (!response.ok) throw new Error(`Canales no autorizados (${response.status})`);
      const { data } = (await response.json()) as { data: Record<string, { auth: string } | null> };

      for (const { channelName, callback } of batch) {
        const entry = data[channelName];
        if (entry) callback(null, entry);
        else callback(new Error(`Canal ${channelName} no autorizado`), null);
      }
    } catch (error) {
      for (const { callback } of batch) callback(error as Error, null);
    }
  }

  function flush() {
    timer = null;
    const pending = queue;
    queue = [];

    for (let index = 0; index < pending.length; index += BATCH_MAX) {
      void send(pending.slice(index, index + BATCH_MAX));
    }
  }

  return ({ socketId, channelName }: { socketId: string; channelName: string }, callback: AuthCallback) => {
    queue.push({ socketId, channelName, callback });
    timer ??= setTimeout(flush, BATCH_WINDOW_MS);
  };
}

/**
 * Conexión con Reverb (spec 005). La autorización de los canales privados pasa por el proxy
 * /api/broadcasting/auth/lote: el token sigue en la cookie httpOnly y nunca llega aquí.
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
      endpoint: "/api/broadcasting/auth/lote",
      transport: "ajax",
      customHandler: batchedAuthorizer(),
    },
  });
}
