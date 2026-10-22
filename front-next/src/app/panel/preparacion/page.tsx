import type { Metadata } from "next";

import { PreparationView } from "@/app/panel/preparacion/preparation-view";

export const metadata: Metadata = { title: "Preparación · Softflyer" };

export default function PreparationPage() {
  return <PreparationView />;
}
