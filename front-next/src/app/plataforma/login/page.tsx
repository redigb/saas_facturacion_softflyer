import { notFound } from "next/navigation";

import { PlatformLoginForm } from "@/app/plataforma/login/login-form";
import { backofficeFont } from "@/components/backoffice/font";
import { ThemeScope } from "@/components/theme-scope";
import { getRequestHost, PLATFORM_SLUG, slugFromHost } from "@/lib/tenant";
import "@/styles/backoffice-theme.css";

export default async function PlatformLoginPage() {
  if (slugFromHost(await getRequestHost()) !== PLATFORM_SLUG) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4 py-10">
      <ThemeScope theme="backoffice" fontClass={backofficeFont.variable} />
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-base font-black text-primary-foreground">S</div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-foreground">Backoffice Softflyer</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">Acceso solo para el equipo de la plataforma.</p>
        <PlatformLoginForm />
      </div>
    </main>
  );
}
