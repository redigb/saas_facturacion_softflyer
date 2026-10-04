"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { createClient } from "@/app/plataforma/actions";
import type { Plan } from "@/app/plataforma/types";
import { cardClass, inputClass, primaryButton } from "@/app/plataforma/ui";
import { isValidRuc, toSlug } from "@/lib/ruc";

export function NewClientForm({ plans, rootDomain }: { plans: Plan[]; rootDomain: string }) {
  const [state, action, pending] = useActionState(createClient, {});
  const values = state.ok ? {} : (state.resultado ?? {});
  const [slug, setSlug] = useState(values.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [ruc, setRuc] = useState(values.ruc ?? "");
  const error = (field: string) => state.errores?.[field]?.[0];

  if (state.ok && state.resultado) {
    const created = state.resultado;

    return (
      <section className={`${cardClass} mt-8 max-w-2xl border-emerald-200`}>
        <h2 className="text-xl font-bold text-emerald-700">Cliente creado</h2>
        <p className="mt-2 text-sm text-slate-600">
          Comparte estos datos con el cliente por un canal seguro. <strong>La contraseña no se volverá a mostrar</strong>;
          pídele que la cambie al ingresar.
        </p>
        <dl className="mt-5 space-y-3 rounded-xl bg-niebla p-4 text-sm">
          <Row label="Dirección" value={`http://${created.slug}.${rootDomain}/login`} />
          <Row label="Correo" value={created.correo} />
          <Row label="Contraseña temporal" value={created.contrasena_temporal} mono />
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={`/plataforma/clientes/${created.slug}`} className={primaryButton}>Ver ficha del cliente</Link>
          <Link href="/plataforma/clientes" className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-bold text-azul hover:bg-niebla">
            Volver a clientes
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form action={action} className={`${cardClass} mt-8 max-w-3xl space-y-5`}>
      {state.mensaje && !state.errores && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.mensaje}</div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="RUC" error={error("ruc") ?? (ruc.length === 11 && !isValidRuc(ruc) ? "El RUC no es válido." : undefined)}>
          <input name="ruc" required inputMode="numeric" maxLength={11} value={ruc} onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))} className={`${inputClass} font-mono`} />
        </Field>
        <Field label="Razón social" error={error("razon_social")}>
          <input name="razon_social" required defaultValue={values.razon_social} className={inputClass} />
        </Field>
        <Field label="Nombre del restaurante" error={error("nombre_comercial")}>
          <input
            name="nombre_comercial"
            required
            defaultValue={values.nombre_comercial}
            onChange={(e) => !slugEdited && setSlug(toSlug(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label={`Dirección (.${rootDomain})`} error={error("slug")}>
          <input
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(toSlug(e.target.value));
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Nombre del administrador" error={error("nombre_contacto")}>
          <input name="nombre_contacto" required defaultValue={values.nombre_contacto} className={inputClass} />
        </Field>
        <Field label="Correo del administrador" error={error("correo")}>
          <input name="correo" type="email" required defaultValue={values.correo} className={inputClass} />
        </Field>
        <Field label="Plan" error={error("plan")}>
          <select name="plan" required defaultValue={values.plan} className={inputClass}>
            {plans.map((plan) => (
              <option key={plan.codigo} value={plan.codigo}>{plan.nombre}</option>
            ))}
          </select>
        </Field>
        <Field label="Periodo pagado" error={error("meses")}>
          <select name="meses" defaultValue="1" className={inputClass}>
            {[1, 3, 6, 12].map((m) => (
              <option key={m} value={m}>{m} {m === 1 ? "mes" : "meses"}</option>
            ))}
          </select>
        </Field>
      </div>

      <button type="submit" disabled={pending} className={`${primaryButton} py-3`}>
        {pending ? "Creando…" : "Crear cliente"}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-tinta">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm font-medium text-red-600">{error}</span>}
    </label>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-semibold break-all text-tinta ${mono ? "font-mono text-base" : ""}`}>{value}</dd>
    </div>
  );
}
