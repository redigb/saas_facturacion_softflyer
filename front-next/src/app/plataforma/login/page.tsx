import { notFound } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { PlatformLoginForm } from "@/app/plataforma/login/login-form";
import { backofficeFont } from "@/components/backoffice/font";
import { ThemeScope } from "@/components/theme-scope";
import { ThemeToggle } from "@/components/backoffice/molecules/theme-toggle";
import { Backoffice3DVisual } from "@/components/backoffice/organisms/backoffice-3d-visual";
import { Logo } from "@/components/logo";
import { getRequestHost, PLATFORM_SLUG, slugFromHost } from "@/lib/tenant";
import "@/styles/backoffice-theme.css";

export default async function PlatformLoginPage() {
  if (slugFromHost(await getRequestHost()) !== PLATFORM_SLUG) {
    notFound();
  }

  return (
    <main className="relative min-h-screen w-full lg:grid lg:grid-cols-2 bg-background font-sans antialiased">
      <ThemeScope theme="backoffice" fontClass={backofficeFont.variable} />

      {/* COLUMNA IZQUIERDA: HERO VISUAL CON PLANO 3D REAL */}
      <section className="relative hidden h-full flex-col justify-between overflow-hidden border-r border-border/60 bg-muted/30 p-10 lg:flex dark:bg-[#071322]">
        {/* Cabecera izquierda: Logo oficial + Badge Backoffice */}
        <div className="relative z-10 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-10 w-auto" priority />
          </Link>
          <span className="rounded-full bg-warning px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-black uppercase shadow-2xs">
            Backoffice
          </span>
        </div>

        {/* Arte 3D isométrico central con volumen y capas flotantes */}
        <div className="relative flex flex-1 items-center justify-center py-6">
          <Backoffice3DVisual />
        </div>

        {/* Pie izquierdo minimalista sin texto innecesario */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-muted-foreground/80 font-medium">
          <span>Softflyer Cloud Platform</span>
          <span>v1.0 · Backoffice Core</span>
        </div>
      </section>

      {/* COLUMNA DERECHA: FORMULARIO DE ACCESO */}
      <section className="relative flex flex-col items-center justify-center p-6 sm:p-10">
        {/* Toggle de tema en la esquina superior derecha */}
        <div className="absolute right-6 top-6 z-20 flex items-center gap-2">
          <ThemeToggle />
        </div>

        {/* Logo móvil (solo visible si no está en desktop) */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <Logo className="h-9 w-auto" priority />
          <span className="rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold tracking-wider text-black uppercase">
            Backoffice
          </span>
        </div>

        {/* Tarjeta de login moderna centrada */}
        <div className="w-full max-w-[420px] space-y-6 rounded-2xl border border-border/80 bg-card p-7 sm:p-8 shadow-xl shadow-black/5 dark:shadow-black/25">
          <div className="space-y-1.5 text-center sm:text-left">

            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Iniciar sesión en Backoffice
            </h1>
            <p className="text-xs text-muted-foreground">
              ¡Bienvenido de vuelta! Ingresa con tus credenciales maestras de plataforma.
            </p>
          </div>

          <PlatformLoginForm />

          <div className="border-t border-border/60 pt-4 text-center">
            <p className="text-[11px] text-muted-foreground">
              Acceso exclusivo y auditado para administradores de Softflyer.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
