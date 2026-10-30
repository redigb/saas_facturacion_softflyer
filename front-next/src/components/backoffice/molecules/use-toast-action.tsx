"use client";

import { useActionState } from "react";

import type { FormState } from "@/app/plataforma/actions";
import { toast } from "@/components/ui/toast";

/** `useActionState` que anuncia el resultado con un toast; `onSuccess` corre solo si la acción salió bien. */
export function useToastAction(
  action: (prev: FormState, formData: FormData) => Promise<FormState>,
  onSuccess?: () => void,
) {
  return useActionState(async (prev: FormState, formData: FormData) => {
    const res = await action(prev, formData);
    if (res?.mensaje) {
      if (res.ok) {
        toast.success(res.mensaje);
        onSuccess?.();
      } else {
        toast.error(res.mensaje);
      }
    }
    return res;
  }, {} as FormState);
}

/** Error que queda junto al formulario después de que el toast desaparece. */
export function FormError({ state }: { state: FormState }) {
  if (!state.mensaje || state.ok) {
    return null;
  }

  return (
    <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-[13px] font-semibold text-destructive">
      {state.mensaje}
    </p>
  );
}
