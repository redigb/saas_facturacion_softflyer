"use client";

import { useActionState } from "react";

import type { FormState } from "@/app/plataforma/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Tarjeta con una acción del backoffice: título, explicación, campos opcionales y un botón que muestra el resultado. */
export function ActionCard({
  title,
  description,
  action,
  submit,
  children,
  secondary = false,
  danger = false,
}: {
  title: string;
  description: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submit: string;
  children?: React.ReactNode;
  secondary?: boolean;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          {children}
          <Button type="submit" isLoading={pending} variant={danger ? "danger" : secondary ? "outline" : "default"} className="w-full">
            {pending ? "Guardando…" : submit}
          </Button>
          {state.mensaje ? (
            <p role="status" className={`text-sm font-medium ${state.ok ? "text-success" : "text-destructive"}`}>
              {state.mensaje}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
