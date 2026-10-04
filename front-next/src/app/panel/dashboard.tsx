import Image from "next/image";

import { Icon, type IconName } from "@/components/icons";
import restaurante from "../../../public/login-restaurante.jpg";

export type DashboardSummary = {
  empresa: {
    nombre_comercial: string;
    razon_social: string | null;
    ruc: string | null;
    homologado: boolean;
  } | null;
  suscripcion: {
    plan: string;
    estado: "PRUEBA" | "ACTIVA" | "MOROSA" | "SUSPENDIDA" | "CANCELADA";
    fecha_vencimiento: string;
    dias_restantes: number;
  } | null;
  conteos: Record<
    "sucursales" | "salones" | "mesas" | "asientos" | "categorias" | "productos" | "estaciones" | "usuarios" | "series" | "certificados",
    number
  >;
  configuracion: { clave: string; titulo: string; descripcion: string; completo: boolean }[];
};

const STEP_ICONS: Record<string, IconName> = {
  datos_fiscales: "facturacion",
  plano: "plano",
  carta: "carta",
  series: "facturacion",
  certificado: "configuracion",
  equipo: "equipo",
  sunat: "rayo",
};

const SUBSCRIPTION_LABELS: Record<string, { label: string; className: string }> = {
  PRUEBA: { label: "En prueba", className: "bg-celeste/15 text-azul" },
  ACTIVA: { label: "Activa", className: "bg-emerald-100 text-emerald-700" },
  MOROSA: { label: "Pago pendiente", className: "bg-amarillo/30 text-tinta" },
  SUSPENDIDA: { label: "Suspendida", className: "bg-red-100 text-red-700" },
  CANCELADA: { label: "Cancelada", className: "bg-slate-200 text-slate-600" },
};

export function Greeting({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-celeste">{todayInLima()}</p>
      <h1 className="mt-1 text-3xl font-bold text-tinta sm:text-4xl">
        {greetingInLima()}, {name.split(" ")[0]}
      </h1>
      <p className="mt-2 text-base text-slate-600">{subtitle}</p>
    </div>
  );
}

/** Vista del cliente que paga: lo que le falta para operar y el estado de su cuenta. */
export function PaidDashboard({ summary }: { summary: DashboardSummary }) {
  const { conteos } = summary;

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <SetupChecklist steps={summary.configuracion} />
        <StatGrid conteos={conteos} />
      </div>
      <div className="space-y-6">
        <SubscriptionCard summary={summary} />
        <TodayCard />
      </div>
    </div>
  );
}

