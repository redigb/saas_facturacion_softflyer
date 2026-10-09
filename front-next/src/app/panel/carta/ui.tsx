"use client";

import { useEffect, useId, useRef } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { Icon } from "@/components/icons";
import { ApiRequestError } from "@/lib/browser-api";

export const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base text-tinta transition-all placeholder:text-slate-400 focus:border-azul focus:ring-4 focus:ring-azul/10 focus:outline-none aria-invalid:border-red-400 aria-invalid:focus:ring-red-100";

export const primaryButton =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-azul px-4.5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-azul-oscuro hover:shadow active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-celeste/40 focus-visible:outline-none disabled:opacity-60 disabled:pointer-events-none";

export const secondaryButton =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-tinta shadow-2xs transition-all hover:border-slate-300 hover:bg-slate-50/80 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none";

export const dangerButton =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60";

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
}) {
  const id = useId();
  const messageId = `${id}-mensaje`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-tinta">
        {label}
      </label>
      {children(id, error || hint ? messageId : undefined)}
      {error ? (
        <p id={messageId} className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
          <Icon name="alerta" className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="mt-1.5 text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Panel lateral animado; en celular ocupa toda la pantalla. Esc lo cierra. */
export function Drawer({
  title,
  open,
  onClose,
  children,
  footer,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();

    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Fondo oscuro con fade-in */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-tinta/50 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
      />
      {/* Panel con slide-in desde la derecha */}
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex h-full w-full flex-col bg-white shadow-2xl duration-200 animate-in slide-in-from-right sm:max-w-md sm:border-l sm:border-slate-200"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5 bg-white">
          <h2 className="text-lg font-bold text-tinta">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <Icon name="cerrar" className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-100 bg-slate-50/60 px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;
}

/**
 * Lleva los `detalles` de un 422 a cada campo del formulario y enfoca el primero.
 * Devuelve false si el error no era de validación (lo muestra quien llama).
 */
export function applyApiErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fields: readonly string[]): boolean {
  if (!(error instanceof ApiRequestError) || error.status !== 422 || !error.detalles) {
    return false;
  }

  let first = true;
  for (const [field, messages] of Object.entries(error.detalles)) {
    const name = fields.find((candidate) => field === candidate || field.startsWith(`${candidate}.`));
    if (name) {
      setError(name as Path<T>, { message: messages[0] }, { shouldFocus: first });
      first = false;
    }
  }

  return !first;
}

export const CATEGORY_COLORS = ["#18B4FA", "#0C5EA7", "#FCCD0B", "#F97316", "#EF4444", "#10B981", "#8B5CF6", "#64748B"];
