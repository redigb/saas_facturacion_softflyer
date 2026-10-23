"use client";

import { useActionState } from "react";

import { activatePlan, extendTrial, reactivateClient, saveSolCredentials, setBranchTax, setCompanyRate, setHomologation, suspendClient, testCredentials, uploadCertificate, type FormState } from "@/app/plataforma/actions";
import type { ClientDetail, Plan } from "@/app/plataforma/types";
import { cardClass, inputClass, primaryButton } from "@/app/plataforma/ui";

export function ClientActions({ client, plans }: { client: ClientDetail; plans: Plan[] }) {
  const suspended = client.estado === "SUSPENDIDO";

  return (
    <div className="space-y-6">
      {!suspended && (
        <ActionCard
          title={client.modo === "PRUEBA" ? "Pasar a cliente de pago" : "Renovar plan"}
          description={client.modo === "PRUEBA" ? "Activa su plan cuando confirme el pago. Su prueba queda en el historial." : "Abre un nuevo periodo desde hoy."}
          action={activatePlan.bind(null, client.slug)}
          submit="Activar plan"
        >
          <div className="grid grid-cols-2 gap-3">
            <select name="plan" required className={inputClass} aria-label="Plan">
              {plans.map((plan) => (
                <option key={plan.codigo} value={plan.codigo}>{plan.nombre}</option>
              ))}
            </select>
            <select name="meses" defaultValue="1" className={inputClass} aria-label="Meses">
              {[1, 3, 6, 12].map((m) => (
                <option key={m} value={m}>{m} {m === 1 ? "mes" : "meses"}</option>
              ))}
            </select>
          </div>
        </ActionCard>
      )}

      {client.modo === "PRUEBA" && !suspended && (
        <ActionCard
          title="Extender la prueba"
          description={client.prueba?.vencida ? "Ya venció: los días se cuentan desde hoy." : "Suma días a su prueba actual."}
          action={extendTrial.bind(null, client.slug)}
          submit="Extender"
          secondary
        >
          <select name="dias" defaultValue="3" className={inputClass} aria-label="Días">
            {[1, 3, 7, 14].map((d) => (
              <option key={d} value={d}>+{d} {d === 1 ? "día" : "días"}</option>
            ))}
          </select>
        </ActionCard>
      )}

      <ActionCard
        title="Certificado digital"
        description={
          client.fiscal.certificado
            ? `Cargado${client.fiscal.certificado.titular ? ` a nombre de ${client.fiscal.certificado.titular}` : ""}. Subir otro lo reemplaza.`
            : "Sube el certificado del cliente en .pem o .pfx/.p12. Se guarda cifrado."
        }
        action={uploadCertificate.bind(null, client.slug)}
        submit="Cargar certificado"
      >
        <input name="certificado" type="file" accept=".pem,.pfx,.p12" required className={inputClass} aria-label="Archivo del certificado" />
        <input name="contrasena" type="password" autoComplete="off" placeholder="Contraseña (solo .pfx/.p12)" className={inputClass} aria-label="Contraseña del certificado" />
      </ActionCard>

      <ActionCard
        title="Usuario y clave SOL"
        description={client.fiscal.tiene_clave_sol ? `Usuario ${client.fiscal.usuario_sol}. La clave no se muestra; escribe una nueva para cambiarla.` : "El usuario secundario que el cliente creó en SUNAT."}
        action={saveSolCredentials.bind(null, client.slug)}
        submit="Guardar credenciales"
      >
        <input name="usuario_sol" required defaultValue={client.fiscal.usuario_sol ?? ""} autoComplete="off" placeholder="Usuario SOL" className={inputClass} aria-label="Usuario SOL" />
        <input name="clave_sol" type="password" required autoComplete="new-password" placeholder="Clave SOL" className={inputClass} aria-label="Clave SOL" />
      </ActionCard>

      <ActionCard
        title="Probar credenciales"
        description="Pregunta a SUNAT si acepta el usuario y la clave SOL guardados, sin emitir nada. Solo se puede verificar en producción: en pruebas SUNAT acepta cualquier clave."
        action={testCredentials.bind(null, client.slug)}
        submit="Probar con SUNAT"
        secondary
      />

      <ActionCard
        title="Tasa de IGV de la empresa"
        description="La heredan los locales que no tengan una propia. Si no eliges ninguna, rige el 18 %."
        action={setCompanyRate.bind(null, client.slug)}
        submit="Guardar tasa"
      >
        <select name="tasa_igv_id" defaultValue={client.fiscal.tasa_igv?.id} className={inputClass} aria-label="Tasa de IGV">
          {client.tasas_igv.map((rate) => (
            <option key={rate.id} value={rate.id}>{rate.nombre} · {rate.tasa}%</option>
          ))}
        </select>
      </ActionCard>

      <section className={cardClass}>
        <h2 className="font-bold text-tinta">IGV por local</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cada local puede tener su propia tasa. Márcalo como Amazonía solo si está en esa zona exonerada: vende exonerado lo gravado y el comprobante lleva la leyenda 2001 (bienes) o 2002 (servicios).
        </p>
        <ul className="mt-4 divide-y divide-slate-100">
          {client.sucursales_detalle.map((branch) => (
            <BranchTaxRow key={`${branch.id}-${branch.tasa_igv_id}-${branch.exonerado_amazonia}-${branch.leyenda_amazonia}`} slug={client.slug} branch={branch} rates={client.tasas_igv} />
          ))}
        </ul>
      </section>

      <ActionCard
        title="Homologación en SUNAT"
        description={
          client.fiscal.homologado
            ? "El cliente ya puede emitir en producción. Retírala si aún no completó el proceso."
            : "Márcala solo cuando el cliente confirme su usuario secundario y su certificado en el portal de SUNAT."
        }
        action={setHomologation.bind(null, client.slug, !client.fiscal.homologado)}
        submit={client.fiscal.homologado ? "Retirar homologación" : "Marcar como homologado"}
        secondary
      />

      {suspended ? (
        <ActionCard
          title="Reactivar"
          description="Vuelve a tener acceso según su suscripción vigente."
          action={reactivateClient.bind(null, client.slug)}
          submit="Reactivar cliente"
        />
      ) : (
        <ActionCard
          title="Suspender"
          description="Bloquea la operación. Conserva sus datos y puede seguir entrando para ver su estado."
          action={suspendClient.bind(null, client.slug)}
          submit="Suspender cliente"
          danger
        >
          <input name="motivo" required maxLength={255} placeholder="Motivo (ej. pago pendiente)" className={inputClass} aria-label="Motivo" />
        </ActionCard>
      )}
    </div>
  );
}

