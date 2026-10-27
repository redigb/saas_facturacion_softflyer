"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Copy, UserPlus } from "lucide-react";

import { createClient } from "@/app/plataforma/actions";
import type { Plan } from "@/app/plataforma/types";
import { formatDateTime } from "@/app/plataforma/ui";
import { type CreatedClient, welcomeMessage } from "@/app/plataforma/welcome-message";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isValidRuc, toSlug } from "@/lib/ruc";

export function NewClientForm({ plans, rootDomain }: { plans: Plan[]; rootDomain: string }) {
  const [state, action, pending] = useActionState(createClient, {});
  const values = state.ok ? {} : (state.resultado ?? {});
  const [slug, setSlug] = useState(values.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [ruc, setRuc] = useState(values.ruc ?? "");
  const error = (field: string) => state.errores?.[field]?.[0];
  const [copied, setCopied] = useState(false);

  const copyWelcome = async (created: CreatedClient) => {
    try {
      await navigator.clipboard.writeText(welcomeMessage(created, rootDomain));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Sin permiso de portapapeles: el enlace sigue visible para copiarlo a mano.
    }
  };

  if (state.ok && state.resultado) {
    const created = state.resultado as CreatedClient;

    return (
      <Card className="mt-6 max-w-2xl border-success/40 bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-6 w-6" />
            <CardTitle className="text-xl text-success">Cliente Creado Exitosamente</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            Enviamos a su correo un enlace para que cree su contraseña. Nadie del equipo la conoce; si no le llega,
            copia el mensaje de bienvenida y envíaselo por WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <Row label="Dirección web" value={`http://${created.slug}.${rootDomain}/login`} />
            <Row label="Correo de acceso" value={created.correo} />
            <Row label={`Enlace de activación · vence el ${formatDateTime(created.expira_en)}`} value={created.enlace_activacion} mono />
          </dl>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" className="gap-2" onClick={() => copyWelcome(created)}>
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? "Mensaje copiado" : "Copiar mensaje de bienvenida"}</span>
            </Button>
            <Button asChild className="gap-2">
              <Link href={`/plataforma/clientes/${created.slug}`}>
                <span>Ver ficha del cliente</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/plataforma/clientes">Volver a clientes</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 max-w-3xl border-border bg-card shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary">
          <UserPlus className="h-5 w-5" />
          <CardTitle>Datos del Nuevo Cliente</CardTitle>
        </div>
        <CardDescription>
          Completa los datos fiscales, subdominio y primer usuario administrador del restaurante.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-6">
          {state.mensaje && !state.errores && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-foreground"
            >
              {state.mensaje}
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="RUC"
              error={error("ruc") ?? (ruc.length === 11 && !isValidRuc(ruc) ? "El RUC no es válido." : undefined)}
            >
              <Input
                name="ruc"
                required
                inputMode="numeric"
                maxLength={11}
                value={ruc}
                onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))}
                placeholder="10... o 20..."
                className="font-mono text-sm"
                hasError={Boolean(error("ruc"))}
              />
            </Field>

            <Field label="Razón social" error={error("razon_social")}>
              <Input
                name="razon_social"
                required
                defaultValue={values.razon_social}
                placeholder="Ej. Inversiones Gastronómicas S.A.C."
                className="text-sm"
                hasError={Boolean(error("razon_social"))}
              />
            </Field>

            <Field label="Nombre comercial del restaurante" error={error("nombre_comercial")}>
              <Input
                name="nombre_comercial"
                required
                defaultValue={values.nombre_comercial}
                onChange={(e) => !slugEdited && setSlug(toSlug(e.target.value))}
                placeholder="Ej. El Buen Sabor"
                className="text-sm"
                hasError={Boolean(error("nombre_comercial"))}
              />
            </Field>

            <Field label={`Dirección web (.${rootDomain})`} error={error("slug")}>
              <div className="flex items-center gap-2">
                <Input
                  name="slug"
                  required
                  value={slug}
                  onChange={(e) => {
                    setSlugEdited(true);
                    setSlug(toSlug(e.target.value));
                  }}
                  placeholder="elbuensabor"
                  className="font-mono text-sm"
                  hasError={Boolean(error("slug"))}
                />
              </div>
            </Field>

            <Field label="Nombre del administrador" error={error("nombre_contacto")}>
              <Input
                name="nombre_contacto"
                required
                defaultValue={values.nombre_contacto}
                placeholder="Ej. Carlos Mendoza"
                className="text-sm"
                hasError={Boolean(error("nombre_contacto"))}
              />
            </Field>

            <Field label="Correo del administrador" error={error("correo")}>
              <Input
                name="correo"
                type="email"
                required
                defaultValue={values.correo}
                placeholder="carlos@restaurante.pe"
                className="text-sm"
                hasError={Boolean(error("correo"))}
              />
            </Field>

            <Field label="Plan asignado" error={error("plan")}>
              <select
                name="plan"
                required
                defaultValue={values.plan}
                className="flex min-h-[44px] w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm font-medium text-foreground transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
              >
                {plans.map((plan) => (
                  <option key={plan.codigo} value={plan.codigo} className="bg-card text-foreground">
                    {plan.nombre}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Periodo pagado inicial" error={error("meses")}>
              <select
                name="meses"
                defaultValue="1"
                className="flex min-h-[44px] w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm font-medium text-foreground transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
              >
                {[1, 3, 6, 12].map((m) => (
                  <option key={m} value={m} className="bg-card text-foreground">
                    {m} {m === 1 ? "mes" : "meses"}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="pt-2">
            <Button type="submit" isLoading={pending} className="min-h-[48px] px-6 text-sm font-bold">
              {pending ? "Creando cliente…" : "Crear cliente"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold tracking-wide text-foreground uppercase">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-xs font-medium text-destructive">{error}</span>}
    </label>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-sm font-semibold text-foreground ${mono ? "font-mono text-xs font-bold break-all text-primary" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
