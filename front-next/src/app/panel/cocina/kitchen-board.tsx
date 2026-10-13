"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useStations } from "@/app/panel/carta/queries";
import { Skeleton } from "@/app/panel/carta/ui";
import { boardKey, useBoard, useKitchenChange, type Station } from "@/app/panel/cocina/queries";
import { minutesSince, useNow } from "@/app/panel/pedidos/use-now";
import { useRealtime } from "@/app/panel/realtime";
import { Icon } from "@/components/icons";
import { Button, EmptyState } from "@/components/ui";
import { nextKitchenState, type KitchenState, type Ticket } from "@/lib/schemas/cocina";

const STATION_KEY = "sf-cocina-estacion";
const SOUND_KEY = "sf-cocina-sonido";

/**
 * Pantalla de cocina (spec 007): comandas de una estación, la más antigua primero.
 * Pensada para quedarse abierta todo el turno en una tablet o monitor táctil.
 */
export function KitchenBoard() {
  const [station, setStation] = useStoredStation();
  const stations = useStations();

  if (station === null) {
    return <StationPicker stations={stations.data ?? []} loading={stations.isPending} onPick={setStation} />;
  }

  const name = station === "general" ? "General" : (stations.data?.find((item) => item.id === station)?.nombre ?? "Estación");
  return <Board key={String(station)} station={station} name={name} onChangeStation={() => setStation(null)} />;
}