/** Vista de la cuenta demo: un restaurante ya armado para explorar. */
export function DemoDashboard({ summary }: { summary: DashboardSummary }) {
  const { conteos } = summary;
  const highlights: { icon: IconName; title: string; text: string }[] = [
    {
      icon: "plano",
      title: "Plano del salón",
      text: `${conteos.mesas} mesas en ${conteos.salones} salones, con barra, caja y entrada ya dibujadas.`,
    },
    {
      icon: "carta",
      title: "Carta criolla",
      text: `${conteos.productos} platos y bebidas en ${conteos.categorias} categorías, con modificadores como el término de la carne.`,
    },
    {
      icon: "cocina",
      title: "Cocina y bar",
      text: `${conteos.estaciones} estaciones de preparación: cada plato llega a su pantalla en tiempo real.`,
    },
    {
      icon: "facturacion",
      title: "Facturación SUNAT",
      text: `Series B001 y F001 listas para emitir en el ambiente de pruebas de SUNAT.`,
    },
  ];

  return (
    <div className="mt-8 space-y-6">
      <section className="relative isolate overflow-hidden rounded-3xl bg-linear-to-br from-azul-oscuro via-azul to-celeste p-8 text-white sm:p-10">
        <Image
          src={restaurante}
          alt=""
          fill
          sizes="100vw"
          placeholder="blur"
          className="-z-10 object-cover opacity-25 mix-blend-luminosity"
        />
        <span className="inline-block rounded-full bg-amarillo px-3 py-1 text-xs font-bold tracking-wide text-tinta uppercase">
          Restaurante de ejemplo
        </span>
        <h2 className="mt-4 max-w-2xl text-2xl leading-tight font-bold sm:text-3xl">
          {summary.empresa?.nombre_comercial} ya está listo para atender
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7 text-white/90">
          Así se ve Softflyer cuando un restaurante termina de configurarse. Recorre cada sección con
          total libertad: nada de lo que hagas aquí afecta a una empresa real.
        </p>
        <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Mesas", conteos.mesas],
            ["Asientos", conteos.asientos],
            ["Productos", conteos.productos],
            ["Estaciones", conteos.estaciones],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white/12 p-4 backdrop-blur-sm">
              <dt className="text-xs font-semibold tracking-wide text-white/75 uppercase">{label}</dt>
              <dd className="mt-1 text-3xl font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="text-lg font-bold text-tinta">Qué puedes explorar</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {highlights.map((item) => (
            <article key={item.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-celeste/15 text-azul">
                <Icon name={item.icon} />
              </span>
              <div>
                <h3 className="font-bold text-tinta">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
                <p className="mt-2 text-xs font-bold tracking-wide text-slate-400 uppercase">Pantalla en camino</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <SetupChecklist steps={summary.configuracion} title="Así de avanzada está la puesta a punto" />
    </div>
  );
}

function SetupChecklist({ steps, title = "Pon a punto tu restaurante" }: { steps: DashboardSummary["configuracion"]; title?: string }) {
  const done = steps.filter((step) => step.completo).length;
  const percent = Math.round((done / steps.length) * 100);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-tinta">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {done === steps.length
              ? "¡Todo listo! Ya puedes vender y facturar."
              : `${done} de ${steps.length} pasos completos. Te recomendamos seguir este orden.`}
          </p>
        </div>
        <span className="text-2xl font-bold text-azul">{percent}%</span>
      </div>
      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-niebla"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Avance de la configuración"
      >
        <div className="h-full rounded-full bg-linear-to-r from-azul to-celeste" style={{ width: `${percent}%` }} />
      </div>

      <ol className="mt-6 divide-y divide-slate-100">
        {steps.map((step) => (
          <li key={step.clave} className="flex items-center gap-4 py-3.5">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                step.completo ? "bg-emerald-100 text-emerald-700" : "bg-niebla text-slate-500"
              }`}
            >
              <Icon name={step.completo ? "check" : STEP_ICONS[step.clave] ?? "rayo"} />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`font-bold ${step.completo ? "text-slate-500 line-through decoration-slate-300" : "text-tinta"}`}>
                {step.titulo}
              </p>
              <p className="text-sm text-slate-500">{step.descripcion}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                step.completo ? "bg-emerald-50 text-emerald-700" : "bg-niebla text-slate-500"
              }`}
            >
              {step.completo ? "Listo" : "Pendiente"}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StatGrid({ conteos }: { conteos: DashboardSummary["conteos"] }) {
  const stats: { icon: IconName; label: string; value: number; hint: string }[] = [
    { icon: "plano", label: "Salones", value: conteos.salones, hint: `${conteos.mesas} mesas · ${conteos.asientos} asientos` },
    { icon: "carta", label: "Productos", value: conteos.productos, hint: `${conteos.categorias} categorías` },
    { icon: "cocina", label: "Estaciones", value: conteos.estaciones, hint: "Cocina, bar, parrilla…" },
    { icon: "equipo", label: "Usuarios", value: conteos.usuarios, hint: `${conteos.sucursales} local${conteos.sucursales === 1 ? "" : "es"}` },
  ];

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-celeste/15 text-azul">
            <Icon name={stat.icon} className="h-4.5 w-4.5" />
          </span>
          <p className="mt-4 text-3xl font-bold text-tinta">{stat.value}</p>
          <p className="text-sm font-semibold text-tinta">{stat.label}</p>
          <p className="mt-1 text-xs text-slate-500">{stat.hint}</p>
        </div>
      ))}
    </section>
  );
}

function SubscriptionCard({ summary }: { summary: DashboardSummary }) {
  const subscription = summary.suscripcion;
  const status = subscription ? SUBSCRIPTION_LABELS[subscription.estado] : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">Tu suscripción</h2>
      {subscription && status ? (
        <>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xl font-bold text-tinta">Plan {subscription.plan}</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.label}</span>
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <Icon name="calendario" className="h-4 w-4 text-celeste" />
            {subscription.estado === "PRUEBA" ? "Tu prueba termina el" : "Se renueva el"}{" "}
            {formatDate(subscription.fecha_vencimiento)}
            <span className="font-semibold text-tinta">({subscription.dias_restantes} días)</span>
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-600">No encontramos una suscripción activa.</p>
      )}

      <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Empresa</dt>
          <dd className="truncate font-semibold text-tinta">{summary.empresa?.razon_social ?? "Sin datos fiscales"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">RUC</dt>
          <dd className="font-semibold text-tinta">{summary.empresa?.ruc ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">SUNAT</dt>
          <dd className="font-semibold text-tinta">{summary.empresa?.homologado ? "Producción" : "Pruebas (beta)"}</dd>
        </div>
      </dl>
    </section>
  );
}

function TodayCard() {
  return (
    <section className="rounded-2xl border-2 border-dashed border-celeste/40 bg-white p-6">
      <h2 className="text-sm font-bold tracking-wide text-slate-500 uppercase">Hoy en tu local</h2>
      <p className="mt-3 text-3xl font-bold text-slate-300">S/ —</p>
      <p className="mt-2 text-sm text-slate-500">
        Tus ventas, pedidos y mesas ocupadas aparecerán aquí cuando abras tu primera caja.
      </p>
    </section>
  );
}

function greetingInLima(): string {
  const hour = Number(
    new Intl.DateTimeFormat("es-PE", { hour: "numeric", hour12: false, timeZone: "America/Lima" }).format(new Date()),
  );

  return hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
}

function todayInLima(): string {
  const date = new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Lima",
  }).format(new Date());

  return date.charAt(0).toUpperCase() + date.slice(1);
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(isoDate));
}
