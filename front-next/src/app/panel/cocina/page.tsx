import type { Metadata } from "next";

import { KitchenBoard } from "@/app/panel/cocina/kitchen-board";

export const metadata: Metadata = { title: "Cocina · Softflyer" };

export default function CocinaPage() {
  return <KitchenBoard />;
}
