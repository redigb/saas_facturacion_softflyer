"use client";

import { createContext, useContext, useState } from "react";

import { MenuTab } from "@/app/panel/carta/menu-tab";
import { ModifiersTab } from "@/app/panel/carta/modifiers-tab";
import { StationsTab } from "@/app/panel/carta/stations-tab";

import { Icon, type IconName } from "@/components/icons";

export type Permissions = { create: boolean; edit: boolean; delete: boolean };

const PermissionsContext = createContext<Permissions>({ create: false, edit: false, delete: false });

/** Sin permisos productos.* la carta se ve en modo lectura: sin botones, sin errores. */
export function usePermissions() {
  return useContext(PermissionsContext);
}

const TABS: { id: "carta" | "estaciones" | "modificadores"; label: string; icon: IconName }[] = [
  { id: "carta", label: "Platos y categorías", icon: "carta" },
  { id: "estaciones", label: "Estaciones", icon: "cocina" },
  { id: "modificadores", label: "Modificadores", icon: "configuracion" },
];

type TabId = (typeof TABS)[number]["id"];

export function MenuEditor({ can }: { can: Permissions }) {
  const [tab, setTab] = useState<TabId>("carta");
  const readOnly = !can.create && !can.edit;

  return (
    <PermissionsContext.Provider value={can}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Carta</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-base">
            {readOnly
              ? "Vista de la carta en modo lectura."
              : "Organiza tu carta como en papel: categorías, platos, precios y opciones."}
          </p>
        </div>
      </div>

      <div role="tablist" aria-label="Secciones de la carta" className="mt-6 flex gap-1.5 overflow-x-auto border-b border-slate-200/80 pb-px">
        {TABS.map((item) => {
          const isActive = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(item.id)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
                isActive
                  ? "border-azul text-azul"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-tinta"
              }`}
            >
              <Icon name={item.icon} className={`h-4 w-4 ${isActive ? "text-azul" : "text-slate-400"}`} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "carta" && <MenuTab />}
        {tab === "estaciones" && <StationsTab />}
        {tab === "modificadores" && <ModifiersTab />}
      </div>
    </PermissionsContext.Provider>
  );
}
