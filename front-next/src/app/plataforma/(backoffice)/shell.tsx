"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { platformLogout } from "@/app/plataforma/actions";
import type { PlatformAdmin } from "@/app/plataforma/types";
import { Icon, type IconName } from "@/components/icons";
import { Logo } from "@/components/logo";

const NAV: { label: string; href: string; icon: IconName }[] = [
  { label: "Resumen", href: "/plataforma", icon: "home" },
  { label: "Clientes", href: "/plataforma/clientes", icon: "equipo" },
  { label: "Solicitudes", href: "/plataforma/solicitudes", icon: "calendario" },
  { label: "Nuevo cliente", href: "/plataforma/clientes/nuevo", icon: "rayo" },
];

export function BackofficeShell({ admin, children }: { admin: PlatformAdmin; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // La sección activa es la de ruta más larga que coincide (/plataforma/clientes/nuevo > /plataforma/clientes).
  const activeHref = NAV.map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === activeHref;

  return (
    <div className="min-h-screen">
      {open && (
        <button type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-tinta/50 lg:hidden" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-azul-oscuro text-white transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 pt-6 pb-4">
          <span className="inline-flex rounded-xl bg-white px-3 py-2">
            <Logo className="h-9 w-auto" />
          </span>
          <p className="mt-4 text-[11px] font-bold tracking-widest text-amarillo uppercase">Backoffice de la plataforma</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Backoffice">
          {NAV.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-white text-azul-oscuro" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-bold">{admin.nombre}</p>
          <p className="truncate text-xs text-white/60">{admin.correo}</p>
          <form action={platformLogout} className="mt-3">
            <button type="submit" className="flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-amarillo">
              <Icon name="salir" className="h-4 w-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-tinta hover:bg-niebla" aria-label="Abrir menú">
            <Icon name="menu" />
          </button>
          <p className="text-sm font-bold text-tinta">Backoffice Softflyer</p>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
