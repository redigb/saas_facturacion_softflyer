import React from "react";

import { Icon } from "@/components/icons";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "aria-label"?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
  "aria-label": ariaLabel = "Buscar",
  className = "",
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Icon
        name="buscar"
        className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pr-11 pl-12 text-[15px] text-tinta transition-all placeholder:text-slate-400 focus:border-azul focus:outline-none focus:ring-4 focus:ring-azul/10"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute top-1/2 right-3 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <Icon name="cerrar" className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
