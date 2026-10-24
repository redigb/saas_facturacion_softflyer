import Link from "next/link";
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Ban,
  FileQuestion,
  TrendingUp,
  ArrowRight,
  PhoneCall,
  Mail,
  UserCheck,
} from "lucide-react";

import type { Overview } from "@/app/plataforma/types";
import { ClientStatus, formatDate } from "@/app/plataforma/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

export default async function PlatformOverviewPage() {
  const result = await apiFetch<Overview>("plataforma/resumen");

  if (!result.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-bold">Error al cargar resumen del backoffice</p>
        <p className="mt-1 text-sm">{result.error.mensaje}</p>
      </div>
    );
  }

  const o = result.data;
  const tiles = [
    {
      label: "Clientes",
      value: o.clientes,
      hint: "Restaurantes registrados",
      icon: Users,
      color: "text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800",
    },
    {
      label: "En prueba",
      value: o.en_prueba,
      hint: `${o.por_vencer} vencen en ≤ 2 días`,
      icon: Clock,
      color: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40",
    },
    {
      label: "Pruebas vencidas",
      value: o.pruebas_vencidas,
      hint: "Esperan contacto comercial",
      icon: AlertTriangle,
      color: "text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/40",
    },
    {
      label: "De pago",
      value: o.de_pago,
      hint: "Con suscripción activa",
      icon: CheckCircle2,
      color: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
    },
    {
      label: "Suspendidos",
      value: o.suspendidos,
      hint: "Sin acceso a operar",
      icon: Ban,
      color: "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/40",
    },
    {
      label: "Solicitudes",
      value: o.solicitudes_pendientes,
      hint: "Registros sin verificar",
      icon: FileQuestion,
      color: "text-slate-700 bg-slate-100 dark:text-slate-300 dark:bg-slate-800",
    },
    {
      label: "Conversión",
      value: o.conversion === null ? "—" : `${o.conversion}%`,
      hint: "Pruebas web que pagan",
      icon: TrendingUp,
      color: "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Resumen de Plataforma</h1>
          <p className="mt-1 text-sm text-muted-foreground">Métricas clave, salud comercial y seguimiento de clientes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/plataforma/solicitudes">Ver solicitudes</Link>
          </Button>
          <Button asChild size="sm" className="bg-azul text-white hover:bg-azul-oscuro">
            <Link href="/plataforma/clientes/nuevo">+ Nuevo cliente</Link>
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
        {tiles.map((tile) => {
          const IconComponent = tile.icon;
          return (
            <Card key={tile.label} className="border-border/80 shadow-xs hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{tile.label}</span>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${tile.color}`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {tile.value}
                </div>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground leading-tight">{tile.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Ventas & Seguimiento */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <span>Seguimiento de ventas</span>
                {o.seguimiento.length > 0 && (
                  <Badge variant="warning" className="text-xs font-bold">
                    {o.seguimiento.length} pendientes
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                Pruebas que vencen pronto o ya vencieron: contacto comercial prioritario.
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/plataforma/clientes" className="flex items-center gap-1.5 font-bold text-azul hover:text-azul-oscuro">
                <span>Directorio completo</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {o.seguimiento.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <UserCheck className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">Sin pruebas críticas</p>
              <p className="text-xs text-muted-foreground/70">Ninguna prueba vence en los próximos 2 días.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {o.seguimiento.map((client) => (
                <div
                  key={client.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <Link
                        href={`/plataforma/clientes/${client.slug}`}
                        className="font-bold text-foreground hover:text-azul transition-colors"
                      >
                        {client.nombre}
                      </Link>
                      <ClientStatus client={client} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                        {client.contacto.correo}
                      </span>
                      {client.contacto.telefono && (
                        <span className="flex items-center gap-1">
                          <PhoneCall className="h-3.5 w-3.5 text-muted-foreground/70" />
                          {client.contacto.telefono}
                        </span>
                      )}
                      <span className="text-muted-foreground/70">· Contacto: {client.contacto.nombre}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Vence: {formatDate(client.prueba!.vence_en)}
                      </p>
                      <p className="text-[11px] font-bold text-amber-600">
                        {client.prueba?.dias_restantes === 0
                          ? "Vence hoy"
                          : `${client.prueba?.dias_restantes ?? 0} días restantes`}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="hover:border-azul hover:text-azul">
                      <Link href={`/plataforma/clientes/${client.slug}`}>Gestionar</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
