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
          <ShieldAlert className="h-7 w-7 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Alertas de Facturación</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Lo que necesita tu atención en la emisión de cada cliente. Los envíos se reintentan automáticamente;
          aquí aparece lo que requiere resolución manual o ajuste en SUNAT.
        </p>
      </div>

      {!result.ok ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-bold">Error al consultar alertas</p>
          <p className="mt-1 text-sm">{result.error.mensaje}</p>
        </div>
      ) : result.data.length === 0 ? (
        <Card className="border-border p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">Todo en orden</h2>
          <p className="mt-1 text-sm text-muted-foreground">No hay alertas fiscales activas en la plataforma.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {result.data.map((alert) => {
            const isHigh = alert.severidad === "alta";
            return (
              <Card
                key={`${alert.slug}-${alert.tipo}`}
                className={`overflow-hidden border transition-shadow hover:shadow-md ${
                  isHigh ? "border-red-200/80 bg-red-50/10" : "border-border bg-card"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          isHigh ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
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
                                <p className="mt-1 font-mono text-[11px] text-red-600 bg-red-50/80 rounded px-2 py-1">
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
