import type { Metadata } from "next";

import { KitchenBoard } from "@/app/panel/cocina/kitchen-board";

export const metadata: Metadata = { title: "KDS · Softflyer" };

export default function CocinaPage() {
  return <KitchenBoard />;
}
