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

/** Pestañas de salones; en celular se deslizan en horizontal. */
export function RoomTabs({ rooms, current, canEdit, onSelect, onCreate, onEdit }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 touch-pan-x">
      {rooms.map((room) => {
        const active = room.id === current;
        return (
          <div
            key={room.id}
            className={`flex min-h-[44px] shrink-0 items-center rounded-xl transition-all ${
              active ? "bg-azul text-white shadow-sm" : "bg-white text-tinta ring-1 ring-slate-200 hover:ring-slate-300"
            }`}
          >
            <button type="button" onClick={() => onSelect(room.id)} aria-pressed={active} className="flex items-center gap-2 py-2.5 pr-2 pl-4 text-sm font-bold">
              <span className={room.es_activo ? "" : "line-through opacity-70"}>{room.nombre}</span>
              <span className={`rounded-md px-1.5 text-xs tabular-nums ${active ? "bg-white/20" : "bg-niebla text-slate-500"}`}>{room.mesas_count}</span>
            </button>
            {canEdit && active && (
              <button type="button" onClick={() => onEdit(room)} aria-label={`Configurar ${room.nombre}`} className="mr-1 rounded-lg p-2 text-white/80 hover:bg-white/15 hover:text-white">
                <Icon name="editar" className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
      {canEdit && (
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-bold text-azul ring-1 ring-azul/30 transition-all hover:bg-azul/5 active:scale-[0.98]"
        >
          <Icon name="mas" className="h-4 w-4" />
          Salón
        </button>
      )}
    </div>
  );
}
