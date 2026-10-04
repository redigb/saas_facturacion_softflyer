"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { NAVIGATION } from "@/app/panel/navigation";
import { logout } from "@/app/panel/actions";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { SalesButton } from "@/components/sales-button";
import type { Me } from "@/lib/api";

const MODE_BADGE = {
  DEMO: { label: "Modo demo", className: "bg-amarillo text-tinta" },
  PRUEBA: { label: "Prueba gratis", className: "bg-celeste text-tinta" },
  PAGO: { label: "Plan de pago", className: "bg-azul text-white" },
} as const;

export function PanelShell({ me, children }: { me: Me; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const mode = me.inquilino.modo;
  const isDemo = mode === "DEMO";
  const trial = me.inquilino.prueba;

  return (
    <div className="min-h-screen">
      {/* Fondo oscuro tras el menú en móvil */}
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-tinta/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-68 flex-col border-r border-slate-200 bg-white transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between px-6">
          <Logo className="h-11 w-auto" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-niebla lg:hidden"
            aria-label="Cerrar menú"
          >
            <Icon name="cerrar" />
          </button>
        </div>

        <Sidebar onNavigate={() => setOpen(false)} />

        <div className="m-4 rounded-2xl bg-niebla p-4">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Tu cuenta</p>
          <p className="mt-1 truncate text-sm font-bold text-tinta">{me.inquilino.nombre}</p>
          <span
            className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${MODE_BADGE[mode].className}`}
          >
            {MODE_BADGE[mode].label}
          </span>
        </div>
      </aside>

      <div className="lg:pl-68">
        {isDemo && (
          <div className="flex items-center justify-center gap-2 bg-amarillo px-4 py-2 text-center text-sm font-semibold text-tinta">
            <Icon name="rayo" className="h-4 w-4 shrink-0" />
            Estás en la cuenta demo: todo lo que ves son datos de ejemplo.
          </div>
        )}
        {trial && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-linear-to-r from-azul to-celeste px-4 py-2.5 text-center text-sm font-semibold text-white">
            <span className="flex items-center gap-2">
              <Icon name="calendario" className="h-4 w-4 shrink-0" />
              {trial.dias_restantes === 0
                ? "Tu prueba gratis termina hoy."
                : `Te ${trial.dias_restantes === 1 ? "queda 1 día" : `quedan ${trial.dias_restantes} días`} de prueba gratis.`}
            </span>
            <SalesButton
              tenant={me.inquilino.nombre}
              email={me.inquilino.ventas_correo}
              label="Activar mi plan"
              compact
            />
          </div>
        )}

        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-tinta hover:bg-niebla lg:hidden"
            aria-label="Abrir menú"
          >
            <Icon name="menu" />
          </button>

          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-500">
            {me.inquilino.nombre}
          </p>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-tinta">{me.usuario.nombre}</p>
              <p className="text-xs text-slate-500">{me.roles.join(", ")}</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-azul text-sm font-bold text-white">
              {initials(me.usuario.nombre)}
            </span>
            <form action={logout}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-niebla hover:text-azul"
              >
                <Icon name="salir" />
                <span className="hidden md:inline">Salir</span>
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-2" aria-label="Secciones del panel">
      {NAVIGATION.map((section) => (
        <div key={section.title}>
          <p className="px-3 pb-2 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = item.href === pathname;
              const base = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold";

              return (
                <li key={item.label}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`${base} transition ${
                        active ? "bg-azul text-white shadow-sm" : "text-tinta hover:bg-niebla hover:text-azul"
                      }`}
                    >
                      <Icon name={item.icon} />
                      {item.label}
                    </Link>
                  ) : (
                    <span className={`${base} cursor-not-allowed text-slate-400`} aria-disabled="true">
                      <Icon name={item.icon} />
                      <span className="flex-1">{item.label}</span>
                      <span className="rounded-md bg-niebla px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                        Pronto
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
