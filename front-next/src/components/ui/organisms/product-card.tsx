"use client";

import React from "react";

import { Badge } from "@/components/ui/atoms/badge";
import { Switch } from "@/components/ui/atoms/switch";
import { PriceCell } from "@/components/ui/molecules/price-cell";
import { ProductAvatar } from "@/components/ui/molecules/product-avatar";
import { Icon } from "@/components/icons";
import type { Product } from "@/lib/schemas/carta";

export interface ProductCardProps {
  product: Product;
  stationName?: string;
  canEdit: boolean;
  onOpen: () => void;
  onToggleActive: (active: boolean) => void;
  onSavePrice: (price: string) => void;
}

export function ProductCard({
  product,
  stationName,
  canEdit,
  onOpen,
  onToggleActive,
  onSavePrice,
}: ProductCardProps) {
  return (
    <div
      className={`group flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs transition-all hover:border-azul/40 hover:shadow-md ${
        !product.es_activo ? "bg-slate-50/70 opacity-85" : ""
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <ProductAvatar tipo={product.tipo} size="lg" className="group-hover:scale-105" />
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {product.tipo === "BEBIDA" ? (
              <Badge variant="info">Bebida</Badge>
            ) : null}
            {!product.es_activo ? (
              <Badge variant="warning">Oculto</Badge>
            ) : null}
            <Badge variant="code">{product.codigo}</Badge>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          disabled={!canEdit}
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
            {stationName ? (
              <Badge variant="neutral">
                <Icon name="cocina" className="h-3.5 w-3.5 text-slate-400" />
                <span>{stationName}</span>
              </Badge>
            ) : null}
            {product.modificador_grupo_ids.length > 0 ? (
              <span className="text-slate-400">
                {product.modificador_grupo_ids.length}{" "}
                {product.modificador_grupo_ids.length === 1 ? "opción" : "opciones"}
              </span>
            ) : null}
          </div>
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
        <PriceCell
          price={product.precio_venta}
          productName={product.nombre}
          editable={canEdit}
          onSave={onSavePrice}
        />

        {canEdit ? (
          <Switch
            checked={product.es_activo}
            onCheckedChange={onToggleActive}
            aria-label={
              product.es_activo
                ? `Ocultar ${product.nombre} de la carta`
                : `Mostrar ${product.nombre} en la carta`
            }
            title={product.es_activo ? "Visible para el mozo" : "Oculto para el mozo"}
          />
        ) : null}
      </div>
    </div>
  );
}
