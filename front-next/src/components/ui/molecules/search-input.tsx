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
        className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground/70"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-12 w-full rounded-2xl border border-border bg-card pr-11 pl-12 text-[15px] text-foreground transition-all placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute top-1/2 right-3 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground/70"
        >
          <Icon name="cerrar" className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
