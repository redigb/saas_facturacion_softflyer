"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { errorMessage } from "@/app/panel/carta/queries";
import { applyApiErrors, Drawer, Field, Skeleton } from "@/app/panel/carta/ui";
import { useBranches, useSaveBranch } from "@/app/panel/configuracion/queries";
import { UbigeoPicker } from "@/app/panel/configuracion/ubigeo-picker";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { Badge, Button, Input } from "@/components/ui";
import { branchFormSchema, ubigeoLabel, type Branch, type BranchFormValues, type Ubigeo } from "@/lib/schemas/configuracion";

/** Sucursales del restaurante (spec 011): alta, edición, principal y activar/desactivar. */
export function BranchesTab() {
  const branches = useBranches();
  const save = useSaveBranch();
  const toast = useToast();
  const [editing, setEditing] = useState<Branch | "new" | null>(null);

  if (branches.isPending) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    );
  }
  if (branches.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-bold">No pudimos cargar tus sucursales.</p>
        <p className="mt-1 text-sm">{branches.error.message}</p>
        <Button variant="secondary" className="mt-4" onClick={() => void branches.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const { data: list, meta } = branches.data;
  const limit = meta.max_sucursales;
  const atLimit = limit !== null && meta.activas >= limit;

  async function change(branch: Branch, body: Record<string, unknown>, message: string) {
    try {
      await save.mutateAsync({ id: branch.id, body });
      toast({ tone: "ok", message });
    } catch (error) {
      toast({ tone: "error", message: errorMessage(error) });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600" aria-live="polite">
          <span className="font-bold text-tinta tabular-nums">
            {meta.activas}
            {limit !== null ? ` de ${limit}` : ""}
          </span>{" "}
          {meta.activas === 1 ? "sucursal activa" : "sucursales activas"}
          {limit !== null ? " según tu plan" : ""}
        </p>
        <Button onClick={() => setEditing("new")} disabled={atLimit} title={atLimit ? "Tu plan no permite más sucursales activas." : undefined}>
          <Icon name="mas" className="h-4.5 w-4.5" />
          Nueva sucursal
        </Button>
      </div>

      {atLimit ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Llegaste al límite de {limit} {limit === 1 ? "sucursal activa" : "sucursales activas"} de tu plan. Desactiva una o mejora tu plan para agregar otra.
        </p>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2">
        {list.map((branch) => (
          <li key={branch.id} className={`rounded-2xl border bg-white p-5 ${branch.es_activa ? "border-slate-200" : "border-dashed border-slate-300 bg-slate-50/60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className={`truncate text-lg font-bold ${branch.es_activa ? "text-tinta" : "text-slate-500"}`}>{branch.nombre}</h3>
                <p className="truncate text-sm text-slate-500">{branch.direccion ?? "Sin dirección"}</p>
                <p className="truncate text-xs text-slate-400">
                  {branch.ubigeo ? ubigeoLabel(branch.ubigeo) : "Sin distrito"} · Establecimiento{" "}
                  <span className="tabular-nums">{branch.codigo_establecimiento}</span>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {branch.es_principal ? <Badge variant="info">Principal</Badge> : null}
                {!branch.es_activa ? <Badge variant="neutral">Inactiva</Badge> : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditing(branch)}>
                <Icon name="editar" className="h-4 w-4" />
                Editar
              </Button>
              {branch.es_activa && !branch.es_principal ? (
                <Button variant="secondary" size="sm" disabled={save.isPending} onClick={() => void change(branch, { es_principal: true }, `${branch.nombre} es ahora la principal.`)}>
                  Hacer principal
                </Button>
              ) : null}
              {!branch.es_principal ? (
                <Button
                  variant={branch.es_activa ? "danger" : "secondary"}
                  size="sm"
                  disabled={save.isPending || (!branch.es_activa && atLimit)}
                  onClick={() =>
                    void change(branch, { es_activa: !branch.es_activa }, branch.es_activa ? `${branch.nombre} quedó inactiva.` : `${branch.nombre} está activa.`)
                  }
                >
                  {branch.es_activa ? "Desactivar" : "Activar"}
                </Button>
              ) : (
                <span className="self-center text-xs text-slate-400">La principal no se desactiva</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {editing !== null ? <BranchDrawer branch={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}

const FIELDS = ["nombre", "direccion", "codigo_establecimiento"] as const;

function BranchDrawer({ branch, onClose }: { branch?: Branch; onClose: () => void }) {
  const toast = useToast();
  const save = useSaveBranch();
  const isNew = branch === undefined;
  const [ubigeo, setUbigeo] = useState<Ubigeo | null>(branch?.ubigeo ?? null);

  const { register, handleSubmit, formState, setError } = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: {
      nombre: branch?.nombre ?? "",
      direccion: branch?.direccion ?? "",
      codigo_establecimiento: branch?.codigo_establecimiento ?? "",
    },
  });
  const { errors } = formState;

  async function submit(values: BranchFormValues) {
    const body: Record<string, unknown> = {
      nombre: values.nombre,
      direccion: values.direccion === "" ? null : values.direccion,
      ubigeo_id: ubigeo?.id ?? null,
    };
    if (values.codigo_establecimiento !== "") body.codigo_establecimiento = values.codigo_establecimiento;

    try {
      await save.mutateAsync({ id: branch?.id, body });
      toast({ tone: "ok", message: isNew ? "Sucursal creada." : "Cambios guardados." });
      onClose();
    } catch (error) {
      if (!applyApiErrors(error, setError, FIELDS)) {
        toast({ tone: "error", message: errorMessage(error) });
      }
    }
  }

  return (
    <Drawer
      title={isNew ? "Nueva sucursal" : `Editar ${branch.nombre}`}
      open
      onClose={onClose}
      footer={
        <Button type="submit" form="sucursal-form" isLoading={formState.isSubmitting}>
          {formState.isSubmitting ? "Guardando…" : isNew ? "Crear sucursal" : "Guardar"}
        </Button>
      }
    >
      <form id="sucursal-form" noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
        <Field label="Nombre" error={errors.nombre?.message}>
          {(id, describedBy) => <Input id={id} {...register("nombre")} placeholder="Ej. Local San Isidro" hasError={!!errors.nombre} aria-describedby={describedBy} autoComplete="off" />}
        </Field>

        <Field label="Dirección" error={errors.direccion?.message}>
          {(id, describedBy) => <Input id={id} {...register("direccion")} hasError={!!errors.direccion} aria-describedby={describedBy} autoComplete="off" />}
        </Field>

        <Field label="Distrito" hint="Escribe al menos 2 letras y elige de la lista.">
          {(id) => <UbigeoPicker id={id} value={ubigeo} onChange={setUbigeo} />}
        </Field>

        <Field
          label="Código de establecimiento"
          error={errors.codigo_establecimiento?.message}
          hint={isNew ? "Opcional: si lo dejas vacío usamos el siguiente libre. 0000 es el domicilio fiscal." : "Es el código de anexo que SUNAT asigna a cada local."}
        >
          {(id, describedBy) => (
            <Input id={id} inputMode="numeric" maxLength={4} {...register("codigo_establecimiento")} hasError={!!errors.codigo_establecimiento} aria-describedby={describedBy} className="tabular-nums" />
          )}
        </Field>
      </form>
    </Drawer>
  );
}
