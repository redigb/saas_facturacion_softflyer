"use client";

import { useState } from "react";

import { activatePlan, cancelClient, extendTrial, reactivateClient, suspendClient } from "@/app/plataforma/actions";
import type { ClientDetail, Plan } from "@/app/plataforma/types";
import { daysBetween, parseDay, today } from "@/app/plataforma/(backoffice)/clientes/[slug]/plan-timeline";
import { MonthCard } from "@/app/plataforma/(backoffice)/clientes/[slug]/month-card";
import { ActionSection } from "@/components/backoffice/molecules/action-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Lo que se hace con el plan: activarlo o renovarlo y, en prueba, sumar días. */
export function PlanActions({ client, plans, currentEnd }: { client: ClientDetail; plans: Plan[]; currentEnd?: string }) {
  if (client.estado === "CANCELADO" || client.estado === "SUSPENDIDO") {
    return null;
  }

  return (
    <div className="divide-y divide-border/70 border-t border-border/70">
      <PlanRenewal client={client} plans={plans} currentEnd={currentEnd} />

      {client.modo === "PRUEBA" ? (
        <ActionSection
          title="Extender la prueba"
          description={client.prueba?.vencida ? "Ya venció: los días se cuentan desde hoy." : "Suma días a la prueba actual."}
          action={extendTrial.bind(null, client.slug)}
          submit="Extender prueba"
          tone="secondary"
        >
          <div className="space-y-1.5 sm:max-w-[16rem]">
            <Label htmlFor="dias" className="text-sm font-semibold">
              Días a sumar
            </Label>
            <Select name="dias" defaultValue="3">
              <SelectTrigger id="dias">
                <SelectValue placeholder="Días" />
              </SelectTrigger>
              <SelectContent>
                {[1, 3, 7, 14].map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} {d === 1 ? "día" : "días"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </ActionSection>
      ) : null}
    </div>
  );
}

const DURATIONS = [1, 3, 6, 12];

/** Vencimiento al sumar `months` meses a `from`; ajusta el día a fin de mes (31 ene + 1 mes = 28 feb), igual que el servidor. */
function endDate(from: Date, months: number): Date {
  const date = new Date(from);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));

  return date;
}

const fullDate = (date: Date) => date.toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });

/**
 * Desde dónde cuenta la renovación. Un plan de pago vigente suma sobre su vencimiento (no se pierde lo pagado);
 * si ya venció o viene de la prueba, cuenta desde hoy. Es la misma regla que aplica el servidor.
 */
function renewalBase(trial: boolean, currentEnd?: string): Date {
  const current = currentEnd ? parseDay(currentEnd) : undefined;

  return !trial && current && current > today() ? current : today();
}

/** Cómo queda el plan después de renovar: la fecha actual y la nueva. */
function RenewalPreview({ next, base }: { next: Date; base: Date }) {
  const carried = daysBetween(today(), base);

  if (carried <= 0) {
    return (
      <p className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-foreground">
        Quedará activo hasta el <span className="font-bold">{fullDate(next)}</span>.
      </p>
    );
  }

  return (
    <div className="rounded-xl bg-primary/5 px-4 py-3.5 ring-1 ring-primary/20">
      <dl className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <dt className="text-[13px] font-medium text-foreground/70">Hoy vence</dt>
          <dd className="text-base font-bold tabular-nums text-foreground">{fullDate(base)}</dd>
        </div>
        <span aria-hidden className="text-lg text-foreground/50">
          →
        </span>
        <div>
          <dt className="text-[13px] font-medium text-foreground/70">Quedará hasta</dt>
          <dd className="text-base font-bold tabular-nums text-foreground">{fullDate(next)}</dd>
        </div>
      </dl>
      <p className="mt-2.5 text-sm leading-relaxed text-foreground">
        Se suma a lo que le queda: conserva sus {carried} {carried === 1 ? "día" : "días"} pendientes.
      </p>
    </div>
  );
}

