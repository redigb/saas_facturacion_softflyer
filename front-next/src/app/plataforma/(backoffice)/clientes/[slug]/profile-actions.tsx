"use client";

import { useActionState, useState } from "react";
import { AlertCircle, Building2, Check, Copy, Pencil } from "lucide-react";

import { updateClientData, type FormState } from "@/app/plataforma/actions";
import type { ClientDetail } from "@/app/plataforma/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";

/**
 * Gestión de datos de la empresa (RUC, razón social, nombre comercial, dirección fiscal).
 * Ofrece visualización ejecutiva en tarjeta y edición enfocada mediante Shadcn Dialog con Labels.
 */
export function ProfileActions({ client }: { client: ClientDetail }) {
  const [open, setOpen] = useState(false);
  const [copiedRuc, setCopiedRuc] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: FormState, formData: FormData) => {
    const res = await updateClientData(client.slug, prev, formData);
    if (res.ok) {
      toast.success(res.mensaje || "Datos de la empresa guardados correctamente.");
      setTimeout(() => setOpen(false), 900);
    } else {
      toast.error(res.mensaje || "No se pudieron actualizar los datos.");
    }
    return res;
  }, {} as FormState);

  const copyRuc = async () => {
    if (!client.ruc) return;
    try {
      await navigator.clipboard.writeText(client.ruc);
      setCopiedRuc(true);
      toast.info("RUC copiado al portapapeles.");
      setTimeout(() => setCopiedRuc(false), 2000);
    } catch {
      // Ignorar fallo de portapapeles
    }
  };

  return (
    <Card id="empresa" className="scroll-mt-20 border-border bg-card shadow-xs">
      <CardContent className="space-y-4 px-5 py-5">
        <h2 className="text-base font-bold text-foreground">Datos de la empresa</h2>

        {/* El nombre comercial ya es el título de la ficha: aquí van solo los datos fiscales. */}
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-[13px] text-muted-foreground">RUC</dt>
            <dd className="flex items-center justify-between gap-2">
              <span className={client.ruc ? "font-mono text-base font-bold tabular-nums text-foreground" : "font-semibold text-destructive"}>
                {client.ruc || "Falta registrarlo"}
              </span>
              {client.ruc ? (
                <Button type="button" variant="ghost" size="sm" onClick={copyRuc} className="min-h-0 h-8 px-2 text-[13px] text-muted-foreground">
                  {copiedRuc ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Check className="size-3.5" /> Copiado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Copy className="size-3.5" /> Copiar
                    </span>
                  )}
                </Button>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted-foreground">Razón social</dt>
            <dd className={client.razon_social ? "font-semibold text-foreground" : "font-semibold text-destructive"}>
              {client.razon_social || "Falta registrarla"}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted-foreground">Dirección fiscal</dt>
            <dd className="leading-relaxed text-foreground">{client.direccion_fiscal || "Sin registrar"}</dd>
          </div>
        </dl>

        {/* Modal Dialog de Shadcn para edición */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full gap-2 font-semibold">
              <Pencil className="size-4" />
              Editar datos
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Building2 className="size-5 text-primary" />
                Corregir datos de la empresa
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Actualiza los datos fiscales y la razón social registrada.
              </DialogDescription>
            </DialogHeader>

            <form action={formAction} className="space-y-4">
              {/* Alerta de advertencia SUNAT */}
              <div className="flex gap-2.5 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-foreground">
                <AlertCircle className="size-4 shrink-0 text-warning mt-0.5" />
                <p className="leading-snug">
                  El RUC solo se puede cambiar mientras no haya emitido comprobantes reales; al cambiarlo se retira la homologación ante SUNAT.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-ruc" className="text-xs font-bold">
                  RUC <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-ruc"
                  name="ruc"
                  required
                  inputMode="numeric"
                  maxLength={11}
                  defaultValue={client.ruc ?? ""}
                  placeholder="Ej. 20489689961"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-razon" className="text-xs font-bold">
                  Razón social <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-razon"
                  name="razon_social"
                  required
                  maxLength={255}
                  defaultValue={client.razon_social ?? ""}
                  placeholder="Ej. RESTAURANTE 123 S.A.C."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-nombre" className="text-xs font-bold">
                  Nombre comercial / Marca <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-nombre"
                  name="nombre_comercial"
                  required
                  maxLength={120}
                  defaultValue={client.nombre}
                  placeholder="Ej. Restaurante Demo"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit-direccion" className="text-xs font-bold">
                    Dirección fiscal
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Opcional</span>
                </div>
                <Input
                  id="edit-direccion"
                  name="direccion_fiscal"
                  maxLength={255}
                  defaultValue={client.direccion_fiscal ?? ""}
                  placeholder="Ej. Av. Javier Prado 1234, San Isidro"
                />
              </div>

              {state.mensaje ? (
                <div
                  role="status"
                  className={`rounded-lg p-2.5 text-xs font-semibold ${
                    state.ok
                      ? "border border-success/30 bg-success/10 text-success"
                      : "border border-destructive/30 bg-destructive/10 text-destructive"
                  }`}
                >
                  {state.mensaje}
                </div>
              ) : null}

              <DialogFooter className="mt-4 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancelar
                </Button>
                <Button type="submit" isLoading={pending}>
                  {pending ? "Guardando…" : "Guardar cambios"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
