import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BillingActions } from "@/app/plataforma/(backoffice)/clientes/[slug]/billing-actions";
import { ClientTabs } from "@/app/plataforma/(backoffice)/clientes/[slug]/client-tabs";
import { CLIENT_TABS, type ClientTab } from "@/app/plataforma/(backoffice)/clientes/[slug]/tabs";
import { ProfileActions } from "@/app/plataforma/(backoffice)/clientes/[slug]/profile-actions";
import { ResetAccessButton } from "@/app/plataforma/(backoffice)/clientes/[slug]/reset-access-button";
import { SubscriptionActions } from "@/app/plataforma/(backoffice)/clientes/[slug]/subscription-actions";
import type { ClientDetail, Plan } from "@/app/plataforma/types";
import { ACTION_LABELS, ClientStatus, formatDate, formatDateTime } from "@/app/plataforma/ui";
import { DefinitionItem } from "@/components/backoffice/molecules/definition-item";
import { OnboardingChecklist, type OnboardingStep } from "@/components/backoffice/organisms/onboarding-checklist";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiFetch } from "@/lib/api";
import { tenantUrl } from "@/lib/tenant";

export default async function ClientPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);
  const [result, plans] = await Promise.all([
    apiFetch<ClientDetail>(`plataforma/clientes/${encodeURIComponent(slug)}`),
    apiFetch<Plan[]>("plataforma/planes"),
  ]);

  if (!result.ok) {
    if (result.status === 404) {
      notFound();
    }
    return <p className="text-destructive">{result.error.mensaje}</p>;
  }

  const c = result.data;
  const baseHref = `/plataforma/clientes/${c.slug}`;
  const active = CLIENT_TABS.find((item) => item.value === tab)?.value ?? "resumen";

  const panels: Record<ClientTab, React.ReactNode> = {
    resumen: (
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <OnboardingChecklist steps={onboardingSteps(c)} baseHref={baseHref} />
          <ClientData client={c} />
        </div>
        <ProfileActions client={c} />
      </div>
    ),
    facturacion: (
      <div className="space-y-6">
        <FiscalStatus client={c} />
        <BillingActions client={c} />
      </div>
    ),
    suscripcion: (
      <div className="space-y-6">
        <SubscriptionHistory client={c} />
        <SubscriptionActions client={c} plans={plans.ok ? plans.data : []} />
      </div>
    ),
    usuarios: <Users client={c} />,
    bitacora: <ActivityLog client={c} />,
  };

  return (
    <>
      <Link href="/plataforma/clientes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" />
        Clientes
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{c.nombre}</h1>
        <ClientStatus client={c} />
      </div>
      <a href={tenantUrl(c.slug, "/login")} target="_blank" rel="noreferrer" className="mt-1 mb-6 inline-block text-sm text-muted-foreground hover:text-primary">
        {tenantUrl(c.slug, "")} ↗
      </a>

      <ClientTabs active={active} baseHref={baseHref} panels={panels} />
    </>
  );
}

/** Pasos para emitir en producción, calculados con lo que el backoffice ya sabe del cliente. */
function onboardingSteps(c: ClientDetail): OnboardingStep[] {
  const { fiscal } = c;
  const certificate = fiscal.certificado;

  return [
    { label: "Datos de la empresa", hint: c.ruc && c.razon_social ? `${c.razon_social} · RUC ${c.ruc}` : "Falta el RUC o la razón social.", done: Boolean(c.ruc && c.razon_social), tab: "resumen" },
    {
      label: "Certificado digital",
      hint: !certificate ? "Aún no se carga." : certificate.vigente ? `Vence el ${formatDate(certificate.vence_en)}.` : "Está vencido: carga uno nuevo.",
      done: Boolean(certificate?.vigente),
      tab: "facturacion",
    },
    { label: "Usuario y clave SOL", hint: fiscal.usuario_sol && fiscal.tiene_clave_sol ? `Usuario ${fiscal.usuario_sol}.` : "Faltan el usuario secundario o su clave.", done: Boolean(fiscal.usuario_sol && fiscal.tiene_clave_sol), tab: "facturacion" },
    { label: "Tasa de IGV", hint: fiscal.tasa_igv ? `${fiscal.tasa_igv.nombre} · ${fiscal.tasa_igv.tasa}%.` : "Sin tasa elegida: rige el 18 %.", done: Boolean(fiscal.tasa_igv), tab: "facturacion" },
    { label: "Homologación en SUNAT", hint: fiscal.homologado ? "Completa: puede emitir en producción." : "Márcala cuando el cliente complete el proceso en SUNAT.", done: fiscal.homologado, tab: "facturacion" },
  ];
}

