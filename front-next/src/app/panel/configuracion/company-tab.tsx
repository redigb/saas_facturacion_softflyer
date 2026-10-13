"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { errorMessage } from "@/app/panel/carta/queries";
import { applyApiErrors, Field, Skeleton } from "@/app/panel/carta/ui";
import { useCompany, useSaveCompany } from "@/app/panel/configuracion/queries";
import { UbigeoPicker } from "@/app/panel/configuracion/ubigeo-picker";
import { useToast } from "@/app/panel/providers";
import { Badge, Button, Input } from "@/components/ui";
import { ApiRequestError } from "@/lib/browser-api";
import { companyFormSchema, type Company, type CompanyFormValues, type Ubigeo } from "@/lib/schemas/configuracion";

const FIELDS = ["ruc", "razon_social", "nombre_comercial", "direccion_fiscal", "ubigeo_id"] as const;

/** Datos fiscales de la empresa (spec 011). El certificado y la clave SOL llegan con la facturación real. */
export function CompanyTab() {
  const company = useCompany();

  if (company.isPending) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }
  if (company.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-bold">No pudimos cargar los datos de tu empresa.</p>
        <p className="mt-1 text-sm">{company.error.message}</p>
        <Button variant="secondary" className="mt-4" onClick={() => void company.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  // Al cambiar los datos guardados el formulario se monta de nuevo y arranca sin cambios pendientes.
  return <CompanyForm key={JSON.stringify(company.data)} company={company.data} />;
}

function CompanyForm({ company }: { company: Company }) {
  const toast = useToast();
  const save = useSaveCompany();
  const [ubigeo, setUbigeo] = useState<Ubigeo | null>(company.ubigeo);

  const { register, handleSubmit, formState, setError } = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: values(company),
  });
  const { errors } = formState;
  const dirty = formState.isDirty || (ubigeo?.id ?? null) !== (company.ubigeo?.id ?? null);

  async function submit(form: CompanyFormValues) {
    try {
      await save.mutateAsync({
        ruc: form.ruc,
        razon_social: form.razon_social,
        nombre_comercial: form.nombre_comercial,
        direccion_fiscal: form.direccion_fiscal === "" ? null : form.direccion_fiscal,
        ubigeo_id: ubigeo?.id ?? null,
      });
      toast({ tone: "ok", message: "Cambios guardados." });
    } catch (error) {
      if (error instanceof ApiRequestError && error.codigo === "RUC_CON_COMPROBANTES") {
        setError("ruc", { message: error.message }, { shouldFocus: true });
      } else if (!applyApiErrors(error, setError, FIELDS.filter((field) => field !== "ubigeo_id"))) {
        toast({ tone: "error", message: errorMessage(error) });
      }
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit(submit)} className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-tinta">Datos fiscales</h2>
        {company.homologado ? <Badge variant="success">Homologado en SUNAT</Badge> : <Badge variant="neutral">Facturación electrónica: próximamente</Badge>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="RUC" error={errors.ruc?.message} hint="11 dígitos. Lo verificamos con SUNAT al activar la facturación.">
          {(id, describedBy) => (
            <Input id={id} inputMode="numeric" maxLength={11} {...register("ruc")} hasError={!!errors.ruc} aria-describedby={describedBy} className="tabular-nums" />
          )}
        </Field>

        <Field label="Razón social" error={errors.razon_social?.message}>
          {(id, describedBy) => <Input id={id} {...register("razon_social")} hasError={!!errors.razon_social} aria-describedby={describedBy} autoComplete="organization" />}
        </Field>
      </div>

      <Field label="Nombre comercial" error={errors.nombre_comercial?.message} hint="El nombre con el que te conocen tus clientes.">
        {(id, describedBy) => <Input id={id} {...register("nombre_comercial")} hasError={!!errors.nombre_comercial} aria-describedby={describedBy} />}
      </Field>

      <Field label="Dirección fiscal" error={errors.direccion_fiscal?.message} hint="Aparece en tus comprobantes.">
        {(id, describedBy) => <Input id={id} {...register("direccion_fiscal")} hasError={!!errors.direccion_fiscal} aria-describedby={describedBy} autoComplete="street-address" />}
      </Field>

      <Field label="Distrito" hint="Escribe al menos 2 letras y elige de la lista.">
        {(id) => <UbigeoPicker id={id} value={ubigeo} onChange={setUbigeo} />}
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" isLoading={formState.isSubmitting} disabled={!dirty}>
          {formState.isSubmitting ? "Guardando…" : "Guardar cambios"}
        </Button>
        {dirty && !formState.isSubmitting ? <span className="text-xs font-semibold text-slate-500">Tienes cambios sin guardar</span> : null}
      </div>
    </form>
  );
}

function values(company: Company): CompanyFormValues {
  return {
    ruc: company.ruc ?? "",
    razon_social: company.razon_social ?? "",
    nombre_comercial: company.nombre_comercial,
    direccion_fiscal: company.direccion_fiscal ?? "",
  };
}
