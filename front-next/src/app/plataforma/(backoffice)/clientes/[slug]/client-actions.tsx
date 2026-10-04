"use client";

import { useActionState } from "react";

import { activatePlan, extendTrial, reactivateClient, suspendClient, type FormState } from "@/app/plataforma/actions";
import type { ClientDetail, Plan } from "@/app/plataforma/types";
import { cardClass, inputClass, primaryButton } from "@/app/plataforma/ui";

export function ClientActions({ client, plans }: { client: ClientDetail; plans: Plan[] }) {
  const suspended = client.estado === "SUSPENDIDO";

  return (
    <div className="space-y-6">
      {!suspended && (
        <ActionCard
          title={client.modo === "PRUEBA" ? "Pasar a cliente de pago" : "Renovar plan"}
          description={client.modo === "PRUEBA" ? "Activa su plan cuando confirme el pago. Su prueba queda en el historial." : "Abre un nuevo periodo desde hoy."}
          action={activatePlan.bind(null, client.slug)}
          submit="Activar plan"
        >
          <div className="grid grid-cols-2 gap-3">
            <select name="plan" required className={inputClass} aria-label="Plan">
              {plans.map((plan) => (
                <option key={plan.codigo} value={plan.codigo}>{plan.nombre}</option>
              ))}
            </select>
            <select name="meses" defaultValue="1" className={inputClass} aria-label="Meses">
              {[1, 3, 6, 12].map((m) => (
                <option key={m} value={m}>{m} {m === 1 ? "mes" : "meses"}</option>
              ))}
            </select>
          </div>
        </ActionCard>
      )}

      {client.modo === "PRUEBA" && !suspended && (
        <ActionCard
          title="Extender la prueba"
          description={client.prueba?.vencida ? "Ya venció: los días se cuentan desde hoy." : "Suma días a su prueba actual."}
          action={extendTrial.bind(null, client.slug)}
          submit="Extender"
          secondary
        >
          <select name="dias" defaultValue="3" className={inputClass} aria-label="Días">
            {[1, 3, 7, 14].map((d) => (
              <option key={d} value={d}>+{d} {d === 1 ? "día" : "días"}</option>
            ))}
          </select>
        </ActionCard>
      )}

      {suspended ? (
        <ActionCard
          title="Reactivar"
          description="Vuelve a tener acceso según su suscripción vigente."
          action={reactivateClient.bind(null, client.slug)}
          submit="Reactivar cliente"
        />
      ) : (
        <ActionCard
          title="Suspender"
          description="Bloquea la operación. Conserva sus datos y puede seguir entrando para ver su estado."
          action={suspendClient.bind(null, client.slug)}
          submit="Suspender cliente"
          danger
        >
          <input name="motivo" required maxLength={255} placeholder="Motivo (ej. pago pendiente)" className={inputClass} aria-label="Motivo" />
        </ActionCard>
      )}
    </div>
  );
}

function ActionCard({
  title,
  description,
  action,
  submit,
  children,
  secondary = false,
  danger = false,
}: {
  title: string;
  description: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submit: string;
  children?: React.ReactNode;
  secondary?: boolean;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const buttonClass = danger
    ? "inline-flex items-center justify-center rounded-xl border-2 border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
    : secondary
      ? "inline-flex items-center justify-center rounded-xl border-2 border-azul px-4 py-2.5 text-sm font-bold text-azul transition hover:bg-azul hover:text-white disabled:opacity-60"
      : primaryButton;

  return (
    <section className={cardClass}>
      <h2 className="font-bold text-tinta">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <form action={formAction} className="mt-4 space-y-3">
        {children}
        <button type="submit" disabled={pending} className={`${buttonClass} w-full`}>
          {pending ? "Guardando…" : submit}
        </button>
        {state.mensaje && (
          <p role="status" className={`text-sm font-medium ${state.ok ? "text-emerald-600" : "text-red-600"}`}>
            {state.mensaje}
          </p>
        )}
      </form>
    </section>
  );
}
