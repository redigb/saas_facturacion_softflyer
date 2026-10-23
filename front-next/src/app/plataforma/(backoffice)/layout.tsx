import { notFound, redirect } from "next/navigation";

import { BackofficeShell } from "@/app/plataforma/(backoffice)/shell";
import type { PlatformAdmin } from "@/app/plataforma/types";
import { apiFetch } from "@/lib/api";
import { getRequestHost, PLATFORM_SLUG, slugFromHost } from "@/lib/tenant";

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  // El backoffice solo existe en admin.{dominio}.
  if (slugFromHost(await getRequestHost()) !== PLATFORM_SLUG) {
    notFound();
  }

  const me = await apiFetch<PlatformAdmin>("plataforma/auth/yo");

  if (!me.ok) {
    redirect("/plataforma/login");
  }

  // Solo el contador del menú: si falla, el backoffice sigue y simplemente no muestra el número.
  const alerts = await apiFetch<unknown[]>("plataforma/alertas");

  return (
    <BackofficeShell admin={me.data} alertCount={alerts.ok ? alerts.data.length : 0}>
      {children}
    </BackofficeShell>
  );
}
