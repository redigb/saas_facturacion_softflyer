"use client";

import { useId, useState } from "react";

import type { FormState } from "@/app/plataforma/actions";
import { FormError, useToastAction } from "@/components/backoffice/molecules/use-toast-action";
import { Button } from "@/components/ui/button";
import { FlowButton } from "@/components/ui/flow-button";
import { cn } from "@/lib/utils";

/**
 * Una acción del backoffice dentro de una tarjeta: título, explicación, campos y botón. Con `openLabel` el
 * formulario queda plegado tras un botón, para que las acciones delicadas no se ejecuten de pasada. Con
 * `submitStyle="flow"` el botón de enviar va en la fila del título, a la derecha, con el efecto Flow.
 */
export function ActionSection({
  title,
  description,
  action,
  submit,
  children,
  openLabel,
  tone = "default",
  submitStyle = "default",
}: {
  title: string;
  description: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submit: string;
  children?: React.ReactNode;
  openLabel?: string;
  tone?: "default" | "secondary" | "danger";
  submitStyle?: "default" | "flow";
}) {
  const [open, setOpen] = useState(!openLabel);
  const [state, formAction, pending] = useToastAction(action);
  const formId = useId();
  const flow = submitStyle === "flow";

  return (
    <section className="space-y-3 px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className={cn("text-base font-bold", tone === "danger" ? "text-destructive" : "text-foreground")}>{title}</h3>
          <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {flow ? (
          <FlowButton type="submit" form={formId} isLoading={pending} className="shrink-0">
            {pending ? "Guardando…" : submit}
          </FlowButton>
        ) : null}
      </div>

      {open ? (
        <form id={formId} action={formAction} className="space-y-4">
          {children ? <div className="space-y-3">{children}</div> : null}
          <FormError state={state} />
          {flow ? null : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                size="sm"
                isLoading={pending}
                variant={tone === "danger" ? "danger" : tone === "secondary" ? "outline" : "default"}
                className="font-semibold"
              >
                {pending ? "Guardando…" : submit}
              </Button>
              {openLabel ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
              ) : null}
            </div>
          )}
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className={cn("font-semibold", tone === "danger" && "text-destructive hover:text-destructive")}
        >
          {openLabel}
        </Button>
      )}
    </section>
  );
}
