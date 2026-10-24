import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Receipt,
  ShieldAlert,
} from "lucide-react";

import type { FiscalAlert } from "@/app/plataforma/types";
import { formatDateTime } from "@/app/plataforma/ui";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorNotice, EmptyPanel } from "@/components/backoffice/molecules/notice";
import { apiFetch } from "@/lib/api";

const TITLES: Record<FiscalAlert["tipo"], string> = {
  CREDENCIALES: "Credenciales SOL rechazadas",
  SIN_CDR: "Sin constancia de recepción (CDR)",
  VENCIDO: "Fuera de plazo",
  PENDIENTES: "Pendientes de envío",
  CERTIFICADO: "Certificado digital",
};

export default async function AlertsPage() {
  const result = await apiFetch<FiscalAlert[]>("plataforma/alertas");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-7 w-7 text-warning" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Alertas de Facturación</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Lo que necesita tu atención en la emisión de cada cliente. Los envíos se reintentan automáticamente;
          aquí aparece lo que requiere resolución manual o ajuste en SUNAT.
        </p>
      </div>

      {!result.ok ? (
        <ErrorNotice title="Error al consultar alertas" message={result.error.mensaje} />
      ) : result.data.length === 0 ? (
        <Card className="border-border shadow-xs">
          <EmptyPanel icon={CheckCircle2} title="Todo en orden" description="No hay alertas fiscales activas en la plataforma." />
        </Card>
      ) : (
        <div className="space-y-4">
          {result.data.map((alert) => {
            const isHigh = alert.severidad === "alta";
            return (
              <Card
                key={`${alert.slug}-${alert.tipo}`}
                className={`overflow-hidden border transition-shadow hover:shadow-md ${
                  isHigh ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          isHigh ? "bg-destructive/15 text-destructive" : "bg-warning/20 text-warning"
                        }`}
                      >
                        {isHigh ? <AlertOctagon className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={isHigh ? "destructive" : "warning"} className="font-bold uppercase tracking-wider text-[10px]">
                            {isHigh ? "Urgente" : "Revisar"}
                          </Badge>
                          <h2 className="font-bold text-base text-foreground">{TITLES[alert.tipo]}</h2>
                          {alert.tipo !== "CERTIFICADO" && (
                            <Badge variant="outline" className="font-mono text-xs">
                              × {alert.cantidad}
                            </Badge>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-foreground/70">
                          <span className="font-bold text-foreground">{alert.cliente}</span> · {alert.detalle}
                        </p>
                      </div>
                    </div>

                    <Button asChild size="sm" variant={isHigh ? "default" : "outline"} className="shrink-0 gap-1.5">
                      <Link href={`/plataforma/clientes/${alert.slug}`}>
                        <span>Ver cliente</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>

                  {alert.comprobantes.length > 0 && (
                    <div className="mt-4 border-t border-border/60 pt-3">
                      <details className="group text-sm">
                        <summary className="flex cursor-pointer items-center gap-1.5 font-bold text-primary hover:text-primary-hover">
                          <Receipt className="h-4 w-4" />
                          <span>
                            Ver comprobantes afectados
                            {alert.cantidad > alert.comprobantes.length
                              ? ` (${alert.comprobantes.length} de ${alert.cantidad})`
                              : ""}
                          </span>
                        </summary>
                        <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-muted/50">
                          {alert.comprobantes.map((receipt) => (
                            <div key={receipt.numero} className="p-3 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold text-foreground font-mono">{receipt.numero}</span>
                                <span className="text-muted-foreground">
                                  {receipt.tipo} · S/ {receipt.total} · {formatDateTime(receipt.emitido_en)} · {receipt.intentos}{" "}
                                  {receipt.intentos === 1 ? "intento" : "intentos"}
                                </span>
                              </div>
                              {receipt.error && (
                                <p className="mt-1 font-mono text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
                                  {receipt.error}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
