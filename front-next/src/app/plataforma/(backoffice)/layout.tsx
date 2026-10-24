import { notFound, redirect } from "next/navigation";

import type { PlatformAdmin } from "@/app/plataforma/types";
import { BackofficeTemplate } from "@/components/backoffice/templates/backoffice-template";
import { apiFetch } from "@/lib/api";
import { getRequestHost, PLATFORM_SLUG, slugFromHost } from "@/lib/tenant";
import "@/styles/backoffice-theme.css";

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  // El backoffice solo existe en admin.{dominio}.
  if (slugFromHost(await getRequestHost()) !== PLATFORM_SLUG) {
    notFound();
  }

  const me = await apiFetch<PlatformAdmin>("plataforma/auth/yo");

  if (!me.ok) {
    redirect("/plataforma/login");
  }

  const [alerts, clients] = await Promise.all([
    apiFetch<unknown[]>("plataforma/alertas"),
    apiFetch<{ slug: string; nombre: string; ruc: string | null }[]>("plataforma/clientes"),
  ]);

  return (
    <BackofficeTemplate
      admin={me.data}
      alertCount={alerts.ok ? alerts.data.length : 0}
      clients={
        clients.ok ? clients.data.map(({ slug, nombre, ruc }) => ({ slug, nombre, ruc })) : []
      }
    >
      {children}
    </BackofficeTemplate>
  );
}
