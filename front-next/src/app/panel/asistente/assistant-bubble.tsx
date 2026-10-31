"use client";

import { useEffect, useState } from "react";

import { AssistantChat } from "@/app/panel/asistente/assistant-chat";
import { Icon } from "@/components/icons";

/** Globo flotante del asistente, disponible en todas las pantallas del panel (spec 040). */
export function AssistantBubble() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Cerrar asistente"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-tinta/40 backdrop-blur-xs sm:hidden"
        />
      ) : null}

      {open ? (
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Asistente"
          className="fixed inset-x-0 bottom-0 z-50 flex h-[88dvh] flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom sm:inset-auto sm:right-6 sm:bottom-24 sm:h-[min(660px,78vh)] sm:w-[420px] sm:rounded-3xl"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-linear-to-r from-azul-oscuro via-azul to-celeste px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Icon name="asistente" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">Asistente</p>
                <p className="truncate text-[11px] text-white/75">Datos de tu restaurante</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar asistente"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              <Icon name="cerrar" className="h-5 w-5" />
            </button>
          </header>

          <div className="min-h-0 flex-1">
            <AssistantChat compact autoFocus />
          </div>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Cerrar asistente" : "Abrir asistente"}
        title={open ? "Cerrar asistente" : "Pregúntale a tus datos"}
        className="fixed right-4 bottom-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-azul text-white shadow-lg ring-4 ring-azul/20 transition-all hover:scale-105 hover:bg-azul-oscuro active:scale-95 sm:right-6 sm:bottom-6"
      >
        <Icon name={open ? "cerrar" : "asistente"} className="h-6 w-6" />
      </button>
    </>
  );
}
