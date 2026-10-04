import Link from "next/link";
import { redirect } from "next/navigation";

import { TenantForm } from "@/app/tenant-form";
import { AuthShell } from "@/components/auth-shell";
import {
  DEMO_SLUG,
  PLATFORM_SLUG,
  getRequestHost,
  rootDomainLabel,
  slugFromHost,
  tenantUrl,
} from "@/lib/tenant";

const TRIAL_DAYS = Number(process.env.PRUEBA_DIAS ?? 7);

export default async function Home() {
  const slug = slugFromHost(await getRequestHost());

  if (slug === PLATFORM_SLUG) {
    redirect("/plataforma");
  }

  // Dentro del subdominio de una empresa, la entrada es su login.
  if (slug) {
    redirect("/login");
  }

  return (
    <AuthShell>
      <h1 className="text-3xl font-bold text-tinta">Bienvenido a Softflyer</h1>
      <p className="mt-3 text-base leading-7 text-slate-600">
        Crea tu restaurante en minutos y pruébalo gratis durante {TRIAL_DAYS} días. Sin tarjeta.
      </p>

      <Link
        href="/registro"
        className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-amarillo px-4 py-3.5 text-base font-bold text-tinta shadow-sm transition hover:brightness-95 focus-visible:ring-4 focus-visible:ring-amarillo/40 focus-visible:outline-none"
      >
        Prueba gratis {TRIAL_DAYS} días
        <span aria-hidden="true">→</span>
      </Link>
      <p className="mt-3 text-center text-sm text-slate-500">
        ¿Solo quieres mirar?{" "}
        <a href={tenantUrl(DEMO_SLUG, "/login")} className="font-semibold text-azul hover:text-celeste">
          Recorre el restaurante de ejemplo
        </a>
      </p>

      <div className="my-8 flex items-center gap-4 text-xs font-semibold tracking-widest text-slate-400 uppercase">
        <span className="h-px flex-1 bg-slate-200" />o
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <TenantForm rootDomain={rootDomainLabel()} />
    </AuthShell>
  );
}
