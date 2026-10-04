"use client";

import { useActionState, useState } from "react";

import { login, loginDemo } from "@/app/login/actions";
import type { Tenant } from "@/lib/api";

const inputClass =
  "w-full rounded-xl border bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-azul focus:ring-4 focus:ring-celeste/25";

export function LoginForm({ tenant }: { tenant: Tenant }) {
  const [state, action, pending] = useActionState(login, {});
  const [demoState, demoAction, demoPending] = useActionState(loginDemo, {});
  const [showPassword, setShowPassword] = useState(false);

  const isDemo = tenant.modo === "DEMO";
  const busy = pending || demoPending;
  const fieldError = (field: string) => state.errores?.[field]?.[0];
  const generalError = state.errores ? undefined : state.mensaje ?? demoState.mensaje;

  return (
    <div>
      {isDemo && (
        <div className="mb-8 rounded-2xl border border-amarillo bg-amarillo/15 p-5">
          <span className="inline-block rounded-full bg-amarillo px-3 py-1 text-xs font-bold tracking-wide text-tinta uppercase">
            Modo demo
          </span>
          <p className="mt-3 text-sm leading-6 text-tinta">
            Explora un restaurante de ejemplo con datos ficticios. Lo que hagas aquí no afecta a ninguna empresa real.
          </p>
          <form action={demoAction} className="mt-4">
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-amarillo px-4 py-3 font-bold text-tinta shadow-sm transition hover:brightness-95 focus-visible:ring-4 focus-visible:ring-amarillo/40 focus-visible:outline-none disabled:opacity-60"
            >
              {demoPending ? "Entrando…" : "Entrar a la demo sin contraseña"}
            </button>
          </form>
        </div>
      )}

      <p className="text-sm font-semibold tracking-wide text-celeste uppercase">{tenant.nombre}</p>
      <h1 className="mt-1 text-3xl font-bold text-tinta">Inicia sesión</h1>
      <p className="mt-2 text-base text-slate-600">Ingresa con tu correo y contraseña.</p>

      {generalError && (
        <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {generalError}
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
            autoComplete="email"
            defaultValue={state.correo}
            placeholder="tu@correo.com"
            aria-invalid={Boolean(fieldError("correo"))}
            className={`${inputClass} ${fieldError("correo") ? "border-red-500" : "border-slate-300"}`}
          />
          {fieldError("correo") && (
            <p className="mt-1.5 text-sm font-medium text-red-600">{fieldError("correo")}</p>
          )}
        </div>

        <div>
          <label htmlFor="contrasena" className="mb-1.5 block text-sm font-semibold text-tinta">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="contrasena"
              name="contrasena"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••••"
              aria-invalid={Boolean(fieldError("contrasena"))}
              className={`${inputClass} pr-24 ${fieldError("contrasena") ? "border-red-500" : "border-slate-300"}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute inset-y-0 right-0 px-4 text-sm font-semibold text-azul hover:text-celeste"
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          {fieldError("contrasena") && (
            <p className="mt-1.5 text-sm font-medium text-red-600">{fieldError("contrasena")}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-azul px-4 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-azul-oscuro focus-visible:ring-4 focus-visible:ring-celeste/40 focus-visible:outline-none disabled:opacity-60"
        >
          {pending ? "Ingresando…" : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
}