function ClientData({ client: c }: { client: ClientDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos del cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <DefinitionItem label="RUC" value={c.ruc} mono />
          <DefinitionItem label="Razón social" value={c.razon_social} />
          <DefinitionItem label="Dirección fiscal" value={c.direccion_fiscal} />
          <DefinitionItem label="Contacto" value={c.contacto.nombre} />
          <DefinitionItem label="Correo" value={c.contacto.correo} />
          <DefinitionItem label="Celular" value={c.contacto.telefono} />
          <DefinitionItem label="Origen" value={c.origen === "PRUEBA_WEB" ? "Prueba gratis desde la web" : "Alta manual (ventas)"} />
          <DefinitionItem label="Registrado" value={formatDate(c.creado_en)} />
          <DefinitionItem label="Uso" value={`${c.usuarios} usuarios · ${c.conteos.mesas} mesas · ${c.conteos.productos} productos`} />
        </dl>
      </CardContent>
    </Card>
  );
}

function FiscalStatus({ client: c }: { client: ClientDetail }) {
  const { fiscal } = c;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Estado de la facturación</CardTitle>
          <Badge variant={fiscal.listo_para_emitir ? "success" : "warning"}>{fiscal.listo_para_emitir ? "Lista para emitir" : "Falta configurar"}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <DefinitionItem label="Entorno" value={fiscal.entorno === "PRODUCCION" ? "Producción" : "Pruebas (beta)"} />
          <DefinitionItem
            label="Certificado"
            value={fiscal.certificado ? `${fiscal.certificado.titular ?? "Cargado"} · ${fiscal.certificado.vigente ? `vence ${formatDate(fiscal.certificado.vence_en)}` : "vencido"}` : null}
          />
          <DefinitionItem label="Usuario SOL" value={fiscal.usuario_sol ? `${fiscal.usuario_sol}${fiscal.tiene_clave_sol ? " · clave guardada" : " · sin clave"}` : null} />
          <DefinitionItem label="Tasa de IGV" value={fiscal.tasa_igv ? `${fiscal.tasa_igv.nombre} · ${fiscal.tasa_igv.tasa}%` : null} />
          <DefinitionItem label="Homologado en SUNAT" value={fiscal.homologado ? "Sí" : "No"} />
        </dl>
      </CardContent>
    </Card>
  );
}

function SubscriptionHistory({ client: c }: { client: ClientDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de suscripciones</CardTitle>
        <CardDescription>El periodo vigente va primero.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>Hasta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {c.suscripciones.map((s, i) => (
              <TableRow key={i}>
                <TableCell className="font-semibold">
                  {s.plan}
                  {i === 0 ? <Badge variant="info" className="ml-2">Vigente</Badge> : null}
                </TableCell>
                <TableCell>{s.estado}</TableCell>
                <TableCell>{formatDate(s.fecha_inicio)}</TableCell>
                <TableCell>{formatDate(s.fecha_vencimiento)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Users({ client: c }: { client: ClientDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuarios del cliente</CardTitle>
        <CardDescription>
          {c.usuarios_detalle.length} {c.usuarios_detalle.length === 1 ? "usuario" : "usuarios"} con acceso a su cuenta. Si alguien olvidó su contraseña, envíale un enlace: nadie del equipo la llega a ver.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acceso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {c.usuarios_detalle.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-semibold">{user.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{user.correo}</TableCell>
                <TableCell>
                  <Badge variant={user.es_activo ? "success" : "neutral"}>{user.es_activo ? "Activo" : "Inactivo"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {user.es_activo && c.estado !== "CANCELADO" ? <ResetAccessButton slug={c.slug} user={user} /> : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ActivityLog({ client: c }: { client: ClientDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bitácora</CardTitle>
        <CardDescription>Todo lo que el equipo hizo sobre este cliente.</CardDescription>
      </CardHeader>
      <CardContent>
        {c.bitacora.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin acciones del equipo sobre este cliente.</p>
        ) : (
          <ol className="space-y-4">
            {c.bitacora.map((entry, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="font-semibold text-foreground">
                    {ACTION_LABELS[entry.accion] ?? entry.accion}
                    <span className="font-normal text-muted-foreground"> · {entry.administrador} · {formatDateTime(entry.creado_en)}</span>
                  </p>
                  <p className="text-muted-foreground">{Object.entries(entry.detalle).map(([key, value]) => `${key}: ${value}`).join(" · ")}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
