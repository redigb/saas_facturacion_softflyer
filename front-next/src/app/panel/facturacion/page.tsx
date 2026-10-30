import type { Metadata } from "next";

import { BillingView } from "@/app/panel/facturacion/billing-view";

export const metadata: Metadata = { title: "Facturación · Softflyer" };

export default function BillingPage() {
  return <BillingView />;
}
