"use client";

import { useState } from "react";

import { usePermissions } from "@/app/panel/carta/menu-editor";
import { useQuickProductUpdate } from "@/app/panel/carta/queries";
import { Icon } from "@/components/icons";
import {
  Badge,
  Button,
  EmptyState,
  ProductCard,
  ProductRow,
  SearchInput,
  SegmentedControl,
} from "@/components/ui";
import type { Product, Station } from "@/lib/schemas/carta";

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
  const update = useQuickProductUpdate();
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
          <Badge variant="neutral">
            {products.length} {products.length === 1 ? "ítem" : "ítems"}
          </Badge>
          {onEditCategory ? (
            <button
              type="button"
              onClick={onEditCategory}
              aria-label="Editar categoría"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white hover:text-azul lg:hidden"
            >
              <Icon name="editar" className="h-4.5 w-4.5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2.5">
          <SegmentedControl
            value={viewMode}
            onChange={handleViewChange}
            options={[
              { value: "list", label: "Lista", icon: "lista" },
              { value: "grid", label: "Tarjetas", icon: "cuadricula" },
            ]}
          />

          {can.create ? (
            <Button onClick={onAdd} variant="primary">
              <Icon name="mas" className="h-4.5 w-4.5" />
              <span>Agregar plato</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Buscador táctil amplio */}
      <div className="mt-4.5">
        <SearchInput
          value={search}
          onChange={onSearch}
          placeholder="Buscar plato o bebida por nombre o código…"
          aria-label="Buscar productos"
        />
      </div>

      {/* Contenedor de productos o estado vacío */}
      {products.length === 0 ? (
        <EmptyState
          icon={search ? "buscar" : "carta"}
          title={search ? `No encontramos platos para “${search.trim()}”` : "Aquí todavía no hay platos."}
          description={
            search
              ? "Intenta buscar con otro término o revisa la ortografía."
              : "Comienza agregando el primer plato de esta categoría."
          }
          actionLabel={!search && can.create ? "Agregar plato" : undefined}
          onAction={!search && can.create ? onAdd : undefined}
          className="mt-5"
        />
      ) : viewMode === "list" ? (
        <ul className="mt-4.5 divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xs">
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              stationName={product.estacion_efectiva_id ? stationName.get(product.estacion_efectiva_id) : undefined}
              canEdit={can.edit}
              onOpen={() => onOpen(product)}
              onToggleActive={(active) => update.mutate({ id: product.id, patch: { es_activo: active } })}
              onSavePrice={(price) => update.mutate({ id: product.id, patch: { precio_venta: price } })}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-4.5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              stationName={product.estacion_efectiva_id ? stationName.get(product.estacion_efectiva_id) : undefined}
              canEdit={can.edit}
              onOpen={() => onOpen(product)}
              onToggleActive={(active) => update.mutate({ id: product.id, patch: { es_activo: active } })}
              onSavePrice={(price) => update.mutate({ id: product.id, patch: { precio_venta: price } })}
            />
          ))}
        </div>
      )}
    </section>
  );
}