/** Activar o renovar: se elige plan y duración con opciones visibles y se ve hasta cuándo quedará pagado. */
function PlanRenewal({ client, plans, currentEnd }: { client: ClientDetail; plans: Plan[]; currentEnd?: string }) {
  const [months, setMonths] = useState(1);
  const [plan, setPlan] = useState(plans[0]?.codigo ?? "");
  const trial = client.modo === "PRUEBA";
  const base = renewalBase(trial, currentEnd);

  return (
    <ActionSection
      title={trial ? "Pasar a cliente de pago" : "Renovar el plan"}
      description={
        trial
          ? "Actívalo cuando confirmes el pago. Cuenta desde hoy y la prueba queda en el historial."
          : "Los meses se suman a lo que le queda; si ya venció, cuentan desde hoy."
      }
      action={activatePlan.bind(null, client.slug)}
      submit={`${trial ? "Activar" : "Renovar"} por ${months} ${months === 1 ? "mes" : "meses"}`}
      submitStyle="flow"
    >
      {plans.length > 1 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-foreground">Plan</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {plans.map((item) => (
              <OptionCard key={item.codigo} name="plan" value={item.codigo} checked={plan === item.codigo} onSelect={() => setPlan(item.codigo)}>
                <span className="font-semibold text-foreground">{item.nombre}</span>
                {Number(item.precio_mensual) > 0 ? <span className="text-[13px] text-muted-foreground">S/ {item.precio_mensual} al mes</span> : null}
              </OptionCard>
            ))}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="plan" value={plan} />
      )}

      <fieldset className="space-y-1">
        <legend className="text-sm font-semibold text-foreground">Duración</legend>
        <div className="grid grid-cols-2 gap-4 pt-1 sm:grid-cols-4">
          {DURATIONS.map((m) => {
            const until = endDate(base, m);

            return (
              <MonthCard key={m} months={m} until={fullDate(until)} days={daysBetween(base, until)} checked={months === m} onSelect={() => setMonths(m)} />
            );
          })}
        </div>
      </fieldset>

      <RenewalPreview next={endDate(base, months)} base={base} />
    </ActionSection>
  );
}

/** Opción que se elige tocándola: radio nativo oculto, así viaja en el formulario y funciona con teclado. */
function OptionCard({
  name,
  value,
  checked,
  onSelect,
  center = false,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: () => void;
  center?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex min-h-[3.25rem] cursor-pointer flex-col justify-center rounded-xl border px-3.5 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
        center && "items-center text-center",
        checked ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border hover:border-primary/50 hover:bg-muted/40",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onSelect} className="sr-only" />
      {children}
    </label>
  );
}

/** Acceso del cliente: suspender o reactivar, y la baja definitiva. Plegadas para no ejecutarlas de pasada. */
export function AccessActions({ client }: { client: ClientDetail }) {
  if (client.estado === "CANCELADO") {
    return (
      <Card className="border-border bg-card px-5 py-5 shadow-xs">
        <h3 className="text-base font-bold text-foreground">Cliente dado de baja</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Ya no puede entrar. Sus datos se conservan y el motivo de la baja está en la bitácora.
        </p>
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-border/70 border-border bg-card shadow-xs">
      {client.estado === "SUSPENDIDO" ? (
        <ActionSection
          title="Reactivar"
          description="Recupera el acceso según su suscripción vigente."
          action={reactivateClient.bind(null, client.slug)}
          submit="Reactivar cliente"
        />
      ) : (
        <ActionSection
          title="Suspender"
          description="Bloquea la operación. Conserva sus datos y puede seguir entrando para ver su estado."
          action={suspendClient.bind(null, client.slug)}
          submit="Suspender cliente"
          openLabel="Suspender cliente"
          tone="danger"
        >
          <div className="space-y-1.5">
            <Label htmlFor="suspend-motivo" className="text-sm font-semibold">
              Motivo
            </Label>
            <Input id="suspend-motivo" name="motivo" required maxLength={255} placeholder="Ej. Pago pendiente de regularizar" />
          </div>
        </ActionSection>
      )}

      <ActionSection
        title="Dar de baja"
        description="Baja definitiva: pierde el acceso y se cierran sus sesiones. Los datos se conservan. Para una pausa, usa Suspender."
        action={cancelClient.bind(null, client.slug)}
        submit="Dar de baja"
        openLabel="Dar de baja al cliente"
        tone="danger"
      >
        <div className="space-y-1.5">
          <Label htmlFor="cancel-motivo" className="text-sm font-semibold">
            Motivo
          </Label>
          <Input id="cancel-motivo" name="motivo" required maxLength={255} placeholder="Ej. Cierre definitivo del negocio" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cancel-confirm" className="text-sm font-semibold">
            Escribe <span className="font-mono">{client.slug}</span> para confirmar
          </Label>
          <Input id="cancel-confirm" name="confirmacion" required autoComplete="off" />
        </div>
      </ActionSection>
    </Card>
  );
}
