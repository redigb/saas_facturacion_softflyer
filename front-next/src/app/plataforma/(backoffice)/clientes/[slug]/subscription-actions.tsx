"use client";

import { activatePlan, cancelClient, extendTrial, reactivateClient, suspendClient } from "@/app/plataforma/actions";
import type { ClientDetail, Plan } from "@/app/plataforma/types";
import { ActionCard } from "@/components/backoffice/molecules/action-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

/** Ciclo de vida comercial: plan, prueba, suspensión y baja. */
export function SubscriptionActions({ client, plans }: { client: ClientDetail; plans: Plan[] }) {
  const suspended = client.estado === "SUSPENDIDO";

  if (client.estado === "CANCELADO") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cliente cancelado</CardTitle>
          <CardDescription>Ya no puede entrar. Sus datos se conservan; el motivo de la baja está en la bitácora.</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {suspended ? null : (
        <ActionCard
          title={client.modo === "PRUEBA" ? "Pasar a cliente de pago" : "Renovar plan"}
          description={client.modo === "PRUEBA" ? "Activa su plan cuando confirmes el pago. Su prueba queda en el historial." : "Abre un nuevo periodo desde hoy."}
          action={activatePlan.bind(null, client.slug)}
          submit="Activar plan"
        >
          <div className="grid grid-cols-2 gap-3">
            <NativeSelect name="plan" required aria-label="Plan">
              {plans.map((plan) => (
                <option key={plan.codigo} value={plan.codigo}>{plan.nombre}</option>
              ))}
            </NativeSelect>
            <NativeSelect name="meses" defaultValue="1" aria-label="Meses">
              {[1, 3, 6, 12].map((m) => (
                <option key={m} value={m}>{m} {m === 1 ? "mes" : "meses"}</option>
              ))}
            </NativeSelect>
          </div>
        </ActionCard>
      )}

      {client.modo === "PRUEBA" && !suspended ? (
        <ActionCard
          title="Extender la prueba"
          description={client.prueba?.vencida ? "Ya venció: los días se cuentan desde hoy." : "Suma días a su prueba actual."}
          action={extendTrial.bind(null, client.slug)}
          submit="Extender"
          secondary
        >
          <NativeSelect name="dias" defaultValue="3" aria-label="Días">
            {[1, 3, 7, 14].map((d) => (
              <option key={d} value={d}>+{d} {d === 1 ? "día" : "días"}</option>
            ))}
          </NativeSelect>
        </ActionCard>
      ) : null}

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
          <Input name="motivo" required maxLength={255} placeholder="Motivo (ej. pago pendiente)" aria-label="Motivo" />
        </ActionCard>
      )}

      <ActionCard
        title="Cancelar cliente"
        description="Baja definitiva: pierde el acceso y se cierran sus sesiones. Los datos se conservan. Para una pausa usa Suspender."
        action={cancelClient.bind(null, client.slug)}
        submit="Cancelar cliente"
        danger
      >
        <Input name="motivo" required maxLength={255} placeholder="Motivo de la baja" aria-label="Motivo de la baja" />
        <Input name="confirmacion" required autoComplete="off" placeholder={`Escribe «${client.slug}» para confirmar`} aria-label="Confirmación" />
      </ActionCard>
    </div>
  );
}
