"use client";

import { useActionState } from "react";

import { goToTenant } from "@/app/actions";

export function TenantForm({ rootDomain }: { rootDomain: string }) {
  const [state, action, pending] = useActionState(goToTenant, {});

  return (
    <form action={action} className="space-y-3">
      <label htmlFor="slug" className="block text-sm font-semibold text-tinta">
        Ya tengo cuenta
      </label>
      <div
        className={`flex items-center rounded-xl border bg-white focus-within:border-azul focus-within:ring-4 focus-within:ring-celeste/25 ${
          state.mensaje ? "border-red-500" : "border-slate-300"
        }`}
      >
        <input
          id="slug"
          name="slug"
          required
          autoComplete="off"
          defaultValue={state.slug}
          placeholder="mirestaurante"
          aria-describedby={state.mensaje ? "slug-error" : undefined}
          className="min-w-0 flex-1 rounded-l-xl bg-transparent px-4 py-3 text-base outline-none placeholder:text-slate-400"
        />
        <span className="pr-4 text-sm font-medium text-slate-500">.{rootDomain}</span>
      </div>
      {state.mensaje && (
        <p id="slug-error" className="text-sm font-medium text-red-600">
          {state.mensaje}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl border-2 border-azul px-4 py-3 font-bold text-azul transition hover:bg-azul hover:text-white disabled:opacity-60"
      >
        {pending ? "Buscando…" : "Ir a mi empresa"}
      </button>
    </form>
  );
}
