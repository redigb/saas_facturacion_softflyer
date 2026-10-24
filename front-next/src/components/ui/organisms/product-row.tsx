"use client";

import React from "react";

import { Badge } from "@/components/ui/atoms/badge";
import { Switch } from "@/components/ui/atoms/switch";
import { PriceCell } from "@/components/ui/molecules/price-cell";
import { ProductAvatar } from "@/components/ui/molecules/product-avatar";
import { Icon } from "@/components/icons";
import type { Product } from "@/lib/schemas/carta";

export interface ProductRowProps {
  product: Product;
  stationName?: string;
  canEdit: boolean;
  onOpen: () => void;
  onToggleActive: (active: boolean) => void;
  onSavePrice: (price: string) => void;
}

export function ProductRow({
  product,
  stationName,
  canEdit,
  onOpen,
  onToggleActive,
  onSavePrice,
}: ProductRowProps) {
  return (
    <li
      className={`group flex items-center gap-3.5 px-4.5 py-4 transition-colors sm:px-5.5 ${
        product.es_activo ? "hover:bg-slate-50/70" : "bg-slate-50/60 opacity-80"
      }`}
    >
      <ProductAvatar tipo={product.tipo} imagenUrl={product.imagen_url} className="h-13 w-13 group-hover:scale-105" />

      <button
        type="button"
        onClick={onOpen}
        disabled={!canEdit}
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
          {product.tipo === "BEBIDA" ? (
            <Badge variant="info">Bebida</Badge>
          ) : null}
          {!product.es_activo ? (
            <Badge variant="warning">Oculto</Badge>
          ) : null}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
          <Badge variant="code">{product.codigo}</Badge>
          {stationName ? (
            <Badge variant="neutral">
              <Icon name="cocina" className="h-3.5 w-3.5 text-slate-400" />
              <span>{stationName}</span>
            </Badge>
          ) : null}
          {product.modificador_grupo_ids.length > 0 ? (
            <span className="text-slate-400">
              {product.modificador_grupo_ids.length}{" "}
              {product.modificador_grupo_ids.length === 1 ? "grupo opcional" : "grupos opcionales"}
            </span>
          ) : null}
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-3">
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
    </li>
  );
}
