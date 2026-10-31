"use client";

import { useMemo, useState } from "react";

import { useCategories, useProducts, useSavePromotion } from "@/app/panel/carta/queries";
import { Drawer, Field, Skeleton, inputClass, primaryButton, secondaryButton } from "@/app/panel/carta/ui";
import { useToast } from "@/app/panel/providers";
import { Input } from "@/components/ui";
import { ApiRequestError } from "@/lib/browser-api";
import { WEEKDAYS, type Promotion, type PromotionBody } from "@/lib/schemas/promociones";

/** Alta y edición de una promoción (spec 039). */
export function PromotionDrawer({ promotion, onClose }: { promotion?: Promotion; onClose: () => void }) {
  const products = useProducts();
  const categories = useCategories();
  const save = useSavePromotion();
  const toast = useToast();

  const [nombre, setNombre] = useState(promotion?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(promotion?.descripcion ?? "");
  const [tipo, setTipo] = useState<"PORCENTAJE" | "PRECIO_FIJO">(promotion?.tipo ?? "PORCENTAJE");
  const [valor, setValor] = useState(promotion ? String(Number(promotion.valor)) : "");
  const [desde, setDesde] = useState(promotion ? localInput(promotion.desde) : `${todayInLima()}T00:00`);
  const [hasta, setHasta] = useState(promotion ? localInput(promotion.hasta) : `${todayInLima()}T23:59`);
  const [days, setDays] = useState<Set<number>>(() =>
    new Set<number>(promotion && promotion.dias_semana.length > 0 ? promotion.dias_semana : WEEKDAYS.map((day) => day.value)),
  );
  const [useHours, setUseHours] = useState(promotion?.hora_inicio != null && promotion?.hora_fin != null);
  const [horaInicio, setHoraInicio] = useState(promotion?.hora_inicio?.slice(0, 5) ?? "18:00");
  const [horaFin, setHoraFin] = useState(promotion?.hora_fin?.slice(0, 5) ?? "21:00");
  const [prioridad, setPrioridad] = useState(String(promotion?.prioridad ?? 0));
  const [activa, setActiva] = useState(promotion?.es_activa ?? true);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(() => new Set(promotion?.productos.map((item) => item.id) ?? []));
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(() => new Set(promotion?.categorias.map((item) => item.id) ?? []));
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const numeric = Number(valor.replace(",", "."));
  const invalid =
    nombre.trim() === "" ||
    !Number.isFinite(numeric) ||
    numeric <= 0 ||
    (tipo === "PORCENTAJE" && numeric > 100) ||
    desde >= hasta ||
    (useHours && (!horaInicio || !horaFin || horaFin <= horaInicio)) ||
    (selectedProducts.size === 0 && selectedCategories.size === 0);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return (products.data ?? []).filter((product) => !term || product.nombre.toLocaleLowerCase("es").includes(term));
  }, [products.data, search]);

  function toggle<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) {
    setter((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (invalid || save.isPending) return;

    const body: PromotionBody = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() === "" ? null : descripcion.trim(),
      tipo,
      valor: numeric.toFixed(2),
      desde,
      hasta,
      dias_semana: [...days].sort((a, b) => a - b),
      hora_inicio: useHours ? horaInicio : null,
      hora_fin: useHours ? horaFin : null,
      prioridad: Number(prioridad) || 0,
      es_activa: activa,
      producto_ids: [...selectedProducts],
      categoria_ids: [...selectedCategories],
    };

    try {
      await save.mutateAsync({ id: promotion?.id, body });
      toast({ tone: "ok", message: promotion ? "Promoción actualizada." : "Promoción creada." });
      onClose();
    } catch (reason) {
      setError(reason instanceof ApiRequestError ? reason.message : "No pudimos guardar la promoción. Inténtalo nuevamente.");
    }
  }

  return (
    <Drawer
      title={promotion ? "Editar promoción" : "Nueva promoción"}
      open
      onClose={onClose}
      footer={
        <>
          <button type="submit" form="promocion-form" className={primaryButton} disabled={invalid || save.isPending}>
            {save.isPending ? "Guardando…" : "Guardar promoción"}
          </button>
          <button type="button" className={secondaryButton} onClick={onClose}>Cancelar</button>
        </>
      }
    >
      <form id="promocion-form" onSubmit={submit} className="space-y-5">
        <Field label="Nombre">
          {(id, describedBy) => (
            <Input id={id} aria-describedby={describedBy} value={nombre} maxLength={80} onChange={(event) => setNombre(event.target.value)} placeholder="Ej. Happy hour de cocteles" />
          )}
        </Field>

        <Field label="Descripción (opcional)">
          {(id) => (
            <Input id={id} value={descripcion} maxLength={160} onChange={(event) => setDescripcion(event.target.value)} placeholder="Ej. Solo de lunes a viernes por la tarde" />
          )}
        </Field>

        <div>
          <span className="mb-1.5 block text-sm font-bold text-tinta">Descuento</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de descuento">
            {(["PORCENTAJE", "PRECIO_FIJO"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={tipo === option}
                onClick={() => setTipo(option)}
                className={`min-h-[44px] rounded-xl border-2 text-sm font-bold transition-all ${tipo === option ? "border-azul bg-azul text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
              >
                {option === "PORCENTAJE" ? "Porcentaje (%)" : "Precio fijo (S/)"}
              </button>
            ))}
          </div>
          <Input
            inputMode="decimal"
            value={valor}
            onChange={(event) => setValor(event.target.value.replace(",", "."))}
            placeholder={tipo === "PORCENTAJE" ? "20" : "8.90"}
            aria-label="Valor del descuento"
            className="mt-2 font-bold tabular-nums"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-tinta">Desde</span>
            <input type="datetime-local" value={desde} onChange={(event) => setDesde(event.target.value)} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-tinta">Hasta</span>
            <input type="datetime-local" value={hasta} onChange={(event) => setHasta(event.target.value)} className={inputClass} />
          </label>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-bold text-tinta">Días de la semana</span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => {
              const on = days.has(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  aria-pressed={on}
                  title={day.label}
                  onClick={() => toggle<number>(setDays, day.value)}
                  className={`h-11 w-11 rounded-xl border-2 text-sm font-bold transition-all ${on ? "border-azul bg-azul text-white" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                >
                  {day.short}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-slate-500">Todos seleccionados = aplica cualquier día.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 p-3">
          <label className="flex min-h-[32px] items-center gap-2 text-sm font-bold text-tinta">
            <input type="checkbox" checked={useHours} onChange={(event) => setUseHours(event.target.checked)} className="h-5 w-5 accent-azul" />
            Limitar por horario
          </label>
          {useHours ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">Desde</span>
                <input type="time" value={horaInicio} onChange={(event) => setHoraInicio(event.target.value)} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-500">Hasta</span>
                <input type="time" value={horaFin} onChange={(event) => setHoraFin(event.target.value)} className={inputClass} />
              </label>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-tinta">Prioridad</span>
            <Input inputMode="numeric" value={prioridad} onChange={(event) => setPrioridad(event.target.value.replace(/\D/g, ""))} />
            <span className="mt-1 block text-xs text-slate-500">Si dos promos coinciden, gana la de mayor prioridad.</span>
          </label>
          <label className="flex min-h-[44px] items-center gap-2 self-end text-sm font-bold text-tinta">
            <input type="checkbox" checked={activa} onChange={(event) => setActiva(event.target.checked)} className="h-5 w-5 accent-azul" />
            Promoción activa
          </label>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-bold text-tinta">Categorías</span>
          {categories.isPending ? <Skeleton className="h-16" /> : (
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
              {(categories.data ?? []).map((category) => {
                const on = selectedCategories.has(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(setSelectedCategories, category.id)}
                    className={`min-h-[36px] rounded-lg border px-3 text-xs font-bold transition-colors ${on ? "border-azul bg-azul/10 text-azul" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                  >
                    {category.nombre}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-tinta">Platos y bebidas</span>
            <span className="text-xs text-slate-400 tabular-nums">{selectedProducts.size} elegidos</span>
          </div>
          <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar plato" aria-label="Buscar plato para la promoción" />
          {products.isPending ? <Skeleton className="mt-2 h-24" /> : (
            <ul className="mt-2 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {visibleProducts.map((product) => (
                <li key={product.id}>
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-3 px-3 py-1.5">
                    <input type="checkbox" checked={selectedProducts.has(product.id)} onChange={() => toggle(setSelectedProducts, product.id)} className="h-5 w-5 accent-azul" />
                    <span className="min-w-0 flex-1 truncate text-sm text-tinta">{product.nombre}</span>
                    <span className="shrink-0 text-xs font-semibold text-slate-400 tabular-nums">S/ {product.precio_venta}</span>
                  </label>
                </li>
              ))}
              {visibleProducts.length === 0 ? <li className="px-3 py-4 text-center text-sm text-slate-500">No hay platos con ese nombre.</li> : null}
            </ul>
          )}
        </div>

        {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      </form>
    </Drawer>
  );
}

function todayInLima(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** ISO UTC → valor de <input type="datetime-local"> en hora de Perú. */
function localInput(iso: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso)).replace(" ", "T");
}