function BranchTaxRow({ slug, branch, rates }: { slug: string; branch: ClientDetail["sucursales_detalle"][number]; rates: ClientDetail["tasas_igv"] }) {
  const [state, formAction, pending] = useActionState(setBranchTax.bind(null, slug, branch.id), {} as FormState);

  return (
    <li className="py-4 text-sm">
      <p className="truncate font-semibold text-tinta">{branch.nombre}</p>
      <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-2">
        <select name="tasa_igv_id" defaultValue={branch.tasa_igv_id ?? ""} className={inputClass} aria-label={`Tasa de ${branch.nombre}`}>
          <option value="">La de la empresa</option>
          {rates.map((rate) => (
            <option key={rate.id} value={rate.id}>{rate.nombre} · {rate.tasa}%</option>
          ))}
        </select>
        <select name="leyenda_amazonia" defaultValue={branch.leyenda_amazonia} className={inputClass} aria-label={`Leyenda de ${branch.nombre}`}>
          <option value="2001">Leyenda 2001 · bienes</option>
          <option value="2002">Leyenda 2002 · servicios</option>
        </select>
        <label className="flex items-center gap-2 font-medium text-tinta">
          <input type="checkbox" name="exonerado_amazonia" defaultChecked={branch.exonerado_amazonia} className="size-4" />
          Local en la Amazonía (exonerado)
        </label>
        <button type="submit" disabled={pending} className="rounded-xl border-2 border-azul px-3 py-2 text-xs font-bold text-azul transition hover:bg-azul hover:text-white disabled:opacity-60">
          {pending ? "Guardando…" : "Guardar local"}
        </button>
        {state.mensaje ? <p role="status" className={`sm:col-span-2 font-medium ${state.ok ? "text-emerald-600" : "text-red-600"}`}>{state.mensaje}</p> : null}
      </form>
    </li>
  );
}

function ActionCard({
  title,
  description,
  action,
  submit,
  children,
  secondary = false,
  danger = false,
}: {
  title: string;
  description: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submit: string;
  children?: React.ReactNode;
  secondary?: boolean;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const buttonClass = danger
    ? "inline-flex items-center justify-center rounded-xl border-2 border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
    : secondary
      ? "inline-flex items-center justify-center rounded-xl border-2 border-azul px-4 py-2.5 text-sm font-bold text-azul transition hover:bg-azul hover:text-white disabled:opacity-60"
      : primaryButton;

  return (
    <section className={cardClass}>
      <h2 className="font-bold text-tinta">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <form action={formAction} className="mt-4 space-y-3">
        {children}
        <button type="submit" disabled={pending} className={`${buttonClass} w-full`}>
          {pending ? "Guardando…" : submit}
        </button>
        {state.mensaje && (
          <p role="status" className={`text-sm font-medium ${state.ok ? "text-emerald-600" : "text-red-600"}`}>
            {state.mensaje}
          </p>
        )}
      </form>
    </section>
  );
}
