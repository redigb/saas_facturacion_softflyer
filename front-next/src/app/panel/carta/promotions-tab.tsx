"use client";

import { useState } from "react";

import { PromotionDrawer } from "@/app/panel/carta/promotion-drawer";
import { usePermissions } from "@/app/panel/carta/menu-editor";
import { useDeletePromotion, usePromotions } from "@/app/panel/carta/queries";
import { primaryButton, secondaryButton, Skeleton } from "@/app/panel/carta/ui";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { Badge, Button, ConfirmDialog, EmptyState } from "@/components/ui";
import { STATE_LABELS, WEEKDAYS, promotionValue, type Promotion } from "@/lib/schemas/promociones";

type DrawerState = { open: false } | { open: true; promotion?: Promotion };

/** Promociones de precio de la carta (spec 039). */
export function PromotionsTab() {
  const can = usePermissions();
  const promotions = usePromotions();
  const remove = useDeletePromotion();
  const toast = useToast();
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });
  const [deleting, setDeleting] = useState<Promotion | null>(null);

  if (promotions.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    );
  }

  if (promotions.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-bold">No pudimos cargar las promociones.</p>
        <p className="mt-1 text-sm">{promotions.error.message}</p>
        <Button variant="secondary" className="mt-4" onClick={() => void promotions.refetch()}>Reintentar</Button>
      </div>
    );
  }

  const list = promotions.data ?? [];

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      toast({ tone: "ok", message: `Promoción “${deleting.nombre}” eliminada.` });
    } catch (error) {
      toast({ tone: "error", message: error instanceof Error ? error.message : "No se pudo eliminar la promoción." });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-tinta">Promociones</h2>
          <p className="mt-1 text-sm text-slate-500">Descuentos por plato o categoría con vigencia por fecha, día y horario. El mozo ve el precio promocional al tomar el pedido.</p>
        </div>
        {can.create ? (
          <button type="button" className={primaryButton} onClick={() => setDrawer({ open: true })}>
            <Icon name="mas" className="h-4.5 w-4.5" /> Nueva promoción
          </button>
        ) : null}
      </div>

      {list.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon="rayo"
          title="Todavía no hay promociones"
          description={can.create ? "Crea tu primera promo: elige platos o categorías, define el descuento y cuándo se aplica." : "Cuando el administrador cree una promoción aparecerá aquí."}
        />
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {list.map((promotion) => {
            const state = STATE_LABELS[promotion.estado];
            return (
              <li key={promotion.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-bold text-tinta">{promotion.nombre}</h3>
                      <Badge variant={state.tone}>{state.label}</Badge>
                    </div>
                    {promotion.descripcion ? <p className="mt-1 line-clamp-2 text-sm text-slate-500">{promotion.descripcion}</p> : null}
                  </div>
                  <span className="shrink-0 rounded-xl bg-azul/10 px-3 py-1.5 text-lg font-black text-azul tabular-nums">{promotionValue(promotion)}</span>
                </div>

                <dl className="mt-4 grid gap-2 text-sm">
                  <Row icon="carta" label="Alcance" value={scopeLabel(promotion)} />
                  <Row icon="calendario" label="Vigencia" value={vigencia(promotion)} />
                  <Row icon="rayo" label="Días y hora" value={schedule(promotion)} />
                </dl>

                {can.edit || can.delete ? (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    {can.edit ? (
                      <button type="button" className={secondaryButton} onClick={() => setDrawer({ open: true, promotion })}>
                        <Icon name="editar" className="h-4 w-4" /> Editar
                      </button>
                    ) : null}
                    {can.delete ? (
                      <button type="button" className={`${secondaryButton} text-red-600 hover:bg-red-50`} onClick={() => setDeleting(promotion)}>
                        <Icon name="basura" className="h-4 w-4" /> Eliminar
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {drawer.open ? <PromotionDrawer promotion={drawer.promotion} onClose={() => setDrawer({ open: false })} /> : null}

      <ConfirmDialog
        open={deleting !== null}
        title={`¿Eliminar la promoción “${deleting?.nombre ?? ""}”?`}
        description="Los pedidos ya enviados conservan el precio con el que se cobraron. La promoción dejará de aplicarse a nuevos pedidos."
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function Row({ icon, label, value }: { icon: "carta" | "calendario" | "rayo"; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <dt className="w-24 shrink-0 text-slate-500">{label}</dt>
      <dd className="min-w-0 flex-1 font-semibold text-tinta">{value}</dd>
    </div>
  );
}

function scopeLabel(promotion: Promotion): string {
  const names = [...promotion.categorias.map((item) => `Categoría: ${item.nombre}`), ...promotion.productos.map((item) => item.nombre)];
  if (names.length === 0) return "Sin alcance";
  return names.slice(0, 3).join(" · ") + (names.length > 3 ? ` · +${names.length - 3}` : "");
}

function vigencia(promotion: Promotion): string {
  const format = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Lima" });
  return `${format.format(new Date(promotion.desde))} → ${format.format(new Date(promotion.hasta))}`;
}

function schedule(promotion: Promotion): string {
  const days = promotion.dias_semana.length === 0 || promotion.dias_semana.length === 7
    ? "Todos los días"
    : WEEKDAYS.filter((day) => promotion.dias_semana.includes(day.value)).map((day) => day.short).join(" ");

  return promotion.hora_inicio && promotion.hora_fin
    ? `${days} · ${promotion.hora_inicio.slice(0, 5)}–${promotion.hora_fin.slice(0, 5)}`
    : days;
}
