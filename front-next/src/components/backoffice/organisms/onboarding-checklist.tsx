import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export type OnboardingStep = {
  label: string;
  hint: string;
  done: boolean;
  /** Pestaña de la ficha donde se completa. */
  tab: string;
};

/** Qué le falta a un cliente para emitir en producción: cada paso pendiente lleva a donde se resuelve. */
export function OnboardingChecklist({ steps, baseHref }: { steps: OnboardingStep[]; baseHref: string }) {
  const completed = steps.filter((step) => step.done).length;
  const percent = Math.round((completed / steps.length) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Puesta en marcha</CardTitle>
        <CardDescription>
          {completed === steps.length ? "Todo listo: el cliente puede emitir en producción." : `${completed} de ${steps.length} pasos completos.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
        </div>
        <ul className="mt-4 divide-y divide-border">
          {steps.map((step) => (
            <li key={step.label} className="flex items-start gap-3 py-3 text-sm">
              {step.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{step.label}</p>
                <p className="text-muted-foreground">{step.hint}</p>
              </div>
              {step.done ? null : (
                <Link href={`${baseHref}?tab=${step.tab}`} scroll={false} className="shrink-0 text-xs font-bold text-primary hover:underline">
                  Completar
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
