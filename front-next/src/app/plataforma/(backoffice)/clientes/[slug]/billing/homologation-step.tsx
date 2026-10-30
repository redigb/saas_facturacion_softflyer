"use client";

import { setHomologation } from "@/app/plataforma/actions";
import type { ClientDetail } from "@/app/plataforma/types";
import { Button } from "@/components/ui/button";

import type { RouteStepState } from "./fiscal-stage";
import { RouteStep } from "./route-step";
import { FormError, useToastAction } from "@/components/backoffice/molecules/use-toast-action";

export function HomologationStep({ slug, fiscal, state }: { slug: string; fiscal: ClientDetail["fiscal"]; state: RouteStepState }) {
  const [result, formAction, pending] = useToastAction(() => setHomologation(slug, !fiscal.homologado));

  return (
    <RouteStep
      number={3}
      state={state}
      title="Homologación en SUNAT"
      actions={
        <form
          action={formAction}
          onSubmit={(event) => {
            // Retirarla devuelve al cliente a emitir sin validez: se confirma antes.
            if (fiscal.homologado && !window.confirm("El cliente volverá a emitir en pruebas, sin validez tributaria. ¿Retirar la homologación?")) {
              event.preventDefault();
            }
          }}
        >
          <Button
            type="submit"
            variant={fiscal.homologado ? "ghost" : state === "current" ? "default" : "outline"}
            size="sm"
            isLoading={pending}
            className={fiscal.homologado ? "font-semibold text-muted-foreground hover:text-destructive" : "font-semibold"}
          >
            {pending ? "Guardando…" : fiscal.homologado ? "Retirar homologación" : "Marcar como homologado"}
          </Button>
        </form>
      }
    >
      <p>
        {fiscal.homologado
          ? "SUNAT reconoce al cliente como emisor electrónico."
          : "Es el permiso de SUNAT para emitir comprobantes reales. Márcalo cuando el cliente figure como emisor electrónico en SUNAT Operaciones en Línea."}
      </p>
      <FormError state={result} />
    </RouteStep>
  );
}
