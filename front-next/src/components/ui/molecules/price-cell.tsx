"use client";

import React, { useState } from "react";

import { PriceText } from "@/components/ui/atoms/price-text";
import { Icon } from "@/components/icons";
import { formatPrice, priceInput } from "@/lib/schemas/carta";

export interface PriceCellProps {
  price: string | null;
  productName?: string;
  editable?: boolean;
  onSave?: (price: string) => void;
  className?: string;
}

export function PriceCell({
  price,
  productName = "producto",
  editable = false,
  onSave,
  className = "",
}: PriceCellProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!editable || !onSave) {
    return <PriceText amount={price} size="xl" className={className} />;
  }

  if (draft === null) {
    return (
      <button
        type="button"
        onClick={() => setDraft(price ?? "")}
        title="Clic para cambiar precio"
        className={`group/price flex h-11 shrink-0 items-center rounded-xl border border-transparent px-3 py-1.5 text-right font-extrabold text-tinta tabular-nums transition-all hover:border-slate-200 hover:bg-slate-100 hover:text-azul active:scale-[0.98] ${className}`}
      >
        <span className="flex items-center gap-1.5">
          <span className="text-xl font-extrabold text-tinta tabular-nums">
            {formatPrice(price)}
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
    const cleanPrice = Number(parsed.data).toFixed(2);
    if (cleanPrice !== price) {
      onSave?.(cleanPrice);
    }
    setDraft(null);
    setError(null);
  }

  return (
    <div className={`relative shrink-0 ${className}`}>
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
        aria-label={`Precio de ${productName}`}
        aria-invalid={error ? true : undefined}
        className="h-11 w-32 rounded-xl border-2 border-azul bg-white py-1 pr-3 pl-8 text-right text-lg font-bold text-tinta tabular-nums shadow-xs focus:outline-none aria-invalid:border-red-400"
      />
      {error ? (
        <p className="absolute right-0 mt-1 w-48 text-right text-xs font-semibold text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
