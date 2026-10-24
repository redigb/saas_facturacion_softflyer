"use client";

import { useActionState } from "react";
import { Send, Check } from "lucide-react";

import { resendLink } from "@/app/plataforma/actions";
import { Button } from "@/components/ui/button";

export function ResendButton({ id }: { id: number }) {
  const [state, action, pending] = useActionState(resendLink.bind(null, id), {});

  if (state.ok) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500">
        <Check className="h-4 w-4" />
        <span>Enlace enviado</span>
      </span>
    );
  }

  return (
    <form action={action}>
      <Button
        type="submit"
        size="sm"
        variant="outline"
        isLoading={pending}
        className="gap-1.5 text-xs font-bold hover:border-primary hover:text-primary"
      >
        <Send className="h-3.5 w-3.5" />
        <span>Reenviar enlace</span>
      </Button>
      {state.mensaje && <p className="mt-1 text-xs text-red-500">{state.mensaje}</p>}
    </form>
  );
}
