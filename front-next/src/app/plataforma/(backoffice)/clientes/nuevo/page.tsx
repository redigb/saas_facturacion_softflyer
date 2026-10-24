import Link from "next/link";

import { NewClientForm } from "@/app/plataforma/(backoffice)/clientes/nuevo/new-client-form";
import type { Plan } from "@/app/plataforma/types";
import { apiFetch } from "@/lib/api";
import { rootDomainLabel } from "@/lib/tenant";

export default async function NewClientPage() {
  const plans = await apiFetch<Plan[]>("plataforma/planes");

  return (
    <>
      <Link href="/plataforma/clientes" className="text-sm font-semibold text-primary hover:text-info">
        ← Clientes
      </Link>
      <h1 className="mt-3 text-3xl font-bold text-foreground">Nuevo cliente</h1>
      <p className="mt-1 max-w-2xl text-foreground/70">
        Para ventas cerradas fuera de la web: el restaurante nace directamente con su plan de pago, sin prueba gratis.
      </p>
      <NewClientForm plans={plans.ok ? plans.data : []} rootDomain={rootDomainLabel()} />
    </>
  );
}
