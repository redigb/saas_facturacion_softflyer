import type { ClientDetail } from "@/app/plataforma/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { CertificateStep } from "./certificate-step";
import { fiscalStage, routeSteps } from "./fiscal-stage";
import { HomologationStep } from "./homologation-step";
import { RouteStep } from "./route-step";
import { SolStep } from "./sol-step";
import { TONE_CLASSES } from "./stage-badge";

/**
 * Ruta del cliente hasta emitir con validez. Reemplaza las tarjetas de estado sueltas: cada parada muestra su
 * dato y su acción, y la primera sin completar queda marcada como el siguiente paso.
 */
export function SunatRoute({ client }: { client: ClientDetail }) {
  const { fiscal } = client;
  const stage = fiscalStage(fiscal);
  const steps = routeSteps(fiscal);

  return (
    <Card className="overflow-hidden border-border bg-card shadow-xs">
      <header className="space-y-2 px-5 pb-5 pt-6 sm:px-7">
        <p className="text-sm font-medium text-muted-foreground">Estado en SUNAT</p>
        <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground">
          <span aria-hidden className={cn("size-3 shrink-0 rounded-full", TONE_CLASSES[stage.tone])} />
          {stage.label}
        </h2>
        <p className="max-w-[65ch] text-sm leading-relaxed text-muted-foreground">{stage.summary}</p>
      </header>

      <ol className="border-t border-border/70 px-5 py-6 sm:px-7" aria-label="Pasos para emitir con validez">
        <CertificateStep slug={client.slug} fiscal={fiscal} state={steps.certificado} />
        <SolStep slug={client.slug} fiscal={fiscal} state={steps.sol} />
        <HomologationStep slug={client.slug} fiscal={fiscal} state={steps.homologacion} />
        <RouteStep number={4} state={steps.produccion} title="Emisión en producción" last>
          <p>
            {fiscal.entorno === "PRODUCCION"
              ? "Sus comprobantes salen a SUNAT producción con validez tributaria."
              : "No requiere acción: con el cliente homologado, el servidor de producción envía sus comprobantes a SUNAT producción. Este servidor envía a SUNAT beta."}
          </p>
        </RouteStep>
      </ol>
    </Card>
  );
}
