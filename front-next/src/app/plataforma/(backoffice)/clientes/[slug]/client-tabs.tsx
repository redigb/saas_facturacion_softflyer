"use client";

import Link from "next/link";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const CLIENT_TABS = [
  { value: "resumen", label: "Resumen" },
  { value: "facturacion", label: "Facturación" },
  { value: "suscripcion", label: "Suscripción" },
  { value: "usuarios", label: "Usuarios" },
  { value: "bitacora", label: "Bitácora" },
] as const;

export type ClientTab = (typeof CLIENT_TABS)[number]["value"];

/**
 * Pestañas de la ficha. La pestaña vive en la URL (`?tab=`): sobrevive a recargar, se puede compartir y los
 * pasos del checklist enlazan directo a donde se resuelven. Cada pestaña llega ya armada desde el servidor.
 */
export function ClientTabs({ active, baseHref, panels }: { active: ClientTab; baseHref: string; panels: Record<ClientTab, React.ReactNode> }) {
  return (
    <Tabs value={active}>
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto sm:w-auto">
        {CLIENT_TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} asChild>
            <Link href={`${baseHref}?tab=${tab.value}`} scroll={false}>
              {tab.label}
            </Link>
          </TabsTrigger>
        ))}
      </TabsList>
      {CLIENT_TABS.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="mt-6">
          {panels[tab.value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
