"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

import { saveSolCredentials, testCredentials, type FormState } from "@/app/plataforma/actions";
import type { ClientDetail } from "@/app/plataforma/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";

import { solReady, type RouteStepState } from "./fiscal-stage";
import { RouteStep } from "./route-step";
import { SecretInput } from "./secret-input";
import { FormError, useToastAction } from "@/components/backoffice/molecules/use-toast-action";

export function SolStep({ slug, fiscal, state }: { slug: string; fiscal: ClientDetail["fiscal"]; state: RouteStepState }) {
  const [open, setOpen] = useState(state === "current");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<FormState | null>(null);
  const ready = solReady(fiscal);

  // Consulta a SUNAT con las credenciales guardadas sin emitir nada; el resultado queda a la vista.
  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await testCredentials(slug);
      setTestResult(res);
      if (res.ok) {
        toast.success(res.mensaje || "SUNAT aceptó las credenciales.");
      } else {
        toast.error(res.mensaje || "SUNAT rechazó las credenciales.");
      }
    } catch {
      setTestResult({ ok: false, mensaje: "No se pudo contactar a SUNAT. Inténtalo de nuevo en unos minutos." });
    } finally {
      setTesting(false);
    }
  };

  return (
    <RouteStep
      number={2}
      state={state}
      title="Usuario y clave SOL"
      actions={
        ready ? (
          <Button type="button" variant="outline" size="sm" onClick={handleTest} isLoading={testing} className="font-semibold">
            {testing ? "Consultando a SUNAT…" : "Probar conexión"}
          </Button>
        ) : null
      }
      form={
        <SolForm
          slug={slug}
          fiscal={fiscal}
          onSaved={() => {
            setOpen(false);
            setTestResult(null);
          }}
        />
      }
      formOpen={open}
      onFormOpenChange={setOpen}
      toggleLabel={fiscal.usuario_sol ? "Cambiar credenciales" : "Ingresar credenciales"}
    >
      {fiscal.usuario_sol ? (
        <p>
          Usuario <span className="font-semibold text-foreground">{fiscal.usuario_sol}</span>
          {fiscal.tiene_clave_sol ? ", clave guardada y cifrada." : ", falta la clave."}
        </p>
      ) : (
        <p>El usuario secundario que el cliente crea en SUNAT Operaciones en Línea para enviar sus comprobantes.</p>
      )}
      {testResult?.mensaje ? (
        <p role="status" className={`flex items-start gap-1.5 font-semibold ${testResult.ok ? "text-primary" : "text-destructive"}`}>
          {testResult.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />}
          {testResult.mensaje}
        </p>
      ) : null}
    </RouteStep>
  );
}

function SolForm({ slug, fiscal, onSaved }: { slug: string; fiscal: ClientDetail["fiscal"]; onSaved: () => void }) {
  const [state, formAction, pending] = useToastAction((prev, formData) => saveSolCredentials(slug, prev, formData), onSaved);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="usuario-sol" className="text-sm font-semibold">
            Usuario secundario
          </Label>
          <Input id="usuario-sol" name="usuario_sol" required defaultValue={fiscal.usuario_sol ?? ""} autoComplete="off" placeholder="Ej. MODDATOS" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clave-sol" className="text-sm font-semibold">
            Clave SOL
          </Label>
          <SecretInput
            id="clave-sol"
            name="clave_sol"
            required={!fiscal.tiene_clave_sol}
            autoComplete="new-password"
            placeholder={fiscal.tiene_clave_sol ? "Déjala vacía para conservarla" : undefined}
            revealLabel="clave"
          />
        </div>
      </div>

      <FormError state={state} />

      <Button type="submit" isLoading={pending} className="w-full sm:w-auto">
        {pending ? "Guardando credenciales…" : "Guardar credenciales"}
      </Button>
    </form>
  );
}
