"use client";

import { useActionState } from "react";

import { platformLogin } from "@/app/plataforma/actions";
import { inputClass, primaryButton } from "@/app/plataforma/ui";

export function PlatformLoginForm() {
  const [state, action, pending] = useActionState(platformLogin, {});

  return (
    <form action={action} className="space-y-4">
      {state.mensaje && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          {state.mensaje}
        </div>
      )}
      <div>
        <label htmlFor="correo" className="mb-1.5 block text-sm font-semibold text-tinta">Correo</label>
        <input id="correo" name="correo" type="email" required autoComplete="username" className={inputClass} />
      </div>
      <div>
        <label htmlFor="contrasena" className="mb-1.5 block text-sm font-semibold text-tinta">Contraseña</label>
        <input id="contrasena" name="contrasena" type="password" required autoComplete="current-password" className={inputClass} />
      </div>
      <button type="submit" disabled={pending} className={`${primaryButton} w-full py-3`}>
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
