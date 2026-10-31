"use client";

import { useState } from "react";

import { Skeleton, Drawer } from "@/app/panel/carta/ui";
import { useKitchenStations, type Station } from "@/app/panel/cocina/queries";
import { usePreparation, usePreparations, useSavePreparation } from "@/app/panel/preparacion/queries";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { Button, EmptyState, Input, ProductAvatar } from "@/components/ui";
import { ApiRequestError } from "@/lib/browser-api";
import type { Preparation, PreparationIngredient, PreparationSummary } from "@/lib/schemas/preparacion";

/** Catálogo de unidades de medida (spec 038). */
const UNITS = ["ONZ", "ML", "GR", "KG"] as const;

export function PreparationView() {
  const stations = useKitchenStations();
  const [station, setStation] = useState<Station | null>(null);
  const [selected, setSelected] = useState<PreparationSummary | null>(null);

  const available = stations.data ?? [];
  const selectedStation = station !== null && available.some((item) => item.id === station) ? station : (available[0]?.id ?? null);
  const preparations = usePreparations(selectedStation);

  if (stations.isPending) return <Skeleton className="h-64 rounded-3xl" />;
  if (stations.isError) return <ErrorBox message={stations.error.message} />;
  if ((stations.data ?? []).length === 0) {
    return <EmptyState icon="cocina" title="Sin estación asignada" description="Pídele al administrador que te asigne una estación KDS para consultar sus preparaciones." />;
  }

  return (
    <div>
      <div>
        <p className="text-xs font-bold tracking-widest text-azul uppercase">Guía del equipo</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Preparación</h1>
        <p className="mt-1 text-sm text-slate-500">Ingredientes, procedimiento y anotaciones de cada plato o bebida.</p>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 touch-pan-x" aria-label="Estaciones de preparación">
        {(stations.data ?? []).map((item) => (
          <Button key={item.id} variant={selectedStation === item.id ? "primary" : "secondary"} onClick={() => setStation(item.id)} className="shrink-0">
            {item.nombre}
          </Button>
        ))}
      </div>

      {preparations.isPending ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}
        </div>
      ) : preparations.isError ? (
        <ErrorBox className="mt-6" message={preparations.error.message} />
      ) : (preparations.data ?? []).length === 0 ? (
        <EmptyState className="mt-6" icon="plato" title="Sin platos en esta estación" description="Asigna platos o bebidas a esta estación desde Carta para que aparezcan aquí." />
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(preparations.data ?? []).map((item) => (
            <li key={item.producto.id}>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="flex min-h-28 w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs transition-all hover:border-azul/30 hover:shadow-sm active:scale-[0.99] focus-visible:ring-4 focus-visible:ring-celeste/30 focus-visible:outline-none"
              >
                <ProductAvatar tipo={item.producto.tipo} imagenUrl={item.producto.imagen_url} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold text-tinta">{item.producto.nombre}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{item.producto.categoria ?? (item.producto.tipo === "BEBIDA" ? "Bebida" : "Plato")}</span>
                  <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${item.completa ? "bg-emerald-100 text-emerald-700" : "bg-amarillo/25 text-tinta"}`}>
                    {item.completa ? "Receta completa" : "Por completar"}
                  </span>
                </span>
                <Icon name="editar" className="h-5 w-5 shrink-0 text-slate-400" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && selectedStation !== null && (
        <PreparationDrawer key={selected.producto.id} summary={selected} station={selectedStation} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function PreparationDrawer({ summary, station, onClose }: { summary: PreparationSummary; station: Station; onClose: () => void }) {
  const preparation = usePreparation(summary.producto.id);

  return (
    <Drawer title={summary.producto.nombre} open onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}>
      {preparation.isPending ? <Skeleton className="h-80 rounded-2xl" /> : preparation.isError ? <ErrorBox message={preparation.error.message} /> : (
        <PreparationForm key={preparation.data.actualizado_en ?? "nueva"} preparation={preparation.data} station={station} onClose={onClose} />
      )}
    </Drawer>
  );
}

function PreparationForm({ preparation, station, onClose }: { preparation: Preparation; station: Station; onClose: () => void }) {
  const toast = useToast();
  const save = useSavePreparation(station, preparation.producto.id);
  const [ingredients, setIngredients] = useState<PreparationIngredient[]>(preparation.ingredientes);
  const [procedure, setProcedure] = useState(preparation.procedimiento ?? "");
  const [notes, setNotes] = useState(preparation.notas ?? "");
  const [error, setError] = useState<string | null>(null);

  function updateIngredient(index: number, field: keyof PreparationIngredient, value: string | null) {
    setIngredients((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleaned = ingredients
      .map((item) => ({ nombre: item.nombre.trim(), cantidad: item.cantidad?.trim() || null, unidad: item.unidad ?? null }))
      .filter((item) => item.nombre !== "");

    try {
      await save.mutateAsync({ ingredientes: cleaned, procedimiento: procedure.trim() || null, notas: notes.trim() || null });
      toast({ tone: "ok", message: "Preparación guardada." });
      onClose();
    } catch (reason) {
      setError(reason instanceof ApiRequestError ? reason.message : "No pudimos guardar la preparación. Inténtalo nuevamente.");
    }
  }

  return (
    <form id="preparacion-form" onSubmit={submit} className="space-y-6">
      <div className="flex items-center gap-3 rounded-2xl bg-niebla p-3">
        <ProductAvatar tipo={preparation.producto.tipo} imagenUrl={preparation.producto.imagen_url} size="lg" />
        <div>
          <p className="font-bold text-tinta">{preparation.producto.nombre}</p>
          <p className="text-xs text-slate-500">{preparation.estacion.nombre}</p>
        </div>
      </div>

      <fieldset>
        <div className="flex items-center justify-between gap-3">
          <legend className="text-sm font-bold text-tinta">Ingredientes</legend>
          <Button type="button" variant="secondary" size="sm" onClick={() => setIngredients((current) => [...current, { nombre: "", cantidad: null, unidad: "GR" }])}>
            <Icon name="mas" className="h-4 w-4" /> Agregar
          </Button>
        </div>
        <p className="mt-1 text-xs text-slate-500">Puedes escribir cantidades prácticas como “250” y elegir la unidad (onza, mililitro, gramo o kilo).</p>
        {ingredients.length === 0 ? (
          <button type="button" onClick={() => setIngredients([{ nombre: "", cantidad: null, unidad: "GR" }])} className="mt-3 min-h-14 w-full rounded-xl border border-dashed border-slate-300 px-4 text-sm font-semibold text-slate-500 active:bg-slate-50">
            Agregar el primer ingrediente
          </button>
        ) : (
          <div className="mt-3 space-y-3">
            {ingredients.map((ingredient, index) => (
              <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_44px] gap-2">
                <Input value={ingredient.nombre} onChange={(event) => updateIngredient(index, "nombre", event.target.value)} placeholder="Ingrediente" aria-label={`Ingrediente ${index + 1}`} />
                <Input value={ingredient.cantidad ?? ""} onChange={(event) => updateIngredient(index, "cantidad", event.target.value)} placeholder="Cantidad" aria-label={`Cantidad del ingrediente ${index + 1}`} />
                <select
                  value={ingredient.unidad ?? ""}
                  onChange={(event) => updateIngredient(index, "unidad", event.target.value === "" ? null : event.target.value)}
                  aria-label={`Unidad del ingrediente ${index + 1}`}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2.5 text-base text-tinta focus:border-azul focus:ring-4 focus:ring-azul/10 focus:outline-none"
                >
                  <option value="">Unidad</option>
                  {UNITS.map((unit) => <option key={unit} value={unit}>{unit === "ONZ" ? "ONZ" : unit.toLowerCase()}</option>)}
                </select>
                <Button type="button" variant="icon" onClick={() => setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Quitar ingrediente ${index + 1}`}>
                  <Icon name="basura" className="h-5 w-5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-sm font-bold text-tinta">Procedimiento</span>
        <textarea value={procedure} onChange={(event) => setProcedure(event.target.value)} rows={7} placeholder="Describe los pasos en orden…" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-tinta placeholder:text-slate-400 focus:border-azul focus:ring-4 focus:ring-azul/10 focus:outline-none" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-bold text-tinta">Anotaciones del equipo</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Ej. usar wok bien caliente, presentación, punto de cocción…" className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-tinta placeholder:text-slate-400 focus:border-azul focus:ring-4 focus:ring-azul/10 focus:outline-none" />
      </label>

      {preparation.actualizado_en && (
        <p className="text-xs text-slate-500">Última actualización: {new Date(preparation.actualizado_en).toLocaleString("es-PE")} {preparation.actualizado_por ? `por ${preparation.actualizado_por}` : ""}</p>
      )}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      <Button type="submit" className="w-full" size="lg" isLoading={save.isPending}>Guardar preparación</Button>
    </form>
  );
}

function ErrorBox({ message, className = "" }: { message: string; className?: string }) {
  return <p className={`rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700 ${className}`}>No pudimos cargar la información: {message}</p>;
}
