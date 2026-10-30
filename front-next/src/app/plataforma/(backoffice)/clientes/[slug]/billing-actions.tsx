import type { ClientDetail } from "@/app/plataforma/types";

import { SunatRoute } from "./billing/sunat-route";
import { TaxSettings } from "./billing/tax-settings";

/**
 * Pestaña de facturación electrónica: a la izquierda la ruta hasta emitir con validez en SUNAT, a la derecha el
 * IGV, que no forma parte de esa ruta (sin elegir nada rige el 18 %).
 */
export function BillingActions({ client }: { client: ClientDetail }) {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <SunatRoute client={client} />
      <TaxSettings client={client} />
    </div>
  );
}
