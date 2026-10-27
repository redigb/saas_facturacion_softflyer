"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Plus,
} from "lucide-react";

import { createClient } from "@/app/plataforma/actions";
import type { Plan } from "@/app/plataforma/types";
import { formatDateTime } from "@/app/plataforma/ui";
import { type CreatedClient, welcomeMessage } from "@/app/plataforma/welcome-message";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isValidRuc, toSlug } from "@/lib/ruc";

export type NewClientDialogProps = {
  plans: Plan[];
  rootDomain: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
};

export function NewClientDialog({ plans, rootDomain, trigger, onSuccess }: NewClientDialogProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const [state, action, pending] = useActionState(createClient, {});
  const values = state.ok ? {} : (state.resultado ?? {});

  const [slug, setSlug] = useState(values.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [ruc, setRuc] = useState(values.ruc ?? "");
  const [selectedPlan, setSelectedPlan] = useState(values.plan ?? plans[0]?.codigo ?? "RESTAURANTE");
  const [selectedMonths, setSelectedMonths] = useState("1");
  const [copied, setCopied] = useState(false);

  const error = (field: string) => state.errores?.[field]?.[0];
  const isRucValid = ruc.length === 11 && isValidRuc(ruc);
  const isRucInvalid = ruc.length === 11 && !isValidRuc(ruc);

  // Reiniciar estado interno al cerrar el modal
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setCopied(false);
      if (state.ok) {
        router.refresh();
        onSuccess?.();
      }
    }
  };

  const handleCopyWelcome = async (created: CreatedClient) => {
    try {
      await navigator.clipboard.writeText(welcomeMessage(created, rootDomain));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Sin permiso de portapapeles: el enlace sigue visible para copiarlo a mano.
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button size="sm" className="gap-2 bg-[#0c5ea7] hover:bg-[#083f71] text-white font-semibold shadow-xs">
            <Plus className="size-4" />
            <span>Nuevo cliente</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-2xl sm:max-w-2xl">
        {state.ok && state.resultado ? (
          /* PANTALLA DE ÉXITO */
          <div className="p-6 sm:p-7">
            <div className="flex items-start gap-3.5">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  ¡Cliente Creado Exitosamente!
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enviamos a su correo un enlace para que cree su contraseña. Nadie del equipo la conoce; si no le llega, copia el mensaje y envíaselo por WhatsApp.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5 rounded-xl border border-border/70 bg-muted/40 p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border/40 pb-2.5">
                <span className="font-medium text-muted-foreground">Dirección web</span>
                <a
                  href={`http://${state.resultado.slug}.${rootDomain}/login`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-mono font-bold text-primary hover:underline"
                >
                  <span>http://{state.resultado.slug}.{rootDomain}/login</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1 border-b border-border/40 pb-2.5">
                <span className="font-medium text-muted-foreground">Correo de acceso</span>
                <span className="font-semibold text-foreground">{state.resultado.correo}</span>
              </div>

              <div className="space-y-1.5 pt-0.5">
                <span className="font-medium text-muted-foreground">
                  Enlace de activación · vence el {formatDateTime(String(state.resultado.expira_en))}
                </span>
                <p className="rounded-md border border-border/60 bg-card px-2.5 py-1.5 font-mono text-[11px] break-all text-foreground">
                  {state.resultado.enlace_activacion}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopyWelcome(state.resultado as CreatedClient)}
                className="w-full gap-2 border-border/80 font-semibold"
              >
                {copied ? (
                  <>
                    <Check className="size-4 text-emerald-600" />
                    <span className="text-emerald-600">¡Mensaje copiado al portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-4 text-muted-foreground" />
                    <span>Copiar mensaje de bienvenida</span>
                  </>
                )}
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleOpenChange(false)}
              >
                Cerrar
              </Button>
              <Button asChild size="sm" className="gap-1.5 bg-[#0c5ea7] hover:bg-[#083f71] text-white">
                <Link href={`/plataforma/clientes/${state.resultado.slug}`}>
                  <span>Ver ficha del cliente</span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          /* FORMULARIO LINEAL & COMPACTO */
          <form action={action}>
            <DialogHeader className="border-b border-border/60 p-5 pb-4 text-left">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0c5ea7]/10 text-[#0c5ea7] dark:bg-[#0c5ea7]/20 dark:text-[#18b4fa]">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-foreground">
                    Nuevo Cliente
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Alta directa para ventas cerradas: asigna plan de pago y credenciales de acceso iniciales.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="max-h-[75vh] space-y-4.5 overflow-y-auto p-5 text-xs">
              {state.mensaje && !state.errores && (
                <div
                  role="alert"
                  className="rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive"
                >
                  {state.mensaje}
                </div>
              )}

              {/* BLOQUE 1: DATOS DEL NEGOCIO */}
              <div className="space-y-3.5 rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2 font-bold tracking-wider text-muted-foreground uppercase text-xs">
                  <span className="flex size-4.5 items-center justify-center rounded-full bg-[#0c5ea7] text-[10px] font-extrabold text-white">
                    1
                  </span>
                  <span>Datos del Negocio</span>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-[13px] font-semibold text-foreground">
                        RUC <span className="text-destructive font-bold">*</span>
                      </label>
                      {isRucValid ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="size-3.5" /> Válido
                        </span>
                      ) : null}
                    </div>
                    <Input
                      name="ruc"
                      required
                      inputMode="numeric"
                      maxLength={11}
                      value={ruc}
                      onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))}
                      placeholder="10... o 20..."
                      className="h-10.5 font-mono text-sm"
                      hasError={Boolean(error("ruc")) || isRucInvalid}
                    />
                    {error("ruc") ? (
                      <p className="mt-1 text-xs text-destructive">{error("ruc")}</p>
                    ) : isRucInvalid ? (
                      <p className="mt-1 text-xs text-destructive">El RUC ingresado no es válido.</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
                      Razón Social <span className="text-destructive font-bold">*</span>
                    </label>
                    <Input
                      name="razon_social"
                      required
                      defaultValue={values.razon_social}
                      placeholder="Ej. Inversiones Gastronómicas S.A.C."
                      className="h-10.5 text-sm"
                      hasError={Boolean(error("razon_social"))}
                    />
                    {error("razon_social") && (
                      <p className="mt-1 text-xs text-destructive">{error("razon_social")}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
                      Nombre comercial del restaurante <span className="text-destructive font-bold">*</span>
                    </label>
                    <Input
                      name="nombre_comercial"
                      required
                      defaultValue={values.nombre_comercial}
                      onChange={(e) => !slugEdited && setSlug(toSlug(e.target.value))}
                      placeholder="Ej. El Buen Sabor"
                      className="h-10.5 text-sm"
                      hasError={Boolean(error("nombre_comercial"))}
                    />
                    {error("nombre_comercial") && (
                      <p className="mt-1 text-xs text-destructive">{error("nombre_comercial")}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
                      Dirección web <span className="text-destructive font-bold">*</span>
                    </label>
                    <div className="flex h-10.5 items-stretch overflow-hidden rounded-xl border border-input bg-card focus-within:ring-2 focus-within:ring-ring/40">
                      <input
                        name="slug"
                        required
                        value={slug}
                        onChange={(e) => {
                          setSlugEdited(true);
                          setSlug(toSlug(e.target.value));
                        }}
                        placeholder="elbuensabor"
                        className="w-full bg-transparent px-3 text-sm font-mono font-medium text-foreground outline-none placeholder:text-muted-foreground/60"
                      />
                      <span className="flex select-none items-center border-l border-border/70 bg-muted/60 px-3 text-xs font-medium text-muted-foreground">
                        .{rootDomain}
                      </span>
                    </div>
                    {error("slug") && (
                      <p className="mt-1 text-xs text-destructive">{error("slug")}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* BLOQUE 2: ACCESO DEL ADMINISTRADOR */}
              <div className="space-y-3.5 rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2 font-bold tracking-wider text-muted-foreground uppercase text-xs">
                  <span className="flex size-4.5 items-center justify-center rounded-full bg-[#0c5ea7] text-[10px] font-extrabold text-white">
                    2
                  </span>
                  <span>Acceso del Administrador</span>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
                      Nombre del contacto <span className="text-destructive font-bold">*</span>
                    </label>
                    <Input
                      name="nombre_contacto"
                      required
                      defaultValue={values.nombre_contacto}
                      placeholder="Ej. Carlos Mendoza"
                      className="h-10.5 text-sm"
                      hasError={Boolean(error("nombre_contacto"))}
                    />
                    {error("nombre_contacto") && (
                      <p className="mt-1 text-xs text-destructive">{error("nombre_contacto")}</p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
                      Correo de acceso <span className="text-destructive font-bold">*</span>
                    </label>
                    <Input
                      name="correo"
                      type="email"
                      required
                      defaultValue={values.correo}
                      placeholder="carlos@restaurante.pe"
                      className="h-10.5 text-sm"
                      hasError={Boolean(error("correo"))}
                    />
                    {error("correo") && (
                      <p className="mt-1 text-xs text-destructive">{error("correo")}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* BLOQUE 3: PLAN Y FACTURACIÓN */}
              <div className="space-y-3.5 rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2 font-bold tracking-wider text-muted-foreground uppercase text-xs">
                  <span className="flex size-4.5 items-center justify-center rounded-full bg-[#0c5ea7] text-[10px] font-extrabold text-white">
                    3
                  </span>
                  <span>Plan y Suscripción</span>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
                      Plan Asignado <span className="text-destructive font-bold">*</span>
                    </label>
                    <input type="hidden" name="plan" value={selectedPlan} />
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                      <SelectTrigger className="h-10.5 text-sm font-medium">
                        <SelectValue placeholder="Selecciona un plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.codigo} value={plan.codigo}>
                            {plan.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-foreground">
                      Periodo Pagado Inicial <span className="text-destructive font-bold">*</span>
                    </label>
                    <input type="hidden" name="meses" value={selectedMonths} />
                    <Select value={selectedMonths} onValueChange={setSelectedMonths}>
                      <SelectTrigger className="h-10.5 text-sm font-medium">
                        <SelectValue placeholder="Selecciona periodo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 mes</SelectItem>
                        <SelectItem value="3">3 meses</SelectItem>
                        <SelectItem value="6">6 meses</SelectItem>
                        <SelectItem value="12">12 meses (1 año)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-border/60 bg-muted/10 p-4 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleOpenChange(false)}
                disabled={pending}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={pending}
                className="min-h-[40px] px-5 text-xs font-bold bg-[#0c5ea7] hover:bg-[#083f71] text-white shadow-xs"
              >
                {pending ? "Creando cliente…" : "Crear cliente ↗"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
