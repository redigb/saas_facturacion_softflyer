"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { resetPassword } from "@/app/restablecer/actions";

const inputClass =
  "w-full rounded-xl border bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-azul focus:ring-4 focus:ring-celeste/25";

type Field = "contrasena" | "contrasena_confirmation";

// Mismo formulario para restablecer (spec 035) y para activar una cuenta nueva (spec 036).
const COPY = {
  restablecer: {
    title: "Crea tu nueva contraseña",
    intro: "Al guardarla cerraremos tu sesión en todos los dispositivos.",
    submit: "Guardar y continuar",
    dead: "Pedir un enlace nuevo",
  },
  activar: {
    title: "Activa tu cuenta",
    intro: "Crea la contraseña con la que entrarás a tu restaurante. Solo tú la conocerás.",
    submit: "Activar mi cuenta",
    dead: null,
  },
} as const;

// La contraseña se cambia con un clic (no al abrir la página): los antivirus de correo
// abren los enlaces para revisarlos y no deben gastar el token.
export function ResetForm({ token, mode = "restablecer" }: { token: string; mode?: keyof typeof COPY }) {
  const copy = COPY[mode];
  const [state, action, pending] = useActionState(resetPassword, {});
  const [showPassword, setShowPassword] = useState(false);
  const fieldError = (field: Field) => state.errores?.[field]?.[0];

  if (state.codigo === "ENLACE_INVALIDO" || state.codigo === "ENLACE_VENCIDO") {
    return (
      <div>
        <h1 className="text-3xl font-bold text-tinta">Este enlace ya no sirve</h1>
        <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.mensaje}
        </div>
        {copy.dead ? (
          <Link href="/olvide" className="mt-8 inline-block rounded-xl bg-azul px-5 py-3 font-bold text-white hover:bg-azul-oscuro">
            {copy.dead}
          </Link>
        ) : (
          <p className="mt-4 text-sm leading-6 text-slate-600">Pide a Softflyer que te envíe un enlace nuevo.</p>
        )}
      </div>
    );
  }

  const input = (name: Field, label: string, hint?: string) => {
    const error = fieldError(name);
    const describedBy = error ? `${name}-error` : hint ? `${name}-ayuda` : undefined;

    return (
      <div>
        <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-tinta">
          {label}
        </label>
        <input
          id={name}
          name={name}
          type={showPassword ? "text" : "password"}
          required
          minLength={10}
          autoFocus={name === "contrasena"}
          autoComplete="new-password"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`${inputClass} ${error ? "border-red-500" : "border-slate-300"}`}
        />
        {error ? (
          <p id={`${name}-error`} className="mt-1.5 text-sm font-medium text-red-600">
            {error}
          </p>
        ) : hint ? (
          <p id={`${name}-ayuda`} className="mt-1.5 text-sm text-slate-500">
            {hint}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-tinta">{copy.title}</h1>
      <p className="mt-2 text-base text-slate-600">{copy.intro}</p>

      {state.mensaje && !state.errores && (
        <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.mensaje}
        </div>
      )}

      <form action={action} className="mt-6 space-y-5">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="modo" value={mode} />
        {input("contrasena", "Nueva contraseña", "Mínimo 10 caracteres. Una frase fácil de recordar es más segura que símbolos raros.")}
        {input("contrasena_confirmation", "Repite la contraseña")}

        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} className="size-4" />
          Mostrar contraseñas
        </label>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-azul px-4 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-azul-oscuro focus-visible:ring-4 focus-visible:ring-celeste/40 focus-visible:outline-none disabled:opacity-60"
        >
          {pending ? "Guardando…" : copy.submit}
        </button>
      </form>
    </div>
  );
}
