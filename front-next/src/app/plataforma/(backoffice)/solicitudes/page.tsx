import { CalendarDays, MailCheck } from "lucide-react";
import { ResendButton } from "@/app/plataforma/(backoffice)/solicitudes/resend-button";
import type { PendingRegistration } from "@/app/plataforma/types";
import { formatDateTime } from "@/app/plataforma/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api";

export default async function RegistrationsPage() {
  const result = await apiFetch<PendingRegistration[]>("plataforma/solicitudes");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Solicitudes de Prueba</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Personas que completaron el registro pero todavía no confirmaron su correo electrónico.
          Son prospectos de alto interés para contacto directo.
        </p>
      </div>

      {!result.ok ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-bold">Error al cargar solicitudes</p>
          <p className="mt-1 text-sm">{result.error.mensaje}</p>
        </div>
      ) : result.data.length === 0 ? (
        <Card className="border-border p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <MailCheck className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">Sin solicitudes pendientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">No hay registros pendientes de confirmación.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden border-border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[35%]">Restaurante</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Fecha Solicitud</TableHead>
                <TableHead>Enlace</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-bold text-foreground">{r.nombre_comercial}</p>
                    <p className="text-xs text-muted-foreground/70">
                      {r.razon_social} · <span className="font-mono">RUC {r.ruc}</span>
                    </p>
                  </TableCell>
                  <TableCell className="text-foreground/70">
                    <p className="font-semibold text-sm">{r.nombre_contacto}</p>
                    <p className="text-xs text-muted-foreground/70">
                      {r.correo}
                      {r.telefono && ` · ${r.telefono}`}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDateTime(r.creado_en)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.enlace_vigente ? "info" : "neutral"} className="font-bold">
                      {r.enlace_vigente ? "Vigente" : "Vencido"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ResendButton id={r.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
