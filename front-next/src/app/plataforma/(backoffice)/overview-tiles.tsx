"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileQuestion,
  MoreHorizontal,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Overview } from "@/app/plataforma/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricTile = {
  label: string;
  href?: string;
  value: string | number;
  badge: string;
  badgeClass: string;
  trend: string;
  trendPositive?: boolean;
  hint: string;
  icon: LucideIcon;
};

export function OverviewTiles({ overview: o }: { overview: Overview }) {
  const [showMore, setShowMore] = useState(false);

  const primaryTiles: MetricTile[] = [
    {
      label: "Clientes Registrados",
      href: "/plataforma/clientes",
      value: o.clientes,
      badge: "Total",
      badgeClass: "border-[#0c5ea7]/20 bg-[#0c5ea7]/10 text-[#0c5ea7] dark:text-[#18b4fa]",
      trend: "Restaurantes activos",
      trendPositive: true,
      hint: "Altas totales en la plataforma",
      icon: Users,
    },
    {
      label: "Clientes de Pago",
      href: "/plataforma/clientes?estado=pago",
      value: o.de_pago,
      badge: "Activos ↗",
      badgeClass: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      trend: "Suscripción activa",
      trendPositive: true,
      hint: "Generando ingresos recurrentes",
      icon: CheckCircle2,
    },
    {
      label: "En Periodo de Prueba",
      href: "/plataforma/clientes?estado=prueba",
      value: o.en_prueba,
      badge: `${o.por_vencer} por vencer`,
      badgeClass: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      trend: "Oportunidad de conversión",
      trendPositive: o.por_vencer === 0,
      hint: o.por_vencer > 0 ? `${o.por_vencer} vencen en ≤ 2 días` : "Sin vencimientos inmediatos",
      icon: Clock,
    },
    {
      label: "Tasa de Conversión",
      value: o.conversion === null ? "—" : `${o.conversion}%`,
      badge: o.conversion !== null ? `${o.conversion}%` : "En curso",
      badgeClass: "border-[#18b4fa]/25 bg-[#18b4fa]/10 text-[#0c5ea7] dark:text-[#18b4fa]",
      trend: "Pruebas web que pagan",
      trendPositive: true,
      hint: "Efectividad comercial global",
      icon: TrendingUp,
    },
  ];

  const secondaryTiles: MetricTile[] = [
    {
      label: "Pruebas Vencidas",
      href: "/plataforma/clientes?estado=vencidas",
      value: o.pruebas_vencidas,
      badge: `${o.pruebas_vencidas} pendientes`,
      badgeClass: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400",
      trend: "Esperan contacto comercial",
      trendPositive: false,
      hint: "Prueba gratis de 7 días finalizada",
      icon: AlertTriangle,
    },
    {
      label: "Cuentas Suspendidas",
      href: "/plataforma/clientes?estado=suspendidos",
      value: o.suspendidos,
      badge: `${o.suspendidos}`,
      badgeClass: "border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400",
      trend: "Sin acceso a operar",
      trendPositive: false,
      hint: "Por vencimiento o decisión del cliente",
      icon: Ban,
    },
    {
      label: "Solicitudes Web",
      href: "/plataforma/solicitudes",
      value: o.solicitudes_pendientes,
      badge: "Nuevas",
      badgeClass: "border-border/60 bg-muted/40 text-muted-foreground",
      trend: "Registros sin verificar",
      trendPositive: false,
      hint: "Requieren confirmación de correo",
      icon: FileQuestion,
    },
  ];

  function renderCard(tile: MetricTile) {
    const IconComponent = tile.icon;
    const body = (
      <Card className="h-full rounded-2xl border border-border/70 bg-card p-5 shadow-xs transition-all hover:border-border hover:shadow-md group-hover/tile:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover/tile:translate-y-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconComponent className="size-4 text-muted-foreground/70 shrink-0" />
            <span className="text-sm font-medium text-muted-foreground">{tile.label}</span>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
              tile.badgeClass
            )}
          >
            {tile.badge}
          </span>
        </div>
        <div className="mt-4 text-4xl font-extrabold tracking-tight text-foreground tabular-nums">
          {tile.value}
        </div>
        <div className="mt-4 flex flex-col gap-0.5 border-t border-border/40 pt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <span>{tile.trend}</span>
            <ArrowUpRight
              className={cn(
                "size-3.5 shrink-0",
                tile.trendPositive ? "text-emerald-500" : "text-muted-foreground"
              )}
            />
          </p>
          <p className="text-xs text-muted-foreground">{tile.hint}</p>
        </div>
      </Card>
    );

    return tile.href ? (
      <Link
        key={tile.label}
        href={tile.href}
        aria-label={`${tile.label}: ${tile.value}. ${tile.hint}`}
        className="group/tile rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
      >
        {body}
      </Link>
    ) : (
      <div key={tile.label} className="group/tile">
        {body}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 4 Métricas Principales en 4 columnas */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {primaryTiles.map(renderCard)}
      </section>

      {/* Botón de tres puntos para desplegar más métricas */}
      <div className="flex items-center justify-between pt-1">
        <div className="h-px flex-1 bg-border/60" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowMore((prev) => !prev)}
          aria-expanded={showMore}
          className="mx-3 flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-border hover:bg-muted hover:text-foreground shadow-2xs"
        >
          <MoreHorizontal className="size-4" />
          <span>{showMore ? "Mostrar menos métricas" : "Mostrar más métricas"}</span>
          <ChevronDown
            className={cn("size-3.5 transition-transform duration-200", showMore && "rotate-180")}
          />
        </Button>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* Métricas secundarias desplegables (3 columnas perfectas sin huecos) */}
      {showMore ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {secondaryTiles.map(renderCard)}
        </section>
      ) : null}
    </div>
  );
}
