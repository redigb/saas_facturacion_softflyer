"use client";

import { useQueryClient } from "@tanstack/react-query";
import type Echo from "laravel-echo";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useToast } from "@/app/panel/providers";
import { applyOrderEvent } from "@/app/panel/pedidos/queries";
import { createEcho, type RealtimeStatus } from "@/lib/realtime";

/** Eventos de los contratos de las specs 005, 006, 007 y 009. */
export type RealtimeEvents = {
  PlanoActualizado: { salon_id: number; version: number; usuario_id: number };
  CartaActualizada: { usuario_id: number };
  PedidoActualizado: { pedido_id: number; mesa_ids: number[]; estado: string; version: number; usuario_id: number };
  ComandaEnviada: { comanda_id: number; pedido_id: number; usuario_id: number };
  PlatoAnulado: { detalle_id: number; comanda_id: number; pedido_id: number; usuario_id: number };
  EstadoCocinaActualizado: { comanda_id: number; pedido_id: number; usuario_id: number };
  PlatoListo: { pedido_id: number; detalle_ids: number[]; mesa: string | null; platos: string[]; usuario_id: number };
  CajaActualizada: { sesion_id: number; usuario_id: number };
};

type EventName = keyof RealtimeEvents;
type Listener = (name: EventName, data: RealtimeEvents[EventName]) => void;

type RealtimeContextValue = {
  status: RealtimeStatus;
  userId: number;
  branches: { id: number }[];
  subscribe: (listener: Listener) => () => void;
  /** Escucha eventos de un canal privado extra (ej. el de una estación). */
  watch: (channel: string, events: EventName[], listener: Listener) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  status: "desactivado",
  userId: 0,
  branches: [],
  subscribe: () => () => {},
  watch: () => () => {},
});

const MENU_QUERIES = [["categorias"], ["productos"], ["estaciones"], ["modificador-grupos"], ["carta"]];

type Watcher = { channel: string; events: EventName[]; listener: Listener };

/**
 * Una conexión por pestaña, suscrita al canal de salón de cada sucursal del usuario (y a
 * su canal de mozo si toma pedidos). El WebSocket no es la fuente de verdad (Doc. 09 §3.5):
 * cada aviso solo hace que se vuelva a pedir el dato, y al reconectar se pide todo de nuevo.
 */
