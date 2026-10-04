"use client";

import { useActionState } from "react";

import { resendLink } from "@/app/plataforma/actions";

export function ResendButton({ id }: { id: number }) {
  const [state, action, pending] = useActionState(resendLink.bind(null, id), {});

  if (state.ok) {
    return <span className="text-sm font-semibold text-emerald-600">Enviado ✓</span>;
  }

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border-2 border-azul px-3 py-1.5 text-xs font-bold text-azul transition hover:bg-azul hover:text-white disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Reenviar enlace"}
      </button>
      {state.mensaje && <p className="mt-1 text-xs text-red-600">{state.mensaje}</p>}
    </form>
  );
}
