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
 * Pestañas de salones con diseño segmentado moderno y ergonómico.
 */
export function RoomTabs({ rooms, current, canEdit, onSelect, onCreate, onEdit }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 touch-pan-x">
      {/* Contenedor segmentado de salones */}
      <div className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-2xs">
        {rooms.map((room) => {
          const active = room.id === current;
          return (
            <div
              key={room.id}
              className={`flex min-h-[40px] items-center rounded-xl transition-all duration-150 ${
                active
                  ? "bg-azul text-white shadow-xs font-bold"
                  : "text-slate-600 hover:bg-white/80 hover:text-tinta font-medium"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(room.id)}
                aria-pressed={active}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm select-none"
              >
                <span className={room.es_activo ? "" : "line-through opacity-70"}>
                  {room.nombre}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs tabular-nums font-bold ${
                    active ? "bg-white/20 text-white" : "bg-white text-slate-600 shadow-2xs"
                  }`}
                >
                  {room.mesas_count}
                </span>
              </button>

              {canEdit && active && (
                <button
                  type="button"
                  onClick={() => onEdit(room)}
                  aria-label={`Configurar ${room.nombre}`}
                  title="Configurar salón"
                  className="mr-1.5 flex h-7 w-7 items-center justify-center rounded-lg border-l border-white/20 pl-2 pr-1 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                >
                  <Icon name="editar" className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Botón para crear nuevo salón */}
      {canEdit && (
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-dashed border-azul/50 bg-white px-3.5 py-2 text-sm font-bold text-azul shadow-2xs transition-all hover:bg-azul/5 hover:border-azul active:scale-[0.98]"
        >
          <Icon name="mas" className="h-4 w-4" />
          <span>Salón</span>
        </button>
      )}
    </div>
  );
}
