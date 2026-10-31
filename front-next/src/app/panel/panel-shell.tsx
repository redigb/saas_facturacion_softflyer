"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AssistantBubble } from "@/app/panel/asistente/assistant-bubble";
import { visibleNavigation } from "@/app/panel/navigation";
import { RealtimeIndicator } from "@/app/panel/realtime";
import { UserMenu } from "@/app/panel/user-menu";
import { Icon } from "@/components/icons";
import { Logo, LogoIcon } from "@/components/logo";
import { SalesButton } from "@/components/sales-button";
import type { Me } from "@/lib/api";

const MODE_BADGE = {
  DEMO: { label: "Modo demo", className: "bg-amarillo text-tinta" },
  PRUEBA: { label: "Prueba gratis", className: "bg-celeste text-tinta" },
  PAGO: { label: "Plan de pago", className: "bg-azul text-white" },
} as const;

export function PanelShell({ me, children }: { me: Me; children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullWidth = pathname.startsWith("/panel/plano");
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200/90 bg-white transition-all duration-300 ease-in-out lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"
          } ${collapsed ? "w-20" : "w-68"}`}
      >
        {/* Botón flotante en el borde divisor (solo en desktop) */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="absolute -right-3.5 top-7 z-50 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-azul focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40 lg:flex"
        >
          <Icon
            name="abajo"
            className={`h-4 w-4 transition-transform duration-300 ${collapsed ? "-rotate-90 text-azul" : "rotate-90 text-slate-500"
              }`}
          />
        </button>

        <div className={`flex h-20 items-center justify-between ${collapsed ? "px-3 justify-center" : "px-6"}`}>
          <div className="flex items-center justify-center overflow-hidden">
            {collapsed ? (
              <LogoIcon className="size-9 object-contain" />
            ) : (
              <Logo className="h-11 w-auto" />
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-niebla lg:hidden"
            aria-label="Cerrar menú"
          >
            <Icon name="cerrar" />
          </button>
        </div>

        <Sidebar permisos={me.permisos} collapsed={collapsed} onNavigate={() => setOpen(false)} />

        <div className={`m-3 rounded-2xl bg-slate-50 border border-slate-100 transition-all ${collapsed ? "p-2 text-center" : "p-3.5"}`}>
          {!collapsed && (
            <>
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Tu cuenta</p>
              <p className="mt-0.5 truncate text-sm font-bold text-tinta">{me.inquilino.nombre}</p>
            </>
          )}
          <span
            title={me.inquilino.nombre}
            className={`inline-block rounded-full font-bold tracking-wide uppercase transition-all ${collapsed
                ? "h-4 w-4 rounded-full mt-0.5"
                : "mt-1.5 px-2.5 py-0.5 text-[10px]"
              } ${MODE_BADGE[mode].className}`}
          >
            {collapsed ? "" : MODE_BADGE[mode].label}
          </span>
        </div>
      </aside>

      <div className={`transition-all duration-300 ease-in-out ${collapsed ? "lg:pl-20" : "lg:pl-68"}`}>
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

        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xs sm:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-tinta transition-colors hover:bg-slate-100 active:scale-[0.97] lg:hidden"
            aria-label="Abrir menú"
          >
            <Icon name="menu" className="h-6 w-6" />
          </button>

          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-500">
            {me.inquilino.nombre}
          </p>

          <div className="flex items-center gap-2 sm:gap-3">
            <RealtimeIndicator />
            <UserMenu me={me} />
          </div>
        </header>

        <main className="w-full px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      {/* Asistente como globo flotante en todo el panel (spec 040). */}
      {me.permisos.includes("reportes.ventas") && pathname !== "/panel/asistente" ? <AssistantBubble /> : null}
    </div>
  );
}

function Sidebar({ permisos, collapsed, onNavigate }: { permisos: string[]; collapsed: boolean; onNavigate: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2" aria-label="Secciones del panel">
      {visibleNavigation(permisos).map((section) => (
        <div key={section.title}>
          {!collapsed ? (
            <p className="px-3 pb-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              {section.title}
            </p>
          ) : (
            <div className="mx-auto my-2 h-px w-8 bg-slate-100" />
          )}
          <ul className="space-y-1">
            {section.items.map((item) => {
              const active = item.href === pathname;
              const base = `flex w-full items-center rounded-2xl text-sm font-semibold transition-all ${collapsed ? "h-12 w-12 mx-auto justify-center active:scale-[0.96]" : "h-11 gap-3.5 px-3.5 active:scale-[0.99]"
                }`;

              return (
                <li key={item.label}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`${base} ${active
                          ? "bg-azul text-white shadow-xs ring-2 ring-azul/20"
                          : "text-tinta hover:bg-slate-100/80 hover:text-azul"
                        }`}
                    >
                      <Icon name={item.icon} className={collapsed ? "h-6 w-6" : "h-5 w-5"} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  ) : (
                    <span
                      title={collapsed ? `${item.label} (Próximamente)` : undefined}
                      className={`${base} cursor-not-allowed text-slate-300`}
                      aria-disabled="true"
                    >
                      <Icon name={item.icon} className={collapsed ? "h-6 w-6" : "h-5 w-5"} />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                            Pronto
                          </span>
                        </>
                      )}
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