function Board({ station, name, onChangeStation }: { station: Station; name: string; onChangeStation: () => void }) {
  const { status, branches, watch } = useRealtime();
  const queryClient = useQueryClient();
  const board = useBoard(station, status === "en-vivo");
  const change = useKitchenChange(station);
  const now = useNow(15_000);
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const [sound, setSound] = useStoredSound();
  const audio = useRef<AudioContext | null>(null);

  // Comandas nuevas, platos anulados y cambios de otras pantallas de la misma estación.
  useEffect(() => {
    const branch = branches[0]?.id;
    if (!branch) return;

    return watch(`sucursal.${branch}.estacion.${station}`, ["ComandaEnviada", "PlatoAnulado", "EstadoCocinaActualizado"], (event, data) => {
      void queryClient.invalidateQueries({ queryKey: boardKey(station) });
      if (event === "ComandaEnviada") {
        const id = (data as { comanda_id: number }).comanda_id;
        setFresh((current) => new Set(current).add(id));
        setTimeout(() => setFresh((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        }), 8_000);
        if (audio.current) beep(audio.current);
      }
    });
  }, [branches, station, watch, queryClient]);

  function toggleSound() {
    // Los navegadores solo permiten sonido después de un toque del usuario.
    if (!sound) {
      audio.current ??= new AudioContext();
      beep(audio.current);
    }
    setSound(!sound);
  }

  useEffect(() => {
    if (!sound) audio.current = null;
  }, [sound]);

  const tickets = board.data ?? [];
  const pending = tickets.filter((ticket) => !ticket.completa);
  const done = tickets.filter((ticket) => ticket.completa);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Cocina · {name}</h1>
          <p className="text-sm text-slate-500">
            {pending.length === 0 ? "Sin comandas pendientes." : `${pending.length} comanda${pending.length === 1 ? "" : "s"} pendiente${pending.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <Button variant="secondary" onClick={toggleSound} aria-pressed={sound}>
          {sound ? "🔔 Sonido activado" : "🔕 Activar sonido"}
        </Button>
        <Button variant="ghost" onClick={onChangeStation}>
          Cambiar estación
        </Button>
      </div>

      {status !== "en-vivo" && status !== "desactivado" && (
        <p className="mt-3 rounded-xl bg-amarillo/25 px-4 py-2 text-sm font-semibold text-tinta">Sin conexión en vivo: el tablero se actualiza cada 15 segundos hasta que vuelva.</p>
      )}

      {board.isPending ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-64" />
          ))}
        </div>
      ) : board.isError ? (
        <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 font-semibold text-red-700">No pudimos cargar las comandas: {board.error.message}</p>
      ) : pending.length === 0 && done.length === 0 ? (
        <EmptyState className="mt-6" icon="cocina" title="Todo al día" description="Las comandas nuevas aparecen aquí al instante." />
      ) : (
        <>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {pending.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} now={now} fresh={fresh.has(ticket.id)} onItem={(itemId, state) => change.mutate({ kind: "item", itemId, state })} onAllReady={() => change.mutate({ kind: "ticket", ticketId: ticket.id })} />
            ))}
          </ul>

          {done.length > 0 && (
            <section className="mt-8">
              <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase">Recién listos</h2>
              <ul className="mt-2 flex gap-3 overflow-x-auto pb-1 touch-pan-x">
                {done.map((ticket) => (
                  <li key={ticket.id} className="flex min-w-56 items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <span className="font-bold text-tinta">{label(ticket)}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        ticket.detalles
                          .filter((item) => !item.anulado && item.estado_cocina === "LISTO")
                          .forEach((item) => change.mutate({ kind: "item", itemId: item.id, state: "EN_PREPARACION" }))
                      }
                    >
                      Deshacer
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

const ITEM_STYLE = {
  PENDIENTE: { card: "border-slate-200 bg-white", badge: "En cola" },
  EN_PREPARACION: { card: "border-amarillo bg-amarillo/15", badge: "Preparando" },
  LISTO: { card: "border-emerald-400 bg-emerald-50", badge: "Listo" },
  ENTREGADO: { card: "border-slate-200 bg-slate-50 opacity-60", badge: "Entregado" },
} as const;

function TicketCard({ ticket, now, fresh, onItem, onAllReady }: { ticket: Ticket; now: number; fresh: boolean; onItem: (itemId: number, state: KitchenState) => void; onAllReady: () => void }) {
  const waiting = minutesSince(ticket.enviada_en, now);
  const urgency = waiting >= 20 ? "bg-red-600 text-white" : waiting >= 10 ? "bg-amarillo text-tinta" : "bg-slate-100 text-slate-600";

  return (
    <li className={`flex flex-col rounded-2xl border-2 bg-white shadow-sm transition-all ${fresh ? "border-celeste ring-4 ring-celeste/40" : "border-slate-200"}`}>
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-tinta">{label(ticket)}</p>
          <p className="truncate text-xs text-slate-500">
            #{ticket.pedido.numero} · {ticket.enviada_por} {ticket.numero > 1 ? `· tanda ${ticket.numero}` : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums ${urgency}`}>{waiting} min</span>
      </header>

      <ul className="flex-1 space-y-2 p-3">
        {ticket.detalles.map((item) => {
          const next = item.anulado ? null : nextKitchenState(item.estado_cocina);
          const style = ITEM_STYLE[item.estado_cocina];

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => next && onItem(item.id, next)}
                disabled={!next}
                aria-label={`${item.nombre}: ${item.anulado ? "anulado" : style.badge}`}
                className={`flex min-h-14 w-full items-start gap-3 rounded-xl border-2 px-3 py-2 text-left transition-all active:scale-[0.98] disabled:cursor-default ${item.anulado ? "border-red-200 bg-red-50" : style.card
                  }`}
              >
                <span className={`text-2xl font-bold tabular-nums ${item.anulado ? "text-red-400 line-through" : "text-tinta"}`}>{Number(item.cantidad)}</span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-base font-bold ${item.anulado ? "text-red-500 line-through" : "text-tinta"}`}>{item.nombre}</span>
                  {item.modificadores.length > 0 && <span className="block text-sm font-semibold text-azul">{item.modificadores.join(" · ")}</span>}
                  {item.notas && <span className="mt-0.5 block rounded-md bg-amarillo/40 px-1.5 text-sm font-bold text-tinta">⚠ {item.notas}</span>}
                </span>
                <span className="shrink-0 text-xs font-bold text-slate-500 uppercase">{item.anulado ? "Anulado" : style.badge}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="p-3 pt-0">
        <Button size="lg" className="w-full" onClick={onAllReady}>
          <Icon name="check" className="h-5 w-5" />
          Todo listo
        </Button>
      </div>
    </li>
  );
}

function StationPicker({ stations, loading, onPick }: { stations: { id: number; nombre: string; es_activa: boolean }[]; loading: boolean; onPick: (station: Station) => void }) {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">¿Qué estación es esta pantalla?</h1>
      <p className="mt-1 text-sm text-slate-500">Se recuerda en este dispositivo. Puedes cambiarla cuando quieras.</p>
      {loading ? (
        <Skeleton className="mt-6 h-40" />
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {stations
            .filter((item) => item.es_activa)
            .map((item) => (
              <li key={item.id}>
                <Button variant="secondary" size="lg" className="h-20 w-full text-lg" onClick={() => onPick(item.id)}>
                  {item.nombre}
                </Button>
              </li>
            ))}
          <li>
            <Button variant="secondary" size="lg" className="h-20 w-full text-lg" onClick={() => onPick("general")}>
              General (platos sin estación)
            </Button>
          </li>
        </ul>
      )}
    </div>
  );
}

function label(ticket: Ticket): string {
  return ticket.pedido.mesa ? `Mesa ${ticket.pedido.mesa}` : `Para llevar #${ticket.pedido.numero}`;
}

function beep(context: AudioContext) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.2, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.4);
}

// --- Preferencias recordadas en el dispositivo (sin desajuste al hidratar) ---------------

const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento la preferencia dura hasta recargar.
  }
  listeners.forEach((listener) => listener());
}

function useStoredStation(): [Station | null, (station: Station | null) => void] {
  const raw = useSyncExternalStore(subscribe, () => readStorage(STATION_KEY), () => null);
  const station: Station | null = raw === null ? null : raw === "general" ? "general" : Number(raw);
  return [station, (value) => writeStorage(STATION_KEY, value === null ? null : String(value))];
}

function useStoredSound(): [boolean, (on: boolean) => void] {
  // El sonido no se activa solo al recargar: el navegador exige un toque primero.
  const [on, setOn] = useState(false);
  return [on, (value) => {
    setOn(value);
    writeStorage(SOUND_KEY, value ? "1" : null);
  }];
}

