import type { Metadata } from "next";

import { CashView } from "@/app/panel/caja/cash-view";

export const metadata: Metadata = { title: "Caja · Softflyer" };

export default function CajaPage() {
  return <CashView />;
}
