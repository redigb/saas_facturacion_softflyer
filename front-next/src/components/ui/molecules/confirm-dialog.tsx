"use client";

import { useEffect, useRef } from "react";

import { Icon, type IconName } from "@/components/icons";
import { Button } from "@/components/ui/atoms";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  icon?: IconName;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Diálogo modal de confirmación propio de la UI de Softflyer.
 * Reemplaza los diálogos nativos del navegador (window.confirm/alert).
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "warning",
  icon = "alerta",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const tones = {
    warning: {
      badgeBg: "bg-amber-100",
      badgeText: "text-amber-700",
      confirmVariant: "primary" as const,
    },
    danger: {
      badgeBg: "bg-red-100",
      badgeText: "text-red-700",
      confirmVariant: "danger" as const,
    },
    primary: {
      badgeBg: "bg-sky-100",
      badgeText: "text-primary",
      confirmVariant: "primary" as const,
    },
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Fondo oscuro con desenfoque suave */}
      <div
        aria-hidden="true"
        onClick={onCancel}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Tarjeta del diálogo */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones.badgeBg} ${tones.badgeText}`}>
            <Icon name={icon} className="h-6 w-6" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 id="confirm-dialog-title" className="text-lg font-bold text-foreground">
              {title}
            </h2>
            <p id="confirm-dialog-desc" className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmBtnRef}
            type="button"
            variant={tones.confirmVariant}
            onClick={onConfirm}
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
