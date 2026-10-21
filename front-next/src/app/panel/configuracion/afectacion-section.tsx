"use client";

import { useState } from "react";

import { errorMessage, useProducts, useSaveProduct } from "@/app/panel/carta/queries";
import { Skeleton } from "@/app/panel/carta/ui";
import { useTaxCatalogs } from "@/app/panel/configuracion/fiscal-queries";
import { useToast } from "@/app/panel/providers";
import { CustomSelect } from "@/components/ui/molecules/custom-select";

/** Afectación al IGV de cada producto de la carta: gravado por defecto, exonerado o inafecto. */
export function AfectacionSection() {
  const toast = useToast();
  const products = useProducts();
  const catalogs = useTaxCatalogs();
  const save = useSaveProduct();
  const [term, setTerm] = useState("");

  if (products.isPending || catalogs.isPending) return <Skeleton className="h-40" />;
  if (products.isError || catalogs.isError) {
    return <p className="text-sm text-red-700">No pudimos cargar tus productos. Recarga la página para intentar de nuevo.</p>;
  }

  const options = catalogs.data.tipos_afectacion_igv.map((type) => ({ value: String(type.id), label: type.nombre }));
  const visible = products.data.filter((product) => product.nombre.toLowerCase().includes(term.trim().toLowerCase()));

  async function change(id: number, value: string) {
    try {
      await save.mutateAsync({ id, body: { tipo_afectacion_igv_id: Number(value) } });
    } catch (failure) {
      toast({ tone: "error", message: errorMessage(failure) });
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-tinta">Afectación al IGV por producto</h3>
        <p className="mt-1 text-sm text-slate-500">Todo es gravado salvo que lo cambies. Cámbialo solo si tu contador te lo indicó.</p>
      </div>
      <input
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Buscar producto"
        aria-label="Buscar producto"
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-tinta focus:border-azul focus:ring-4 focus:ring-azul/10 focus:outline-none"
      />
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {visible.map((product) => (
          <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-tinta">{product.nombre}</span>
            <div className="w-full sm:w-72">
              <CustomSelect
                value={product.tipo_afectacion_igv ? String(product.tipo_afectacion_igv.id) : ""}
                options={options}
                onChange={(value) => void change(product.id, value)}
                disabled={save.isPending}
              />
            </div>
          </li>
        ))}
        {visible.length === 0 ? <li className="p-4 text-sm text-slate-500">No hay productos que coincidan.</li> : null}
      </ul>
    </section>
  );
}
