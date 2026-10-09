"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { usePermissions } from "@/app/panel/carta/menu-editor";
import { errorMessage, useDeleteModifierGroup, useModifierGroups, useSaveModifierGroup } from "@/app/panel/carta/queries";
import { applyApiErrors, dangerButton, Drawer, Field, inputClass, primaryButton, secondaryButton, Skeleton } from "@/app/panel/carta/ui";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { formatPrice, modifierGroupFormSchema, type ModifierGroup, type ModifierGroupFormValues } from "@/lib/schemas/carta";

type DrawerState = { open: false } | { open: true; group?: ModifierGroup };

/** Modificadores: opciones que el cliente elige al pedir ("término de la carne", "extras"). */
export function ModifiersTab() {
  const can = usePermissions();
  const groups = useModifierGroups();
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-slate-600">
          Opciones que el mozo pregunta al tomar el pedido. Ej. “Término de la carne” (elige 1) o “Extras” (hasta 3, con precio).
        </p>
        {can.create && (
          <button type="button" onClick={() => setDrawer({ open: true })} className={primaryButton}>
            <Icon name="mas" className="h-4 w-4" />
            Nuevo grupo
          </button>
        )}
      </div>

      <div className="mt-5">
        {groups.isPending ? (
          <Skeleton className="h-40" />
        ) : groups.data?.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-8 text-center text-slate-500">
            Todavía no hay grupos de opciones.
          </p>
        ) : (
          <ul className="grid gap-3.5 sm:grid-cols-2">
            {groups.data?.map((group) => {
              const isMandatory = group.seleccion_minima > 0;
              return (
                <li key={group.id}>
                  <button
                    type="button"
                    disabled={!can.edit}
                    onClick={() => setDrawer({ open: true, group })}
                    className="h-full w-full rounded-2xl border border-slate-200/80 bg-white p-4.5 text-left shadow-2xs transition-all enabled:hover:border-azul/50 enabled:hover:shadow-xs disabled:cursor-default"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="block font-bold text-tinta text-[15px]">{group.nombre}</span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          isMandatory ? "bg-amber-100/90 text-amber-800" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {selectionLabel(group)}
                      </span>
                    </div>

                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {group.modificadores.map((modifier) => (
                        <span
                          key={modifier.id}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            modifier.es_activo
                              ? "bg-slate-100/80 text-tinta"
                              : "bg-slate-100/40 text-slate-400 line-through"
                          }`}
                        >
                          <span>{modifier.nombre}</span>
                          {Number(modifier.precio_adicional) > 0 && (
                            <span className="font-bold text-azul tabular-nums">+{formatPrice(modifier.precio_adicional)}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <GroupDrawer
        key={drawer.open ? (drawer.group?.id ?? "nuevo") : "cerrado"}
        open={drawer.open}
        group={drawer.open ? drawer.group : undefined}
        onClose={() => setDrawer({ open: false })}
      />
    </div>
  );
}

function selectionLabel(group: ModifierGroup): string {
  const { seleccion_minima: min, seleccion_maxima: max } = group;
  if (min === max) return `${min === 0 ? "Opcional" : "Obligatorio"}: elige ${max}`;
  return `${min === 0 ? "Opcional" : `Mínimo ${min}`} · hasta ${max}`;
}

function GroupDrawer({ open, group, onClose }: { open: boolean; group?: ModifierGroup; onClose: () => void }) {
  const can = usePermissions();
  const toast = useToast();
  const save = useSaveModifierGroup();
  const remove = useDeleteModifierGroup();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isNew = group === undefined;

  const { register, control, handleSubmit, formState, setError } = useForm({
    resolver: zodResolver(modifierGroupFormSchema),
    defaultValues: {
      nombre: group?.nombre ?? "",
      seleccion_minima: group?.seleccion_minima ?? 0,
      seleccion_maxima: group?.seleccion_maxima ?? 1,
      modificadores: group?.modificadores.map((modifier) => ({ id: modifier.id, nombre: modifier.nombre, precio_adicional: modifier.precio_adicional })) ?? [
        { nombre: "", precio_adicional: "" },
      ],
    } satisfies ModifierGroupFormValues,
  });
  const options = useFieldArray({ control, name: "modificadores" });
  const errors = formState.errors;

  async function submit(values: ReturnType<typeof modifierGroupFormSchema.parse>) {
    try {
      await save.mutateAsync({ id: group?.id, body: values });
      toast({ tone: "ok", message: isNew ? `Grupo ${values.nombre} creado.` : "Cambios guardados." });
      onClose();
    } catch (error) {
      if (!applyApiErrors(error, setError, ["nombre", "seleccion_minima", "seleccion_maxima", "modificadores"])) {
        toast({ tone: "error", message: errorMessage(error) });
      }
    }
  }

  async function onDelete() {
    if (!group) return;
    try {
      await remove.mutateAsync(group.id);
      toast({ tone: "ok", message: `Grupo ${group.nombre} eliminado.` });
      onClose();
    } catch (error) {
      setConfirmDelete(false);
      toast({ tone: "error", message: errorMessage(error) });
    }
  }

  return (
    <Drawer
      title={isNew ? "Nuevo grupo de opciones" : "Editar grupo"}
      open={open}
      onClose={onClose}
      footer={
        <>
          <button type="submit" form="grupo-form" disabled={formState.isSubmitting} className={primaryButton}>
            {formState.isSubmitting ? "Guardando…" : "Guardar"}
          </button>
          {!isNew && can.delete && (
            <div className="ml-auto">
              {confirmDelete ? (
                <span className="flex items-center gap-1">
                  <button type="button" onClick={onDelete} disabled={remove.isPending} className={`${dangerButton} bg-red-50`}>
                    Sí, eliminar
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="px-2 text-sm font-semibold text-slate-500">
                    No
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className={dangerButton}>
                  <Icon name="basura" className="h-4 w-4" />
                  Eliminar
                </button>
              )}
            </div>
          )}
        </>
      }
    >
      <form id="grupo-form" noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
        <Field label="Nombre del grupo" error={errors.nombre?.message}>
          {(id, describedBy) => (
            <input id={id} {...register("nombre")} placeholder="Ej. Término de la carne" aria-invalid={errors.nombre ? true : undefined} aria-describedby={describedBy} className={inputClass} />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Mínimo a elegir" error={errors.seleccion_minima?.message} hint="0 = opcional">
            {(id, describedBy) => (
              <input id={id} type="number" min={0} {...register("seleccion_minima")} aria-describedby={describedBy} className={inputClass} />
            )}
          </Field>
          <Field label="Máximo a elegir" error={errors.seleccion_maxima?.message}>
            {(id, describedBy) => (
              <input id={id} type="number" min={1} {...register("seleccion_maxima")} aria-describedby={describedBy} className={inputClass} />
            )}
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-bold text-tinta">Opciones</legend>
          {errors.modificadores?.root?.message || errors.modificadores?.message ? (
            <p className="mb-2 text-sm font-semibold text-red-600">{errors.modificadores.root?.message ?? errors.modificadores.message}</p>
          ) : null}
          <ul className="space-y-2">
            {options.fields.map((field, index) => (
              <li key={field.id} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <input
                    {...register(`modificadores.${index}.nombre`)}
                    placeholder="Ej. Jugoso"
                    aria-label={`Nombre de la opción ${index + 1}`}
                    aria-invalid={errors.modificadores?.[index]?.nombre ? true : undefined}
                    className={inputClass}
                  />
                  {errors.modificadores?.[index]?.nombre && (
                    <p className="mt-1 text-xs font-semibold text-red-600">{errors.modificadores[index]?.nombre?.message}</p>
                  )}
                </div>
                <div className="relative w-28 shrink-0">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-bold text-slate-400">+S/</span>
                  <input
                    {...register(`modificadores.${index}.precio_adicional`)}
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-label={`Precio adicional de la opción ${index + 1}`}
                    className={`${inputClass} pl-11 tabular-nums`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => options.remove(index)}
                  disabled={options.fields.length === 1}
                  aria-label={`Quitar la opción ${index + 1}`}
                  className="rounded-lg p-3 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                >
                  <Icon name="cerrar" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => options.append({ nombre: "", precio_adicional: "" })} className={`${secondaryButton} mt-3`}>
            <Icon name="mas" className="h-4 w-4" />
            Agregar opción
          </button>
        </fieldset>
      </form>
    </Drawer>
  );
}
