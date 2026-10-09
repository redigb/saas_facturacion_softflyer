"use client";

import { useState } from "react";

import { usePermissions } from "@/app/panel/carta/menu-editor";
import { useQuickProductUpdate } from "@/app/panel/carta/queries";
import { inputClass, primaryButton } from "@/app/panel/carta/ui";
import { Icon } from "@/components/icons";
import { formatPrice, priceInput, type Product, type Station } from "@/lib/schemas/carta";

type Props = {
  title: string;
  products: Product[];
  stations: Station[];
  search: string;
  onSearch: (value: string) => void;
  onAdd: () => void;
  onOpen: (product: Product) => void;
  onEditCategory?: () => void;
};

type ViewMode = "list" | "grid";

export function ProductList({
  title,
  products,
  stations,
  search,
  onSearch,
  onAdd,
  onOpen,
  onEditCategory,
}: Props) {
  const can = usePermissions();
  const stationName = new Map(stations.map((station) => [station.id, station.nombre]));
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "list";
    try {
      const saved = localStorage.getItem("softflyer_carta_view");
      if (saved === "list" || saved === "grid") return saved;
    } catch {
      // Ignorar restricciones en navegación privada
    }
    return "list";
  });

  function handleViewChange(mode: ViewMode) {
    setViewMode(mode);
    try {
      localStorage.setItem("softflyer_carta_view", mode);
    } catch {
      // No-op
    }
  }

  return (
    <section className="min-w-0">
      {/* Barra superior con título, contador, selector de vista y botón agregar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="truncate text-xl font-bold tracking-tight text-tinta">{title}</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {products.length} {products.length === 1 ? "ítem" : "ítems"}
          </span>
          {onEditCategory && (
            <button
              type="button"
              onClick={onEditCategory}
              aria-label="Editar categoría"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white hover:text-azul lg:hidden"
            >
              <Icon name="editar" className="h-4.5 w-4.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Selector de vista: Lista vs Cuadrícula táctil */}
          <div className="flex items-center rounded-2xl border border-slate-200/80 bg-white p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => handleViewChange("list")}
              aria-label="Ver en lista"
              title="Vista de lista amplia"
              className={`flex h-9.5 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all ${
                viewMode === "list"
                  ? "bg-azul text-white shadow-xs"
                  : "text-slate-500 hover:text-azul"
              }`}
            >
              <Icon name="lista" className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              type="button"
              onClick={() => handleViewChange("grid")}
              aria-label="Ver en cuadrícula"
              title="Vista en tarjetas táctiles POS"
              className={`flex h-9.5 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all ${
                viewMode === "grid"
                  ? "bg-azul text-white shadow-xs"
                  : "text-slate-500 hover:text-azul"
              }`}
            >
              <Icon name="cuadricula" className="h-4 w-4" />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
          </div>

          {can.create && (
            <button type="button" onClick={onAdd} className={`${primaryButton} h-11 px-4.5 text-[15px]`}>
              <Icon name="mas" className="h-4.5 w-4.5" />
              <span>Agregar plato</span>
            </button>
          )}
        </div>
      </div>

      {/* Buscador táctil amplio */}
      <div className="relative mt-4.5">
        <Icon
          name="buscar"
          className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar plato o bebida por nombre o código…"
          aria-label="Buscar productos"
          className={`${inputClass} h-12 pr-11 pl-12 text-[15px]`}
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearch("")}
            aria-label="Limpiar búsqueda"
            className="absolute top-1/2 right-3 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <Icon name="cerrar" className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Contenedor de productos o estado vacío */}
      {products.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-white/70 px-6 py-14 text-center backdrop-blur-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Icon name={search ? "buscar" : "carta"} className="h-7 w-7" />
          </div>
          <p className="mt-4 text-lg font-bold text-tinta">
            {search ? `No encontramos platos para “${search.trim()}”` : "Aquí todavía no hay platos."}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {search
              ? "Intenta buscar con otro término o revisa la ortografía."
              : "Comienza agregando el primer plato de esta categoría."}
          </p>
          {!search && can.create && (
            <button
              type="button"
              onClick={onAdd}
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-azul px-5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-azul/90"
            >
              <Icon name="mas" className="h-4.5 w-4.5" />
              Agregar plato
            </button>
          )}
        </div>
      ) : viewMode === "list" ? (
        /* VISTA LISTA AMPLIA */
        <ul className="mt-4.5 divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xs">
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              station={product.estacion_efectiva_id ? stationName.get(product.estacion_efectiva_id) : undefined}
              onOpen={() => onOpen(product)}
            />
          ))}
        </ul>
      ) : (
        /* VISTA CUADRÍCULA TÁCTIL POS (CARDS) */
        <div className="mt-4.5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              station={product.estacion_efectiva_id ? stationName.get(product.estacion_efectiva_id) : undefined}
              onOpen={() => onOpen(product)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** Avatar visual representativo del plato o bebida */
function ProductAvatar({ tipo, className = "h-13 w-13" }: { tipo: string; className?: string }) {
  const isDrink = tipo === "BEBIDA";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl transition-transform ${className} ${
        isDrink
          ? "bg-celeste/15 text-azul"
          : "bg-amber-100/70 text-amber-600"
      }`}
    >
      <Icon name={isDrink ? "bebida" : "plato"} className="h-6 w-6" />
    </div>
  );
}

/** Fila de la vista de lista */
function ProductRow({
  product,
  station,
  onOpen,
}: {
  product: Product;
  station?: string;
  onOpen: () => void;
}) {
  const can = usePermissions();
  const update = useQuickProductUpdate();

  return (
    <li
      className={`group flex items-center gap-3.5 px-4.5 py-4 transition-colors sm:px-5.5 ${
        product.es_activo ? "hover:bg-slate-50/70" : "bg-slate-50/60 opacity-80"
      }`}
    >
      <ProductAvatar tipo={product.tipo} className="h-13 w-13 group-hover:scale-105" />

      <button
        type="button"
        onClick={onOpen}
        disabled={!can.edit}
        className="min-w-0 flex-1 text-left disabled:cursor-default"
      >
        <div className="flex items-center gap-2">
          <span
            className={`block truncate text-[17px] font-bold leading-tight transition-colors ${
              product.es_activo ? "text-tinta group-hover:text-azul" : "text-slate-500 line-through"
            }`}
          >
            {product.nombre}
          </span>
          {product.tipo === "BEBIDA" && (
            <span className="shrink-0 rounded-md bg-celeste/15 px-2 py-0.5 text-xs font-bold text-azul">
              Bebida
            </span>
          )}
          {!product.es_activo && (
            <span className="shrink-0 rounded-md bg-amber-100/90 px-2 py-0.5 text-xs font-bold text-amber-800">
              Oculto
            </span>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-600">
            {product.codigo}
          </span>
          {station && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
              <Icon name="cocina" className="h-3.5 w-3.5 text-slate-400" />
              {station}
            </span>
          )}
          {product.modificador_grupo_ids.length > 0 && (
            <span className="text-slate-400">
              {product.modificador_grupo_ids.length}{" "}
              {product.modificador_grupo_ids.length === 1 ? "grupo opcional" : "grupos opcionales"}
            </span>
          )}
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-3">
        <PriceCell
          product={product}
          editable={can.edit}
          onSave={(precio_venta) => update.mutate({ id: product.id, patch: { precio_venta } })}
        />

        {can.edit && (
          <button
            type="button"
            role="switch"
            aria-checked={product.es_activo}
            aria-label={
              product.es_activo
                ? `Ocultar ${product.nombre} de la carta`
                : `Mostrar ${product.nombre} en la carta`
            }
            title={product.es_activo ? "Visible para el mozo" : "Oculto para el mozo"}
            onClick={() => update.mutate({ id: product.id, patch: { es_activo: !product.es_activo } })}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40 active:scale-[0.96] ${
              product.es_activo ? "bg-emerald-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-7 w-7 rounded-full bg-white shadow-xs transition-transform duration-150 ${
                product.es_activo ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        )}
      </div>
    </li>
  );
}

/** Tarjeta táctil de la vista de cuadrícula (Grid POS) */
function ProductCard({
  product,
  station,
  onOpen,
}: {
  product: Product;
  station?: string;
  onOpen: () => void;
}) {
  const can = usePermissions();
  const update = useQuickProductUpdate();

  return (
    <div
      className={`group flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all hover:border-azul/40 hover:shadow-md ${
        !product.es_activo ? "bg-slate-50/70 opacity-85" : ""
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <ProductAvatar tipo={product.tipo} className="h-14 w-14 group-hover:scale-105" />
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {product.tipo === "BEBIDA" && (
              <span className="rounded-md bg-celeste/15 px-2 py-0.5 text-xs font-bold text-azul">
                Bebida
              </span>
            )}
            {!product.es_activo && (
              <span className="rounded-md bg-amber-100/90 px-2 py-0.5 text-xs font-bold text-amber-800">
                Oculto
              </span>
            )}
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">
              {product.codigo}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          disabled={!can.edit}
          className="mt-3.5 block w-full text-left disabled:cursor-default"
        >
          <h3
            className={`text-lg font-bold leading-snug transition-colors line-clamp-2 ${
              product.es_activo ? "text-tinta group-hover:text-azul" : "text-slate-500 line-through"
            }`}
          >
            {product.nombre}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {station && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                <Icon name="cocina" className="h-3.5 w-3.5 text-slate-400" />
                {station}
              </span>
            )}
            {product.modificador_grupo_ids.length > 0 && (
              <span className="text-slate-400">
                {product.modificador_grupo_ids.length}{" "}
                {product.modificador_grupo_ids.length === 1 ? "opción" : "opciones"}
              </span>
            )}
          </div>
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
        <PriceCell
          product={product}
          editable={can.edit}
          onSave={(precio_venta) => update.mutate({ id: product.id, patch: { precio_venta } })}
        />

        {can.edit && (
          <button
            type="button"
            role="switch"
            aria-checked={product.es_activo}
            aria-label={
              product.es_activo
                ? `Ocultar ${product.nombre} de la carta`
                : `Mostrar ${product.nombre} en la carta`
            }
            title={product.es_activo ? "Visible para el mozo" : "Oculto para el mozo"}
            onClick={() => update.mutate({ id: product.id, patch: { es_activo: !product.es_activo } })}
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40 active:scale-[0.96] ${
              product.es_activo ? "bg-emerald-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-7 w-7 rounded-full bg-white shadow-xs transition-transform duration-150 ${
                product.es_activo ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        )}
      </div>
    </div>
  );
}

/** Clic en el precio → se edita ahí mismo. Enter guarda, Esc cancela. */
function PriceCell({
  product,
  editable,
  onSave,
}: {
  product: Product;
  editable: boolean;
  onSave: (price: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!editable) {
    return (
      <span className="shrink-0 text-xl font-extrabold text-tinta tabular-nums">
        {formatPrice(product.precio_venta)}
      </span>
    );
  }

  if (draft === null) {
    return (
      <button
        type="button"
        onClick={() => setDraft(product.precio_venta ?? "")}
        title="Clic para cambiar precio"
        className="group/price flex h-11 shrink-0 items-center rounded-xl border border-transparent px-3 py-1.5 text-right font-extrabold text-tinta tabular-nums transition-all hover:border-slate-200 hover:bg-slate-100 hover:text-azul active:scale-[0.98]"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-xl font-extrabold text-tinta tabular-nums">
            {formatPrice(product.precio_venta)}
          </span>
          <Icon name="editar" className="h-4 w-4 opacity-0 transition-opacity group-hover/price:opacity-60" />
        </span>
      </button>
    );
  }

  function commit() {
    const parsed = priceInput.safeParse(draft ?? "");
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Precio inválido.");
      return;
    }
    const price = Number(parsed.data).toFixed(2);
    if (price !== product.precio_venta) onSave(price);
    setDraft(null);
    setError(null);
  }

  return (
    <div className="relative shrink-0">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-bold text-slate-400">
        S/
      </span>
      <input
        autoFocus
        inputMode="decimal"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") {
            setDraft(null);
            setError(null);
          }
        }}
        aria-label={`Precio de ${product.nombre}`}
        aria-invalid={error ? true : undefined}
        className="h-11 w-32 rounded-xl border-2 border-azul bg-white py-1 pr-3 pl-8 text-right text-lg font-bold text-tinta tabular-nums shadow-xs focus:outline-none aria-invalid:border-red-400"
      />
      {error && <p className="absolute right-0 mt-1 w-48 text-right text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
