import { notFound } from "next/navigation";

import { PlatformLoginForm } from "@/app/plataforma/login/login-form";
import { Logo } from "@/components/logo";
import { getRequestHost, PLATFORM_SLUG, slugFromHost } from "@/lib/tenant";

export default async function PlatformLoginPage() {
  if (slugFromHost(await getRequestHost()) !== PLATFORM_SLUG) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-linear-to-br from-azul-oscuro via-azul to-celeste px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl shadow-azul-oscuro/40">
        <Logo className="h-12 w-auto" priority />
        <p className="mt-6 text-xs font-bold tracking-widest text-celeste uppercase">Backoffice</p>
        <h1 className="mt-1 text-2xl font-bold text-tinta">Administración de la plataforma</h1>
        <p className="mt-2 mb-6 text-sm text-slate-600">Acceso solo para el equipo de Softflyer.</p>
        <PlatformLoginForm />
      </div>
    </main>
  );
}
