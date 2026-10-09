"use client";

import { useState } from "react";

import { usePermissions } from "@/app/panel/carta/menu-editor";
import { errorMessage, useSaveStation, useStations } from "@/app/panel/carta/queries";
import { Skeleton } from "@/app/panel/carta/ui";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { Button, EmptyState, Input, Switch } from "@/components/ui";
import { ApiRequestError } from "@/lib/browser-api";
import type { Station } from "@/lib/schemas/carta";

/** Estaciones: a qué pantalla o comanda de cocina llega cada plato (Cocina, Bar, Parrilla…). */
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
      if (!(caught instanceof ApiRequestError && caught.status === 422)) {
        toast({ tone: "error", message: errorMessage(caught) });
      }
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-azul/10 text-azul">
            <Icon name="cocina" className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-tinta">Distribución de Comandas</h3>
            <p className="mt-1 text-sm text-slate-500">
              Cada plato llega a una estación específica. Si tienes cocina y bar, el pedido de un lomo y una bebida se
              separa automáticamente para cada área operativa.
            </p>
          </div>
        </div>

        {can.create && (
          <form onSubmit={create} noValidate className="mt-6 flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Cocina Caliente, Bar, Parrilla, Postres…"
                aria-label="Nombre de la nueva estación"
                hasError={Boolean(error)}
                className="h-12 text-[15px]"
              />
              {error ? <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p> : null}
            </div>
            <Button type="submit" isLoading={save.isPending} size="lg" className="h-12 px-6">
              <Icon name="mas" className="h-4.5 w-4.5" />
              <span>Agregar estación</span>
            </Button>
          </form>
        )}
      </div>

      <div className="mt-6">
        {stations.isPending ? (
          <Skeleton className="h-40 rounded-3xl" />
        ) : stations.data?.length === 0 ? (
          <EmptyState
            icon="cocina"
            title="Todavía no hay estaciones registradas"
            description="Comienza creando las áreas de preparación de tu restaurante (ej. Cocina, Bar, Horno)."
          />
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xs">
            {stations.data?.map((station) => (
              <StationRow key={station.id} station={station} />
            ))}
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
      toast({
        tone: "error",
        message:
          error instanceof ApiRequestError && error.detalles?.nombre
            ? error.detalles.nombre[0]
            : errorMessage(error),
      });
    }
  }

  return (
    <li className="flex items-center gap-4 px-6 py-4.5 transition-colors hover:bg-slate-50/70">
      <div
        className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl transition-colors ${
          station.es_activa ? "bg-azul/10 text-azul" : "bg-slate-100 text-slate-400"
        }`}
      >
        <Icon name="cocina" className="h-6 w-6" />
      </div>

      {draft !== null ? (
        <div className="flex-1">
          <Input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={rename}
            onKeyDown={(event) => {
              if (event.key === "Enter") void rename();
              if (event.key === "Escape") setDraft(null);
            }}
            aria-label="Nuevo nombre de la estación"
            className="h-11 text-[15px]"
          />
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <span
            className={`block truncate text-lg font-bold transition-colors ${
              station.es_activa ? "text-tinta" : "text-slate-400 line-through"
            }`}
          >
            {station.nombre}
          </span>
          <span className="text-xs text-slate-400">
            {station.es_activa ? "Estación activa para comandas" : "Estación pausada"}
          </span>
        </div>
      )}

      {can.edit && draft === null ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDraft(station.nombre)}
            aria-label={`Renombrar ${station.nombre}`}
            title="Editar nombre"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-azul active:scale-95"
          >
            <Icon name="editar" className="h-5 w-5" />
          </button>

          <Switch
            checked={station.es_activa}
            onCheckedChange={(checked) => save.mutate({ id: station.id, body: { es_activa: checked } })}
            aria-label={station.es_activa ? `Desactivar ${station.nombre}` : `Activar ${station.nombre}`}
            title={station.es_activa ? "Estación operativa" : "Estación desactivada"}
          />
        </div>
      ) : null}
    </li>
  );
}
