"use client";

import { useEffect, useRef, useState } from "react";

import { logout } from "@/app/panel/actions";
import { SwitchUserDialog } from "@/app/panel/switch-user";
import { Icon } from "@/components/icons";
import type { Me } from "@/lib/api";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Menú desplegable del usuario en la cabecera.
 * Agrupa las opciones "Cambiar usuario" (vía PIN) y "Salir" bajo el avatar del perfil.
 */
export function UserMenu({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      {/* Botón trigger con datos del usuario y avatar */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Opciones de cuenta"
        className={`flex items-center gap-3 rounded-2xl p-1 sm:px-2.5 sm:py-1.5 transition-all outline-none focus-visible:ring-2 focus-visible:ring-azul/40 ${
          open ? "bg-slate-100" : "hover:bg-slate-100/80 active:scale-[0.98]"
        }`}
      >
        <div className="hidden text-right sm:block">
          <p className="text-sm font-bold text-tinta">{me.usuario.nombre}</p>
          <p className="text-xs text-slate-500">{me.roles.join(", ") || "Usuario"}</p>
        </div>

        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-azul text-sm font-bold text-white shadow-2xs">
          {initials(me.usuario.nombre)}
        </span>

        <Icon
          name="abajo"
          className={`hidden h-4 w-4 text-slate-400 transition-transform duration-200 sm:block ${
            open ? "rotate-180 text-azul" : ""
          }`}
        />
      </button>

      {/* Menú desplegable */}
      {open && (
        <div
          role="menu"
          aria-label="Menú de usuario"
          className="absolute right-0 top-full z-50 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95"
        >
          {/* Cabecera del desplegable con datos completos */}
          <div className="px-3 py-2">
            <p className="text-sm font-bold text-tinta">{me.usuario.nombre}</p>
            <p className="truncate text-xs text-slate-500">{me.usuario.correo}</p>
            <span className="mt-1.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {me.roles.join(", ") || "Sin rol"}
            </span>
          </div>

          <div className="my-1 border-t border-slate-100" />

          {/* Opción 1: Cambiar de usuario con PIN */}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setSwitchOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100 hover:text-azul active:scale-[0.98]"
          >
            <Icon name="equipo" className="h-5 w-5 text-slate-500" />
            <div className="text-left">
              <p className="leading-tight">Cambiar usuario</p>
              <p className="text-[11px] font-normal text-slate-400">Entrar con PIN en este equipo</p>
            </div>
          </button>

          {/* Opción 2: Salir (Cerrar sesión) */}
          <form action={logout}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 active:scale-[0.98]"
            >
              <Icon name="salir" className="h-5 w-5 text-red-500" />
              <span>Salir</span>
            </button>
          </form>
        </div>
      )}

      {/* Diálogo modal de cambio de usuario con PIN */}
      {switchOpen && <SwitchUserDialog onClose={() => setSwitchOpen(false)} />}
    </div>
  );
}