export function RealtimeProvider({
  branches,
  userId,
  takesOrders,
  children,
}: {
  branches: { id: number }[];
  userId: number;
  takesOrders: boolean;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  // Sin clave de Reverb el tiempo real está desactivado y todo sigue por la API.
  const [status, setStatus] = useState<RealtimeStatus>(process.env.NEXT_PUBLIC_REVERB_KEY ? "conectando" : "desactivado");
  const listeners = useRef(new Set<Listener>());
  const echoRef = useRef<Echo<"reverb"> | null>(null);
  const watchers = useRef(new Set<Watcher>());
  const branchKey = branches.map((branch) => branch.id).join(",");
  const notifyRef = useRef<(data: RealtimeEvents["PlatoListo"]) => void>(() => {});

  useEffect(() => {
    notifyRef.current = (data) =>
      toast({
        tone: "ok",
        message: `${data.mesa ? `Mesa ${data.mesa}` : "Para llevar"}: ${data.platos.join(", ")} ${data.platos.length > 1 ? "listos" : "listo"}`,
        action: { label: "Ver", run: () => router.push(`/panel/pedidos/${data.pedido_id}`) },
      });
  });

  useEffect(() => {
    const echo = createEcho();
    if (!echo) return;
    echoRef.current = echo;

    const emit: Listener = (name, data) => {
      if (data.usuario_id === userId) return; // mis propios cambios ya los tengo
      if (name === "CartaActualizada") {
        MENU_QUERIES.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }));
      }
      if (name === "PedidoActualizado" || name === "PlatoListo") {
        // Se pide solo el pedido que cambió; ni la lista completa ni los planos (spec 008).
        void applyOrderEvent(queryClient, data as { pedido_id: number; estado?: string; version?: number });
      }
      if (name === "PlatoListo") notifyRef.current(data as RealtimeEvents["PlatoListo"]);
      listeners.current.forEach((listener) => listener(name, data));
    };

    let wasConnected = false;
    echo.connector.pusher.connection.bind("state_change", ({ current }: { current: string }) => {
      if (current === "connected") {
        // Volvió la conexión: lo que pasó mientras estaba caída se recupera pidiendo de nuevo.
        if (wasConnected) void queryClient.invalidateQueries();
        wasConnected = true;
        setStatus("en-vivo");
      } else if (current === "connecting" || current === "unavailable" || current === "disconnected") {
        setStatus(wasConnected ? "reconectando" : "conectando");
      }
    });

    const ids = branchKey.split(",").filter(Boolean);
    const channels = ids.map((id) => `sucursal.${id}.salon`);
    for (const name of channels) {
      echo
        .private(name)
        .listen(".PlanoActualizado", (data: RealtimeEvents["PlanoActualizado"]) => emit("PlanoActualizado", data))
        .listen(".CartaActualizada", (data: RealtimeEvents["CartaActualizada"]) => emit("CartaActualizada", data))
        .listen(".PedidoActualizado", (data: RealtimeEvents["PedidoActualizado"]) => emit("PedidoActualizado", data));
    }

    // Canal personal del mozo: "plato listo" (spec 007).
    const waiterChannels = takesOrders ? ids.map((id) => `sucursal.${id}.mozo.${userId}`) : [];
    for (const name of waiterChannels) {
      echo.private(name).listen(".PlatoListo", (data: RealtimeEvents["PlatoListo"]) => emit("PlatoListo", data));
    }

    // Canales que alguna pantalla pidió antes de que la conexión existiera.
    const pending = watchers.current;
    pending.forEach((watcher) => attach(echo, watcher));

    return () => {
      [...channels, ...waiterChannels, ...[...pending].map((watcher) => watcher.channel)].forEach((name) => echo.leave(name));
      echo.disconnect();
      echoRef.current = null;
    };
  }, [branchKey, userId, takesOrders, queryClient]);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const watch = useCallback((channel: string, events: EventName[], listener: Listener) => {
    const watcher: Watcher = { channel, events, listener };
    watchers.current.add(watcher);
    if (echoRef.current) attach(echoRef.current, watcher);

    return () => {
      watchers.current.delete(watcher);
      const echo = echoRef.current;
      if (echo && ![...watchers.current].some((other) => other.channel === channel)) echo.leave(channel);
    };
  }, []);

  const value = useMemo(() => ({ status, userId, branches, subscribe, watch }), [status, userId, branches, subscribe, watch]);

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

function attach(echo: Echo<"reverb">, { channel, events, listener }: Watcher) {
  const subscription = echo.private(channel);
  for (const event of events) {
    subscription.listen(`.${event}`, (data: RealtimeEvents[EventName]) => listener(event, data));
  }
}

export function useRealtime() {
  return useContext(RealtimeContext);
}

/** Escucha un evento de otras personas (los propios se filtran). */
export function useRealtimeEvent<K extends keyof RealtimeEvents>(name: K, handler: (data: RealtimeEvents[K]) => void) {
  const { subscribe } = useContext(RealtimeContext);
  const latest = useRef(handler);

  useEffect(() => {
    latest.current = handler;
  });

  useEffect(
    () =>
      subscribe((event, data) => {
        if (event === name) latest.current(data as RealtimeEvents[K]);
      }),
    [subscribe, name],
  );
}

/** Indicador discreto para la cabecera: "En vivo" o "Reconectando…". */
export function RealtimeIndicator() {
  const { status } = useContext(RealtimeContext);
  if (status === "desactivado") return null;

  const style = {
    "en-vivo": { dot: "bg-emerald-500", label: "En vivo" },
    conectando: { dot: "bg-slate-300 animate-pulse", label: "Conectando…" },
    reconectando: { dot: "bg-amarillo animate-pulse", label: "Reconectando…" },
  }[status];

  return (
    <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 sm:flex" role="status" title="Actualizaciones al instante">
      <span className={`h-2 w-2 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
