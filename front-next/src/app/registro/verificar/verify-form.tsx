"use client";

import Link from "next/link";
import { useActionState } from "react";

import { verify } from "@/app/registro/actions";

// Se confirma con un clic (no al cargar la página): los antivirus de correo abren
// los enlaces para revisarlos y, si verificáramos al cargar, gastarían el token.
export function VerifyForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(verify, {});

  if (state.mensaje) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-tinta">No pudimos activar tu cuenta</h1>
        <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {state.mensaje}
        </div>
        <p className="mt-4 text-sm text-slate-600">
          {state.codigo === "ENLACE_INVALIDO"
            ? "Si ya confirmaste tu correo, entra directamente a la dirección de tu restaurante."
            : "Regístrate de nuevo con el mismo RUC y te enviaremos un enlace nuevo."}
        </p>
        <Link href="/registro" className="mt-8 inline-block rounded-xl bg-azul px-5 py-3 font-bold text-white hover:bg-azul-oscuro">
          Volver al registro
        </Link>
      </div>
    );
  }

  return (
    <div>
      <span className="inline-block rounded-full bg-amarillo px-3 py-1 text-xs font-bold tracking-wide text-tinta uppercase">
        Último paso
      </span>
      <h1 className="mt-3 text-3xl font-bold text-tinta">Activa tu restaurante</h1>
      <p className="mt-3 text-base leading-7 text-slate-600">
        Confirma tu correo y prepararemos tu sistema para que empieces a configurarlo.
      </p>
      <form action={action} className="mt-8">
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-azul px-4 py-3.5 text-base font-bold text-white shadow-sm transition hover:bg-azul-oscuro disabled:opacity-60"
        >
          {pending ? "Preparando tu restaurante…" : "Confirmar y activar mi cuenta"}
        </button>
      </form>
    </div>
  );
}
