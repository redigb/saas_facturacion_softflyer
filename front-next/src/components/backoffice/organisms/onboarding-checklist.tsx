import { Check } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type OnboardingStep = {
  label: string;
  hint: string;
  done: boolean;
  /** Pestaña de la ficha donde se completa. */
  tab: string;
  /** Ancla dentro de esa pestaña, cuando el paso se resuelve en la misma página. */
  anchor?: string;
};

/**
 * Qué le falta a un cliente para emitir en producción. Solo los pasos pendientes ocupan espacio: cada uno lleva a
 * donde se resuelve; los hechos se resumen en una línea.
 */
export function OnboardingChecklist({ steps, baseHref }: { steps: OnboardingStep[]; baseHref: string }) {
  const completed = steps.filter((step) => step.done);
  const pending = steps.filter((step) => !step.done);
  const next = pending[0];

  return (
    <Card className="border-border bg-card shadow-xs">
      <div className="space-y-4 px-5 pb-5 pt-6 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-lg font-bold text-foreground">Puesta en marcha</h2>
          <p className="text-sm tabular-nums text-muted-foreground">
            {completed.length} de {steps.length} pasos
          </p>
        </div>

        {/* Un tramo por paso: azul hecho, amarillo el siguiente, gris lo que viene después. */}
        <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-hidden>
          {steps.map((step) => (
            <li
              key={step.label}
              title={step.label}
              className={cn("h-2 rounded-full", step.done ? "bg-primary" : step === next ? "bg-warning" : "bg-muted")}
            />
          ))}
        </ol>

        {pending.length === 0 ? (
          <p className="text-sm leading-relaxed text-foreground">Todo listo: el cliente tiene lo necesario para emitir con validez.</p>
        ) : completed.length > 0 ? (
          <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={3} aria-hidden />
            <span>
              <span className="sr-only">Completados: </span>
              {completed.map((step) => step.label).join(", ")}.
            </span>
          </p>
        ) : null}
      </div>

      {pending.length > 0 ? (
        <ul className="divide-y divide-border/70 border-t border-border/70">
          {pending.map((step) => (
            <li
              key={step.label}
              className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4 sm:px-6", step === next && "bg-warning/10")}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {step.label}
                  {step === next ? <span className="ml-2 text-[13px] font-semibold text-foreground/70">Siguiente paso</span> : null}
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{step.hint}</p>
              </div>
              <Button asChild size="sm" variant={step === next ? "default" : "outline"} className="shrink-0 font-semibold">
                <Link href={`${baseHref}?tab=${step.tab}${step.anchor ? `#${step.anchor}` : ""}`} scroll={Boolean(step.anchor)}>
                  Completar
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
