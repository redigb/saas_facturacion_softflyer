"use client";

import { useState } from "react";

import { usePermissions } from "@/app/panel/carta/menu-editor";
import { errorMessage, useSaveStation, useStations } from "@/app/panel/carta/queries";
import { inputClass, primaryButton, Skeleton } from "@/app/panel/carta/ui";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { ApiRequestError } from "@/lib/browser-api";
import type { Station } from "@/lib/schemas/carta";

/** Estaciones: a qué pantalla o impresora de cocina llega cada plato (Cocina, Bar, Parrilla…). */
export function StationsTab() {
  const can = usePermissions();
  const stations = useStations();
  const save = useSaveStation();
  const toast = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Ponle un nombre a la estación.");
      return;
    }
    try {
      await save.mutateAsync({ body: { nombre: name.trim() } });
      setName("");
      setError(null);
    } catch (caught) {
      setError(caught instanceof ApiRequestError && caught.detalles?.nombre ? caught.detalles.nombre[0] : null);
      if (!(caught instanceof ApiRequestError && caught.status === 422)) toast({ tone: "error", message: errorMessage(caught) });
    }
  }

  return (
    <div className="max-w-2xl">
      <p className="text-slate-600">
        Cada plato llega a una estación. Si tienes cocina y bar, el pedido de un lomo y una chicha se separa solo: el lomo a cocina y la
        chicha al bar.
      </p>

      {can.create && (
        <form onSubmit={create} noValidate className="mt-5 flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. Cocina, Bar, Parrilla"
              aria-label="Nombre de la nueva estación"
              aria-invalid={error ? true : undefined}
              className={inputClass}
            />
            {error && <p className="mt-1.5 text-sm font-semibold text-red-600">{error}</p>}
          </div>
          <button type="submit" disabled={save.isPending} className={`${primaryButton} py-3`}>
            <Icon name="mas" className="h-4 w-4" />
            Agregar
          </button>
        </form>
      )}

      <div className="mt-5">
        {stations.isPending ? (
          <Skeleton className="h-32" />
        ) : stations.data?.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-8 text-center text-slate-500">
            Todavía no hay estaciones.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
            {stations.data?.map((station) => <StationRow key={station.id} station={station} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

function StationRow({ station }: { station: Station }) {
  const can = usePermissions();
  const save = useSaveStation();
  const toast = useToast();
  const [draft, setDraft] = useState<string | null>(null);

  async function rename() {
    const name = draft?.trim();
    setDraft(null);
    if (!name || name === station.nombre) return;
    try {
      await save.mutateAsync({ id: station.id, body: { nombre: name } });
    } catch (error) {
      toast({ tone: "error", message: error instanceof ApiRequestError && error.detalles?.nombre ? error.detalles.nombre[0] : errorMessage(error) });
    }
  }

  return (
    <li className="flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-slate-50/60">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${station.es_activa ? "bg-azul/10 text-azul" : "bg-slate-100 text-slate-400"}`}>
        <Icon name="cocina" className="h-4.5 w-4.5" />
      </div>

      {draft !== null ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={rename}
          onKeyDown={(event) => {
            if (event.key === "Enter") void rename();
            if (event.key === "Escape") setDraft(null);
          }}
          aria-label="Nuevo nombre de la estación"
          className={`${inputClass} py-1.5`}
        />
      ) : (
        <div className="min-w-0 flex-1">
          <span className={`block font-bold ${station.es_activa ? "text-tinta" : "text-slate-400 line-through"}`}>
            {station.nombre}
          </span>
        </div>
      )}

      {can.edit && draft === null && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDraft(station.nombre)}
            aria-label={`Renombrar ${station.nombre}`}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-azul active:scale-95"
          >
            <Icon name="editar" className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={station.es_activa}
            aria-label={station.es_activa ? `Desactivar ${station.nombre}` : `Activar ${station.nombre}`}
            title={station.es_activa ? "Estación operativa" : "Estación desactivada"}
            onClick={() => save.mutate({ id: station.id, body: { es_activa: !station.es_activa } })}
            className={`relative h-7.5 w-13 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40 active:scale-[0.96] ${
              station.es_activa ? "bg-emerald-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-6.5 w-6.5 rounded-full bg-white shadow-xs transition-transform duration-150 ${
                station.es_activa ? "translate-x-5.5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      )}
    </li>
  );
}
