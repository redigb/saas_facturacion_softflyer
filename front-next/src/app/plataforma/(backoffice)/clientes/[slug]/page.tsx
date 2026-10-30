import { Armchair, Store, UtensilsCrossed, Users as UsersIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { BillingActions } from "@/app/plataforma/(backoffice)/clientes/[slug]/billing-actions";
import { ClientHeader } from "@/app/plataforma/(backoffice)/clientes/[slug]/client-header";
import { ClientTabs } from "@/app/plataforma/(backoffice)/clientes/[slug]/client-tabs";
import { CLIENT_TABS, LEGACY_TABS, type ClientTab } from "@/app/plataforma/(backoffice)/clientes/[slug]/tabs";
import { ProfileActions } from "@/app/plataforma/(backoffice)/clientes/[slug]/profile-actions";
import { ResetAccessButton } from "@/app/plataforma/(backoffice)/clientes/[slug]/reset-access-button";
import { AccessActions, PlanActions } from "@/app/plataforma/(backoffice)/clientes/[slug]/subscription-actions";
import type { ClientDetail, Plan } from "@/app/plataforma/types";
import { ACTION_LABELS, formatDate, formatDateTime } from "@/app/plataforma/ui";
import { PlanTimeline } from "@/app/plataforma/(backoffice)/clientes/[slug]/plan-timeline";
import { ErrorState } from "@/components/backoffice/organisms/error-state";
import { OnboardingChecklist, type OnboardingStep } from "@/components/backoffice/organisms/onboarding-checklist";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { tenantUrl } from "@/lib/tenant";

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ slug }, { tab }] = await Promise.all([params, searchParams]);
  const [result, plans] = await Promise.all([
    apiFetch<ClientDetail>(`plataforma/clientes/${encodeURIComponent(slug)}`),
    apiFetch<Plan[]>("plataforma/planes"),
  ]);

  if (!result.ok) {
    if (result.status === 404) {
      notFound();
    }
    return (
      <ErrorState
        title="No pudimos abrir la ficha del cliente"
        description={`${result.error.mensaje} Vuelve a la lista e inténtalo otra vez en unos segundos.`}
        backHref="/plataforma/clientes"
        backLabel="Volver a Clientes"
      />
    );
  }

  const c = result.data;
  const baseHref = `/plataforma/clientes/${c.slug}`;
  const active = CLIENT_TABS.find((item) => item.value === (LEGACY_TABS[tab ?? ""] ?? tab))?.value ?? "cuenta";
  const steps = onboardingSteps(c);

  const panels: Record<ClientTab, React.ReactNode> = {
    cuenta: (
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <OnboardingChecklist steps={steps} baseHref={baseHref} />
          <PlanCard client={c} plans={plans.ok ? plans.data : []} />
        </div>
        <div className="space-y-6">
          <ProfileActions client={c} />
          <ContactCard client={c} />
          <AccessActions client={c} />
        </div>
      </div>
    ),
    facturacion: <BillingActions client={c} />,
    usuarios: <Users client={c} />,
    bitacora: <ActivityLog client={c} />,
  };

  return (
    <div className="space-y-6">
      {/* Cabecera Ejecutiva del Cliente */}
      <ClientHeader
        client={c}
        fullUrl={tenantUrl(c.slug, "")}
        loginUrl={tenantUrl(c.slug, "/login")}
      />

      {/* Pestañas de la Ficha */}
      <ClientTabs active={active} baseHref={baseHref} panels={panels} />
    </div>
  );
}

/** Pasos para emitir en producción, calculados con lo que el backoffice ya sabe del cliente. */
function onboardingSteps(c: ClientDetail): OnboardingStep[] {
  const { fiscal } = c;
  const certificate = fiscal.certificado;

  return [
    {
      label: "Datos de la empresa",
      hint: c.ruc && c.razon_social ? `${c.razon_social} · RUC ${c.ruc}` : "Falta el RUC o la razón social.",
      done: Boolean(c.ruc && c.razon_social),
      tab: "cuenta",
      anchor: "empresa",
    },
    {
      label: "Certificado digital",
      hint: !certificate
        ? "Aún no se carga el archivo (.pfx / .pem)."
        : certificate.vigente
          ? `Vence el ${formatDate(certificate.vence_en)}.`
          : "Está vencido: carga uno nuevo.",
      done: Boolean(certificate?.vigente),
      tab: "facturacion",
    },
    {
      label: "Usuario y clave SOL",
      hint: fiscal.usuario_sol && fiscal.tiene_clave_sol
        ? `Usuario ${fiscal.usuario_sol}.`
        : "Faltan el usuario secundario o su clave.",
      done: Boolean(fiscal.usuario_sol && fiscal.tiene_clave_sol),
      tab: "facturacion",
    },
    {
      label: "Tasa de IGV",
      hint: fiscal.tasa_igv
        ? `${fiscal.tasa_igv.nombre} · ${fiscal.tasa_igv.tasa}%.`
        : "Sin tasa elegida: rige el 18 %.",
      // Con una sola tasa en el catálogo no hay nada que elegir: el paso ya está cumplido.
      done: Boolean(fiscal.tasa_igv) || c.tasas_igv.length <= 1,
      tab: "facturacion",
    },
    {
      label: "Homologación en SUNAT",
      hint: fiscal.homologado
        ? "Completa: puede emitir en producción."
        : "Márcala cuando el cliente complete el proceso en SUNAT.",
      done: fiscal.homologado,
      tab: "facturacion",
    },
  ];
}

