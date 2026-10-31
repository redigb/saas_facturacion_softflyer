"use client";

import { useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { Button, Input } from "@/components/ui";
import type { CartLine, Menu, MenuProduct } from "@/lib/schemas/pedidos";

type Props = {
  menu: Menu;
  disabled: boolean;
  onAdd: (line: Omit<CartLine, "key">) => void;
};

/** Carta del mozo: chips de categoría, buscador y platos en botones grandes (spec 006). */
export function MenuPicker({ menu, disabled, onAdd }: Props) {
  const categories = useMemo(() => [...menu.categorias].sort((a, b) => a.orden - b.orden), [menu]);
  const [category, setCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [picking, setPicking] = useState<MenuProduct | null>(null);
  // Lupa (spec 026): foto del plato en grande para mostrar al cliente.
  const [zoomed, setZoomed] = useState<MenuProduct | null>(null);

  const current = category ?? categories[0]?.id ?? null;
  const term = search.trim().toLocaleLowerCase("es");
  const products = term
    ? menu.productos.filter((product) => product.nombre.toLocaleLowerCase("es").includes(term))
    : menu.productos.filter((product) => (current === null ? true : product.categoria_id === current));

  function tap(product: MenuProduct) {
    if (disabled) return;
    if (product.modificador_grupo_ids.length > 0) setPicking(product);
    else onAdd({ producto_id: product.id, cantidad: 1, notas: "", modificador_ids: [] });
  }

  return (
    <div>
      <div className="relative">
        <Icon name="buscar" className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar plato" aria-label="Buscar plato" className="pl-11" />
      </div>

      {!term && (
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 touch-pan-x sm:mx-0 sm:px-0">
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id)}
              aria-pressed={current === item.id}
              className={`min-h-[44px] shrink-0 rounded-full px-4 text-sm font-bold transition-all active:scale-[0.97] ${current === item.id ? "bg-azul text-white" : "bg-white text-tinta ring-1 ring-slate-200"
                }`}
            >
              {item.nombre}
            </button>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <p className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          {term ? "No hay platos con ese nombre." : "No hay platos en esta categoría."}
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => {
            const categoryName =
              product.categoria_id === null ? "Sin categoría" : (categories.find((item) => item.id === product.categoria_id)?.nombre ?? "");

            return (
              <li key={product.id} className="relative">
                <button
                  type="button"
                  onClick={() => tap(product)}
                  disabled={disabled}
                  className="flex min-h-28 w-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3 text-left transition-all hover:border-azul active:scale-[0.97] disabled:opacity-50"
                >
                  {product.imagen_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- la foto ya viene comprimida del cliente
                    <img src={product.imagen_url} alt="" loading="lazy" className="mb-2 h-24 w-full rounded-xl object-cover" />
                  )}
                  <span className="block w-full">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[10px] font-bold tracking-wider text-slate-400 uppercase">{categoryName}</span>
                      {product.modificador_grupo_ids.length > 0 && (
                        <span className="shrink-0 text-[10px] font-semibold text-slate-400">opciones</span>
                      )}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block font-bold text-tinta">{product.nombre}</span>
                    {product.descripcion && (
                      <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-slate-500">{product.descripcion}</span>
                    )}
                  </span>
                  <span className="mt-2 block">
                    {product.precio_promocional ? (
                      <span className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-azul tabular-nums">S/ {product.precio_promocional}</span>
                        <span className="text-[11px] text-slate-400 line-through tabular-nums">S/ {product.precio_venta}</span>
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-azul tabular-nums">S/ {product.precio_venta}</span>
                    )}
                    {product.promocion ? (
                      <span className="mt-1 block truncate rounded-md bg-amarillo/30 px-1.5 py-0.5 text-[10px] font-bold text-tinta">{product.promocion.nombre}</span>
                    ) : null}
                  </span>
                </button>

                {/* La lupa es hermana de la tarjeta: su toque no agrega al carrito (spec 026). */}
                {product.imagen_url && (
                  <button
                    type="button"
                    onClick={() => setZoomed(product)}
                    aria-label={`Ver foto de ${product.nombre}`}
                    title="Ver la foto en grande"
                    className="absolute top-1.5 right-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-tinta shadow-xs backdrop-blur-xs transition-all hover:bg-white active:scale-95"
                  >
                    <Icon name="buscar" className="h-4.5 w-4.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {picking && (
        <ModifierSheet
          key={picking.id}
          product={picking}
          menu={menu}
          onClose={() => setPicking(null)}
          onAdd={(line) => {
            onAdd(line);
            setPicking(null);
          }}
        />
      )}

      {zoomed && <PhotoModal product={zoomed} onClose={() => setZoomed(null)} />}
    </div>
  );
}

/** Foto del plato en grande para mostrar al cliente (spec 026). */
function PhotoModal({ product, onClose }: { product: MenuProduct; onClose: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 bg-tinta/60 backdrop-blur-xs animate-in fade-in" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.nombre}
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold text-tinta">{product.nombre}</h2>
            <p className="text-sm font-semibold text-azul tabular-nums">
              S/ {product.precio_promocional ?? product.precio_venta}
              {product.precio_promocional ? <span className="ml-2 text-xs text-slate-400 line-through">S/ {product.precio_venta}</span> : null}
            </p>
            {product.descripcion && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{product.descripcion}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar">
            <Icon name="cerrar" className="h-5 w-5" />
          </Button>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element -- la foto ya viene comprimida del cliente */}
        <img src={product.imagen_url ?? ""} alt={product.nombre} className="max-h-[70vh] w-full bg-slate-50 object-contain" />
      </div>
    </div>
  );
}

/** Hoja inferior para elegir opciones, cantidad y nota de un plato con modificadores. */
function ModifierSheet({ product, menu, onClose, onAdd }: { product: MenuProduct; menu: Menu; onClose: () => void; onAdd: (line: Omit<CartLine, "key">) => void }) {
  const groups = product.modificador_grupo_ids.flatMap((id) => menu.modificador_grupos.filter((group) => group.id === id));
  const [chosen, setChosen] = useState<number[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const missing = groups.filter((group) => group.modificadores.filter((option) => chosen.includes(option.id)).length < group.seleccion_minima);
  const extras = groups.flatMap((group) => group.modificadores).filter((option) => chosen.includes(option.id)).reduce((sum, option) => sum + Number(option.precio_adicional), 0);
  // Spec 039: la hoja de opciones cobra el precio promocional vigente.
  const basePrice = Number(product.precio_promocional ?? product.precio_venta);

  function toggle(groupId: number, optionId: number) {
    const group = groups.find((candidate) => candidate.id === groupId)!;
    const inGroup = group.modificadores.map((option) => option.id);
    setChosen((current) => {
      if (current.includes(optionId)) return current.filter((id) => id !== optionId);
      const sameGroup = current.filter((id) => inGroup.includes(id));
      // Grupo de una sola opción: tocar otra reemplaza la anterior.
      if (group.seleccion_maxima === 1) return [...current.filter((id) => !inGroup.includes(id)), optionId];
      return sameGroup.length >= group.seleccion_maxima ? current : [...current, optionId];
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 bg-tinta/50 backdrop-blur-xs animate-in fade-in" />
      <div role="dialog" aria-modal="true" aria-label={product.nombre} className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-tinta">{product.nombre}</h2>
            <p className="text-sm font-semibold text-azul tabular-nums">
              S/ {product.precio_promocional ?? product.precio_venta}
              {product.precio_promocional ? <span className="ml-2 text-xs text-slate-400 line-through">S/ {product.precio_venta}</span> : null}
            </p>
            {product.promocion ? <span className="mt-1 inline-block rounded-md bg-amarillo/30 px-1.5 py-0.5 text-[10px] font-bold text-tinta">{product.promocion.nombre}</span> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar">
            <Icon name="cerrar" className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {groups.map((group) => (
            <fieldset key={group.id}>
              <legend className="flex w-full items-center justify-between text-sm font-bold text-tinta">
                {group.nombre}
                <span className={`text-xs font-semibold ${group.seleccion_minima > 0 ? "text-red-600" : "text-slate-400"}`}>
                  {group.seleccion_minima > 0 ? "Obligatorio" : "Opcional"}
                  {group.seleccion_maxima > 1 ? ` · hasta ${group.seleccion_maxima}` : ""}
                </span>
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {group.modificadores.map((option) => {
                  const active = chosen.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggle(group.id, option.id)}
                      aria-pressed={active}
                      className={`min-h-12 rounded-xl border-2 px-3 py-2 text-left text-sm font-bold transition-all active:scale-[0.97] ${active ? "border-azul bg-azul/5 text-azul" : "border-slate-200 text-tinta"
                        }`}
                    >
                      {option.nombre}
                      {Number(option.precio_adicional) > 0 && <span className="block text-xs font-semibold text-slate-500 tabular-nums">+S/ {option.precio_adicional}</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-tinta">Nota para cocina</span>
            <Input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={200} placeholder="Ej. sin cebolla" />
          </label>
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-4">
          <QuantityStepper value={quantity} onChange={setQuantity} />
          <Button
            size="lg"
            className="flex-1"
            disabled={missing.length > 0}
            onClick={() => onAdd({ producto_id: product.id, cantidad: quantity, notas: notes.trim(), modificador_ids: chosen })}
          >
            {missing.length > 0 ? `Elige ${missing[0].nombre.toLowerCase()}` : `Agregar · S/ ${((basePrice + extras) * quantity).toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function QuantityStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const button = "flex h-12 w-12 items-center justify-center rounded-xl bg-niebla text-xl font-bold text-tinta transition-all active:scale-[0.95] disabled:opacity-40";

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Menos" className={button}>
        −
      </button>
      <span className="w-8 text-center text-lg font-bold text-tinta tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" onClick={() => onChange(Math.min(999, value + 1))} disabled={value >= 999} aria-label="Más" className={button}>
        +
      </button>
    </div>
  );
}
