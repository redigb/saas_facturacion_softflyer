"use client";

import { useEffect, useId, useState } from "react";

import { useUbigeoSearch } from "@/app/panel/configuracion/queries";
import { Icon } from "@/components/icons";
import { Input } from "@/components/ui";
import { ubigeoLabel, type Ubigeo } from "@/lib/schemas/configuracion";

/**
 * Buscador de distrito: sugiere mientras se escribe (mínimo 2 letras) y se maneja con
 * ↑ ↓ Enter. Muestra "Distrito, Provincia, Departamento" y permite quitar la elección.
 */
export function UbigeoPicker({
  value,
  onChange,
  id,
  hasError = false,
}: {
  value: Ubigeo | null;
  onChange: (value: Ubigeo | null) => void;
  id?: string;
  hasError?: boolean;
}) {
  const listId = useId();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useUbigeoSearch(debounced);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), 250);
    return () => clearTimeout(timer);
  }, [term]);

  const options = results.data ?? [];

  function pick(option: Ubigeo) {
    onChange(option);
    setTerm("");
    setDebounced("");
    setOpen(false);
  }

  if (value && !open) {
    return (
      <div className="flex min-h-[46px] items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2">
        <span className="min-w-0 truncate text-base text-tinta">{ubigeoLabel(value)}</span>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setOpen(true);
          }}
          aria-label="Cambiar distrito"
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Icon name="cerrar" className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open && options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Escribe el distrito, ej. Miraflores"
        hasError={hasError}
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => {
          if (!open || options.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((current) => Math.min(current + 1, options.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((current) => Math.max(current - 1, 0));
          } else if (event.key === "Enter") {
            event.preventDefault();
            pick(options[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {open && debounced.trim().length >= 2 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {results.isPending ? (
            <li className="px-3 py-2.5 text-sm text-slate-500">Buscando…</li>
          ) : options.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-slate-500">No encontramos ese distrito.</li>
          ) : (
            options.map((option, index) => (
              <li key={option.id} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(option)}
                  onMouseEnter={() => setActive(index)}
                  className={`flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-sm ${
                    index === active ? "bg-azul/5 font-bold text-azul" : "text-tinta"
                  }`}
                >
                  {ubigeoLabel(option)}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
