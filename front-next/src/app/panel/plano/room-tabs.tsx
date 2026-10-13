"use client";

import { Icon } from "@/components/icons";
import type { Room } from "@/lib/schemas/plano";

type Props = {
  rooms: Room[];
  current: number;
  canEdit: boolean;
  onSelect: (id: number) => void;
  onCreate: () => void;
  onEdit: (room: Room) => void;
};

/**
 * Pestañas de salones con diseño ergonómico, estilizado y unificado.
 */
export function RoomTabs({ rooms, current, canEdit, onSelect, onCreate, onEdit }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 touch-pan-x">
      {rooms.map((room) => {
        const active = room.id === current;
        if (active) {
          return (
            <div
              key={room.id}
              className="flex h-10 items-center gap-2 rounded-xl bg-azul pl-3.5 pr-2 font-bold text-white shadow-xs"
            >
              <button
                type="button"
                onClick={() => onSelect(room.id)}
                aria-pressed={true}
                className="flex items-center gap-2 select-none"
              >
                <span className={room.es_activo ? "" : "line-through opacity-70"}>
                  {room.nombre}
                </span>
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-bold tabular-nums text-white">
                  {room.mesas_count}
                </span>
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(room)}
                  aria-label={`Configurar ${room.nombre}`}
                  title="Configurar salón"
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-white/15 text-white transition-colors hover:bg-white/30"
                >
                  <Icon name="editar" className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        }

        return (
          <div
            key={room.id}
            className="flex h-10 items-center rounded-xl border border-slate-200/90 bg-white px-3.5 font-semibold text-slate-700 shadow-2xs transition-colors hover:border-slate-300 hover:bg-slate-50/80 hover:text-azul"
          >
            <button
              type="button"
              onClick={() => onSelect(room.id)}
              aria-pressed={false}
              className="flex items-center gap-2 select-none"
            >
              <span className={room.es_activo ? "" : "line-through opacity-70"}>
                {room.nombre}
              </span>
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full border border-slate-200/60 bg-slate-100 px-1.5 text-xs font-bold tabular-nums text-slate-600">
                {room.mesas_count}
              </span>
            </button>
          </div>
        );
      })}

      {/* Botón para crear nuevo salón */}
      {canEdit && (
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-azul/60 bg-white px-3.5 text-sm font-bold text-azul shadow-2xs transition-all hover:border-azul hover:bg-azul/5 active:scale-[0.98]"
        >
          <Icon name="mas" className="h-4 w-4" />
          <span>Salón</span>
        </button>
      )}
    </div>
  );
}
