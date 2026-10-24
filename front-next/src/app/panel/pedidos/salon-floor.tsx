"use client";

import { useMemo } from "react";

import { fromPlan, type FloorItem } from "@/app/panel/plano/editor-state";
import { FloorCanvas } from "@/app/panel/plano/floor-canvas";
import type { OrderSummary } from "@/lib/schemas/pedidos";
import type { Plan, PlanTable } from "@/lib/schemas/plano";

const NOOP = () => {};
const NO_ERRORS: Record<string, string> = {};

/**
 * El salón dibujado por el dueño, en modo Pedidos (spec 018): solo lectura, con cada mesa
 * pintada según su pedido activo, un toque para abrirla o ver su cuenta y una pulsación
 * larga para Anular (spec 019).
 */
export function SalonFloor({
  plan,
  orderOf,
  onTableTap,
  onTableHold,
}: {
  plan: Plan;
  orderOf: (mesaId: number) => OrderSummary | undefined;
  onTableTap: (table: PlanTable) => void;
  onTableHold?: (table: PlanTable) => void;
}) {
  const { items, overlays } = useMemo(() => {
    const overlays: Record<string, string> = {};

    const items = fromPlan(plan).items.map((item) => {
      if (item.kind !== "mesa" || item.id === undefined) return item;

      const order = orderOf(item.id);
      if (order) overlays[item.key] = `#${order.numero}`;

      const estado = order
        ? order.estado === "POR_COBRAR"
          ? ("POR_COBRAR" as const)
          : ("OCUPADA" as const)
        : item.estado === "BLOQUEADA"
          ? ("BLOQUEADA" as const)
          : ("LIBRE" as const);

      return { ...item, estado };
    });

    return { items, overlays };
  }, [plan, orderOf]);

  function tableOf(item: FloorItem): PlanTable | undefined {
    if (item.kind !== "mesa" || item.id === undefined) return undefined;
    return plan.mesas.find((mesa) => mesa.id === item.id);
  }

  function handleTableClick(item: FloorItem) {
    const table = tableOf(item);
    if (table) onTableTap(table);
  }

  function handleTableHold(item: FloorItem) {
    const table = tableOf(item);
    if (table) onTableHold?.(table);
  }

  return (
    <FloorCanvas
      width={plan.salon.ancho}
      height={plan.salon.alto}
      items={items}
      selected={null}
      errors={NO_ERRORS}
      editable={false}
      dispatch={NOOP}
      onTableClick={handleTableClick}
      onTableHold={handleTableHold}
      overlays={overlays}
    />
  );
}
