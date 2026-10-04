"use client";

import { useActionState, useState } from "react";

import { register, resend } from "@/app/registro/actions";
import { isValidRuc, toSlug } from "@/lib/ruc";

const inputClass =
  "w-full rounded-xl border bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-azul focus:ring-4 focus:ring-celeste/25";

export function RegistroForm({ rootDomain, trialDays }: { rootDomain: string; trialDays: number }) {
  const [state, action, pending] = useActionState(register, {});

  if (state.enviado) {
    return <CheckEmail correo={state.correo ?? ""} />;
  }

  return <SignupFields key={JSON.stringify(state.valores ?? {})} state={state} action={action} pending={pending} rootDomain={rootDomain} trialDays={trialDays} />;
}

function SignupFields({
  state,
  action,
  pending,
  rootDomain,
  trialDays,
}: {
  state: Awaited<ReturnType<typeof register>>;
  action: (formData: FormData) => void;
  pending: boolean;
  rootDomain: string;
  trialDays: number;
}) {
  const initial = state.valores ?? {};
  const [ruc, setRuc] = useState(initial.ruc ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(initial.slug));

  const error = (field: string) => state.errores?.[field]?.[0];
  const rucHint =
    ruc.length === 11 ? (isValidRuc(ruc) ? "ok" : "El RUC no es válido. Revisa los 11 dígitos.") : null;

  return (
    <form action={action} className="space-y-5">
      {state.mensaje && !state.errores && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.mensaje}
        </div>
      )}

      {/* El RUC es el dato principal: identifica a la empresa ante SUNAT. */}
      <div className="rounded-2xl border-2 border-azul/15 bg-white p-5">
        <label htmlFor="ruc" className="block text-sm font-bold text-azul">
          RUC de tu empresa
        </label>
        <input
          id="ruc"
          name="ruc"
          inputMode="numeric"
          autoComplete="off"
          required
          maxLength={11}
          value={ruc}
          onChange={(e) => setRuc(e.target.value.replace(/\D/g, ""))}
          placeholder="20123456789"
          aria-invalid={Boolean(error("ruc")) || rucHint === "El RUC no es válido. Revisa los 11 dígitos."}
          className={`${inputClass} mt-2 text-2xl font-bold tracking-[0.2em] ${
            error("ruc") || (rucHint && rucHint !== "ok") ? "border-red-500" : rucHint === "ok" ? "border-emerald-500" : "border-slate-300"
          }`}
        />
        <p className={`mt-2 text-sm font-medium ${error("ruc") || (rucHint && rucHint !== "ok") ? "text-red-600" : rucHint === "ok" ? "text-emerald-600" : "text-slate-500"}`}>
          {error("ruc") ?? (rucHint === "ok" ? "RUC válido ✓" : rucHint ?? "11 dígitos. Lo usaremos para tus boletas y facturas.")}
        </p>
      </div>

      <Field label="Razón social" name="razon_social" placeholder="LA CASONA S.A.C." defaultValue={initial.razon_social} error={error("razon_social")} />

      <div>
        <Field
          label="Nombre de tu restaurante"
          name="nombre_comercial"
          placeholder="La Casona"
          defaultValue={initial.nombre_comercial}
          error={error("nombre_comercial")}
          onChange={(value) => !slugEdited && setSlug(toSlug(value))}
        />
      </div>

      <div>
        <label htmlFor="slug" className="mb-1.5 block text-sm font-semibold text-tinta">
          Dirección de tu sistema
        </label>
        <div className={`flex items-center rounded-xl border bg-white focus-within:border-azul focus-within:ring-4 focus-within:ring-celeste/25 ${error("slug") ? "border-red-500" : "border-slate-300"}`}>
          <input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(toSlug(e.target.value));
            }}
            placeholder="lacasona"
            className="min-w-0 flex-1 rounded-l-xl bg-transparent px-4 py-3 text-base outline-none placeholder:text-slate-400"
          />
          <span className="pr-4 text-sm font-medium text-slate-500">.{rootDomain}</span>
        </div>
        <p className={`mt-1.5 text-sm ${error("slug") ? "font-medium text-red-600" : "text-slate-500"}`}>
          {error("slug") ?? "Aquí entrarán tú y tu equipo."}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tu nombre" name="nombre_contacto" placeholder="Ana Torres" autoComplete="name" defaultValue={initial.nombre_contacto} error={error("nombre_contacto")} />
        <Field label="Celular (opcional)" name="telefono" placeholder="987654321" inputMode="tel" autoComplete="tel" required={false} defaultValue={initial.telefono} error={error("telefono")} />
      </div>

      <Field label="Correo" name="correo" type="email" placeholder="tu@correo.com" autoComplete="email" defaultValue={initial.correo} error={error("correo")} hint="Te enviaremos un enlace para confirmarlo." />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contraseña" name="contrasena" type="password" placeholder="Mínimo 10 caracteres" autoComplete="new-password" minLength={10} error={error("contrasena")} />
        <Field label="Repite la contraseña" name="contrasena_confirmation" type="password" placeholder="••••••••••" autoComplete="new-password" minLength={10} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-azul px-4 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-azul-oscuro focus-visible:ring-4 focus-visible:ring-celeste/40 focus-visible:outline-none disabled:opacity-60"
      >
        {pending ? "Creando tu prueba…" : `Empezar mis ${trialDays} días gratis`}
      </button>
      <p className="text-center text-xs text-slate-500">Sin tarjeta. Al terminar la prueba decides si contratas un plan.</p>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  required = true,
  onChange,
  ...props
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
  onChange?: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-tinta">
        {label}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        aria-invalid={Boolean(error)}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={`${inputClass} ${error ? "border-red-500" : "border-slate-300"}`}
        {...props}
      />
      {(error || hint) && (
        <p className={`mt-1.5 text-sm ${error ? "font-medium text-red-600" : "text-slate-500"}`}>{error ?? hint}</p>
      )}
    </div>
  );
}

function CheckEmail({ correo }: { correo: string }) {
  const [state, action, pending] = useActionState(resend, {});

  return (
    <div className="text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-celeste/15 text-3xl" aria-hidden="true">
        ✉️
      </span>
      <h2 className="mt-5 text-2xl font-bold text-tinta">Revisa tu correo</h2>
      <p className="mt-3 text-base leading-7 text-slate-600">
        Te enviamos un enlace a <strong className="text-tinta">{correo}</strong>. Ábrelo para activar tu restaurante.
        Si no lo ves, revisa la carpeta de spam.
      </p>
      <form action={action} className="mt-8">
        <input type="hidden" name="correo" value={correo} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl border-2 border-azul px-5 py-2.5 text-sm font-bold text-azul transition hover:bg-azul hover:text-white disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Reenviar el correo"}
        </button>
      </form>
      {state.mensaje && <p className="mt-3 text-sm font-medium text-emerald-600">{state.mensaje}</p>}
    </div>
  );
}
