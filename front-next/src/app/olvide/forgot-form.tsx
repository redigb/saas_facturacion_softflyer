"use client";

import Link from "next/link";
import { useActionState } from "react";

import { forgotPassword } from "@/app/restablecer/actions";

const inputClass =
  "w-full rounded-xl border bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-azul focus:ring-4 focus:ring-celeste/25";

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPassword, {});
  const fieldError = state.errores?.correo?.[0];

  if (state.ok) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-tinta">Revisa tu correo</h1>
        <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {state.mensaje}
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          El enlace vence en 1 hora y sirve una sola vez. Si no lo ves, revisa la carpeta de spam o pide ayuda al administrador de tu restaurante.
        </p>
        <Link href="/login" className="mt-8 inline-block rounded-xl bg-azul px-5 py-3 font-bold text-white hover:bg-azul-oscuro">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-tinta">¿Olvidaste tu contraseña?</h1>
      <p className="mt-2 text-base text-slate-600">Escribe tu correo y te enviaremos un enlace para crear una nueva.</p>

      {state.mensaje && !fieldError && (
        <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.mensaje}
        </div>
      )}

      <form action={action} className="mt-6 space-y-5">
        <div>
          <label htmlFor="correo" className="mb-1.5 block text-sm font-semibold text-tinta">
            Correo
          </label>
          <input
            id="correo"
            name="correo"
            type="email"
            required
            autoFocus
            autoComplete="email"
            defaultValue={state.correo}
            placeholder="tu@correo.com"
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? "correo-error" : undefined}
            className={`${inputClass} ${fieldError ? "border-red-500" : "border-slate-300"}`}
          />
          {fieldError && (
            <p id="correo-error" className="mt-1.5 text-sm font-medium text-red-600">
              {fieldError}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-azul px-4 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-azul-oscuro focus-visible:ring-4 focus-visible:ring-celeste/40 focus-visible:outline-none disabled:opacity-60"
        >
          {pending ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>

      <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-azul hover:text-celeste">
        ← Volver a iniciar sesión
      </Link>
    </div>
  );
}
