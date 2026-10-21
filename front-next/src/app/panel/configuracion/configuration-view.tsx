"use client";

import { useState } from "react";

import { BranchesTab } from "@/app/panel/configuracion/branches-tab";
import { FiscalTab } from "@/app/panel/configuracion/fiscal-tab";
import { CompanyTab } from "@/app/panel/configuracion/company-tab";
import { SegmentedControl, type SegmentOption } from "@/components/ui/molecules/segmented-control";

type TabId = "empresa" | "facturacion" | "sucursales";

/** Configuración del negocio (spec 011): cada pestaña aparece solo si el rol tiene su permiso. */
export function ConfigurationView({ can }: { can: { empresa: boolean; sucursales: boolean } }) {
  const options: SegmentOption<TabId>[] = [
    ...(can.empresa ? [{ value: "empresa" as const, label: "Empresa", icon: "facturacion" as const }] : []),
    ...(can.empresa ? [{ value: "facturacion" as const, label: "Facturación", icon: "facturacion" as const }] : []),
    ...(can.sucursales ? [{ value: "sucursales" as const, label: "Sucursales", icon: "mesa" as const }] : []),
  ];
  const [tab, setTab] = useState<TabId>(options[0]?.value ?? "empresa");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Configuración</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">Los datos de tu empresa, tu facturación y cada uno de tus locales.</p>
        </div>
        {options.length > 1 ? <SegmentedControl value={tab} onChange={setTab} options={options} /> : null}
      </div>

      {tab === "empresa" && can.empresa ? <CompanyTab /> : null}
      {tab === "facturacion" && can.empresa ? <FiscalTab /> : null}
      {tab === "sucursales" && can.sucursales ? <BranchesTab /> : null}
    </div>
  );
}
