import Link from "next/link";
import { ArrowRight, Mail, PhoneCall, UserCheck } from "lucide-react";

import type { Overview, Plan } from "@/app/plataforma/types";
import { ClientStatus, formatDate } from "@/app/plataforma/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/components/backoffice/molecules/notice";
import { NewClientDialog } from "@/components/backoffice/organisms/new-client-dialog";
import { apiFetch } from "@/lib/api";
import { rootDomainLabel } from "@/lib/tenant";
import { OverviewTiles } from "@/app/plataforma/(backoffice)/overview-tiles";

export default async function PlatformOverviewPage() {
  const [result, plansResult] = await Promise.all([
    apiFetch<Overview>("plataforma/resumen"),
    apiFetch<Plan[]>("plataforma/planes"),
  ]);

  if (!result.ok) {
    return (
      <ErrorNotice title="Error al cargar resumen del backoffice" message={result.error.mensaje} />
    );
  }

  const o = result.data;
  const plans = plansResult.ok ? plansResult.data : [];

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
          <NewClientDialog plans={plans} rootDomain={rootDomainLabel()} />
        </div>
      </div>

      {/* KPI Cards — 4 métricas clave y botón para desplegar más */}
      <OverviewTiles overview={o} />

      {/* Ventas & Seguimiento */}
      <Card className="rounded-2xl border border-border/70 shadow-xs">
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
              <Link href="/plataforma/clientes" className="flex items-center gap-1.5 font-bold text-primary">
                <span>Directorio completo</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {o.seguimiento.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
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
                        className="font-bold text-foreground hover:text-primary transition-colors"
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
                      <p className="text-xs font-bold text-warning">
                        {client.prueba?.dias_restantes === 0
                          ? "Vence hoy"
                          : `${client.prueba?.dias_restantes ?? 0} días restantes`}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="hover:border-primary hover:text-primary">
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