/**
 * Todo lo comercial del cliente en una tarjeta: el periodo vigente, cuánto usa la plataforma, lo que se puede hacer
 * con el plan (activar, renovar, extender) y los periodos anteriores. El estado y el alta ya están en la cabecera.
 */
function PlanCard({ client: c, plans }: { client: ClientDetail; plans: Plan[] }) {
  const [current, ...previous] = c.suscripciones;
  const periodEnd = c.modo === "PRUEBA" ? (c.prueba?.vence_en ?? current?.fecha_vencimiento) : current?.fecha_vencimiento;
  const usage = [
    { label: c.conteos.sucursales === 1 ? "Local" : "Locales", value: c.conteos.sucursales, icon: Store, warn: false },
    { label: "Mesas", value: c.conteos.mesas, icon: Armchair, warn: false },
    // Una carta vacía es lo que más frena al cliente: se marca en amarillo.
    { label: "Platos en carta", value: c.conteos.productos, icon: UtensilsCrossed, warn: c.conteos.productos === 0 },
    { label: c.usuarios === 1 ? "Usuario" : "Usuarios", value: c.usuarios, icon: UsersIcon, warn: false },
  ];

  return (
    <Card className="border-border bg-card shadow-xs">
      <div className="space-y-4 px-5 pb-5 pt-6 sm:px-6">
        <div className="space-y-1">
          <h2 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-lg font-semibold text-foreground">
            {current?.plan ?? c.plan ?? "Sin plan"}
            <StatePill client={c} state={current?.estado} />
          </h2>
          <p className="text-sm text-muted-foreground">{c.origen === "PRUEBA_WEB" ? "Llegó por la prueba gratis de la web." : "Lo dio de alta el equipo de ventas."}</p>
        </div>
        {periodEnd && current ? (
          <PlanTimeline start={current.fecha_inicio} end={periodEnd} label={c.modo === "PRUEBA" ? "La prueba termina" : "Vence"} />
        ) : (
          <p className="text-sm text-muted-foreground">{planTerm(c)}</p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/70 px-5 py-4 sm:grid-cols-4 sm:px-6">
        {usage.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span
              aria-hidden
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                item.warn ? "bg-warning/25 text-foreground" : "bg-primary/10 text-primary",
              )}
            >
              <item.icon className="size-5" />
            </span>
            <div className="flex flex-col-reverse">
              <dt className="text-[13px] font-medium text-foreground/70">{item.label}</dt>
              <dd className="text-xl font-semibold leading-tight tabular-nums text-foreground">{item.value}</dd>
            </div>
          </div>
        ))}
      </dl>

      <PlanActions client={c} plans={plans} currentEnd={periodEnd} />

      {previous.length > 0 ? (
        <div className="border-t border-border/70 px-5 py-5 sm:px-6">
          <h3 className="text-sm font-semibold text-foreground">Periodos anteriores</h3>
          <ol className="mt-2 divide-y divide-border/70">
            {previous.map((s, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5 text-sm">
                <span className="font-medium text-foreground">
                  {s.plan} <span className="font-normal text-muted-foreground">· {SUBSCRIPTION_STATES[s.estado] ?? s.estado}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {formatDate(s.fecha_inicio)} – {formatDate(s.fecha_vencimiento)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </Card>
  );
}

/** Estado de la suscripción como etiqueta: azul si el cliente opera, amarillo si hay que actuar, rojo si está bloqueado. */
function StatePill({ client: c, state }: { client: ClientDetail; state?: string }) {
  const label = c.modo === "PRUEBA" ? "Prueba gratis" : (SUBSCRIPTION_STATES[state ?? ""] ?? "");
  if (!label) {
    return null;
  }
  const tone =
    state === "MOROSA" || (c.modo === "PRUEBA" && c.prueba?.vencida)
      ? "bg-warning/25 text-foreground"
      : state === "SUSPENDIDA" || state === "CANCELADA"
        ? "bg-destructive/10 text-destructive"
        : "bg-primary/10 text-primary";

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", tone)}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function planTerm(c: ClientDetail): string {
  if (c.modo === "PRUEBA") {
    if (!c.prueba || c.prueba.vencida) {
      return "La prueba gratis ya venció.";
    }
    return c.prueba.dias_restantes === 0 ? "La prueba gratis vence hoy." : `Prueba gratis: le quedan ${c.prueba.dias_restantes} días.`;
  }

  return c.suscripcion ? `Suscripción hasta el ${formatDate(c.suscripcion.fecha_vencimiento)}.` : "Suscripción activa.";
}

function ContactCard({ client: c }: { client: ClientDetail }) {
  const { nombre, correo, telefono } = c.contacto;

  return (
    <Card className="border-border bg-card shadow-xs">
      <div className="space-y-3 px-5 py-5">
        <h2 className="text-base font-bold text-foreground">Contacto</h2>
        {nombre || correo || telefono ? (
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-foreground">{nombre || "Sin nombre registrado"}</p>
            {correo ? (
              <a href={`mailto:${correo}`} className="block break-all text-primary hover:underline">
                {correo}
              </a>
            ) : null}
            {telefono ? (
              <a href={`tel:${telefono.replace(/\s+/g, "")}`} className="block tabular-nums text-primary hover:underline">
                {telefono}
              </a>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">El cliente no registró un contacto.</p>
        )}
      </div>
    </Card>
  );
}

const SUBSCRIPTION_STATES: Record<string, string> = {
  PRUEBA: "Prueba",
  ACTIVA: "Activa",
  MOROSA: "Con deuda",
  SUSPENDIDA: "Suspendida",
  CANCELADA: "Cancelada",
};

function Users({ client: c }: { client: ClientDetail }) {
  const canReset = c.estado !== "CANCELADO";

  return (
    <Card className="border-border bg-card shadow-xs">
      <div className="space-y-1 px-5 pb-4 pt-6 sm:px-6">
        <h2 className="text-lg font-bold text-foreground">
          {c.usuarios_detalle.length} {c.usuarios_detalle.length === 1 ? "usuario" : "usuarios"} con acceso
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Si alguien olvidó su contraseña, envíale un enlace para que cree una nueva. Nadie del equipo llega a verla.
        </p>
      </div>
      <div className="border-t border-border/70 px-2 pb-2 sm:px-4">
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
                <TableCell className="font-semibold text-foreground">{user.nombre}</TableCell>
                <TableCell className="text-muted-foreground">{user.correo}</TableCell>
                <TableCell className={user.es_activo ? "text-foreground" : "text-muted-foreground"}>{user.es_activo ? "Activo" : "Inactivo"}</TableCell>
                <TableCell className="text-right">{user.es_activo && canReset ? <ResetAccessButton slug={c.slug} user={user} /> : null}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

const DETAIL_LABELS: Record<string, string> = {
  exonerado_amazonia: "Exonerado de IGV (Amazonía)",
  leyenda: "Leyenda",
  sucursal: "Local",
  motivo: "Motivo",
  dias: "Días",
  plan: "Plan",
  meses: "Meses",
};

/** "tasa_igv_id" → "Tasa igv id"; los valores no escalares se muestran como JSON compacto. */
function detailEntries(detail: Record<string, unknown>): { key: string; value: string }[] {
  return Object.entries(detail)
    .filter(([, value]) => value !== null && value !== "")
    .map(([key, value]) => ({
      key: DETAIL_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1).replaceAll("_", " "),
      value: typeof value === "boolean" ? (value ? "Sí" : "No") : typeof value === "object" ? JSON.stringify(value) : String(value),
    }));
}

function ActivityLog({ client: c }: { client: ClientDetail }) {
  return (
    <Card className="border-border bg-card shadow-xs">
      <div className="space-y-1 px-5 pb-4 pt-6 sm:px-6">
        <h2 className="text-lg font-bold text-foreground">Bitácora</h2>
        <p className="text-[15px] font-medium text-foreground/70">Lo que hizo el equipo de plataforma con este cliente, lo más reciente primero.</p>
      </div>
      {c.bitacora.length === 0 ? (
        <p className="border-t border-border/70 px-5 py-5 text-[15px] font-medium text-foreground/70 sm:px-6">El equipo aún no hizo cambios en este cliente.</p>
      ) : (
        <ol className="border-t border-border/70 px-5 py-5 sm:px-6">
          {c.bitacora.map((entry, i) => {
            const details = detailEntries(entry.detalle);

            return (
              <li key={i} className="relative grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-4 pb-5 last:pb-0">
                {i < c.bitacora.length - 1 ? <span aria-hidden className="absolute left-[0.3125rem] top-4 bottom-0 w-0.5 bg-border" /> : null}
                <span aria-hidden className="relative mt-1.5 size-3 rounded-full border-2 border-primary bg-card" />
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-base font-bold text-foreground">{ACTION_LABELS[entry.accion] ?? entry.accion}</span>
                    <time dateTime={entry.creado_en} className="text-sm font-medium tabular-nums text-foreground/70">
                      {formatDateTime(entry.creado_en)}
                    </time>
                  </p>
                  <p className="text-sm font-medium text-foreground/70">Por {entry.administrador}</p>
                  {details.length > 0 ? (
                    <dl className="mt-1.5 grid gap-x-4 gap-y-1.5 rounded-lg bg-muted/50 px-4 py-3 text-[15px] sm:grid-cols-[11rem_minmax(0,1fr)]">
                      {details.map((d) => (
                        <div key={d.key} className="contents">
                          <dt className="font-medium text-foreground/70">{d.key}</dt>
                          <dd className="break-words font-semibold text-foreground">{d.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
