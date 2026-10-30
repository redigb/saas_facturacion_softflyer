"use client";

import { AlertTriangle, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import type { RouteStepState } from "./fiscal-stage";

const STATE_LABEL: Record<RouteStepState, string> = {
  done: "Listo",
  current: "Siguiente paso",
  pending: "Pendiente",
  error: "Requiere atención",
};

/**
 * Una parada de la ruta a SUNAT: marcador en el riel, dato actual, acciones y, si hace falta, un formulario
 * plegado que solo se abre cuando hay algo que cargar o cambiar.
 */
export function RouteStep({
  number,
  state,
  title,
  last = false,
  actions,
  form,
  formOpen = false,
  onFormOpenChange,
  toggleLabel,
  children,
}: {
  number: number;
  state: RouteStepState;
  title: string;
  last?: boolean;
  actions?: React.ReactNode;
  form?: React.ReactNode;
  formOpen?: boolean;
  onFormOpenChange?: (open: boolean) => void;
  toggleLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <li className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4">
      {/* Riel: el tramo queda azul cuando la parada ya está hecha. */}
      {!last ? (
        <span
          aria-hidden
          className={cn("absolute left-[1.0625rem] top-11 bottom-0 w-0.5 rounded-full", state === "done" ? "bg-primary" : "bg-border")}
        />
      ) : null}
      <Marker number={number} state={state} />

      <Collapsible
        open={formOpen}
        onOpenChange={onFormOpenChange}
        className={cn(
          "mb-5 rounded-2xl px-4 py-3.5",
          state === "current" && "bg-warning/10 ring-1 ring-warning/50",
          state === "error" && "bg-destructive/5 ring-1 ring-destructive/40",
          last && "mb-0",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 space-y-1">
            <h3 className="flex flex-wrap items-baseline gap-x-2.5 text-base font-bold text-foreground">
              {title}
              <span
                className={cn(
                  "text-[13px] font-semibold",
                  state === "done" && "text-primary",
                  state === "current" && "text-foreground/80",
                  state === "pending" && "text-muted-foreground",
                  state === "error" && "text-destructive",
                )}
              >
                {STATE_LABEL[state]}
              </span>
            </h3>
            <div className="space-y-0.5 text-sm leading-relaxed text-muted-foreground">{children}</div>
          </div>

          {actions || (form && toggleLabel) ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {actions}
              {form && toggleLabel ? (
                <CollapsibleTrigger asChild>
                  <Button type="button" variant={formOpen ? "ghost" : "outline"} size="sm" className="font-semibold">
                    {formOpen ? "Cancelar" : toggleLabel}
                  </Button>
                </CollapsibleTrigger>
              ) : null}
            </div>
          ) : null}
        </div>

        {form ? (
          <CollapsibleContent>
            <div className="mt-4 border-t border-border/70 pt-4">{form}</div>
          </CollapsibleContent>
        ) : null}
      </Collapsible>
    </li>
  );
}

function Marker({ number, state }: { number: number; state: RouteStepState }) {
  return (
    <span
      className={cn(
        "relative z-10 mt-2.5 flex size-9 items-center justify-center rounded-full text-sm font-bold tabular-nums",
        state === "done" && "bg-primary text-primary-foreground",
        state === "current" && "bg-warning text-neutral-900 ring-4 ring-warning/25",
        state === "pending" && "border-2 border-border bg-card text-muted-foreground",
        state === "error" && "bg-destructive text-destructive-foreground",
      )}
    >
      {state === "done" ? (
        <Check className="size-4.5" strokeWidth={3} aria-hidden />
      ) : state === "error" ? (
        <AlertTriangle className="size-4" aria-hidden />
      ) : (
        number
      )}
      <span className="sr-only">Paso {number}</span>
    </span>
  );
}
