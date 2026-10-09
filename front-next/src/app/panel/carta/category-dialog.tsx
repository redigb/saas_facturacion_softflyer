"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { usePermissions } from "@/app/panel/carta/menu-editor";
import { errorMessage, useDeleteCategory, useSaveCategory } from "@/app/panel/carta/queries";
import { applyApiErrors, CATEGORY_COLORS, dangerButton, Drawer, Field, inputClass, primaryButton, secondaryButton } from "@/app/panel/carta/ui";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { categoryFormSchema, type Category, type CategoryFormValues, type Station } from "@/lib/schemas/carta";

type Props = {
  open: boolean;
  category?: Category;
  stations: Station[];
  onClose: () => void;
  onCreated: (category: Category) => void;
  canAddProducts: boolean;
  onAddProduct: () => void;
};

export function CategoryDialog({ open, category, stations, onClose, onCreated, canAddProducts, onAddProduct }: Props) {
  const can = usePermissions();
  const toast = useToast();
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const isNew = category === undefined;
  const [active, setActive] = useState(category?.es_activa ?? true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { register, control, handleSubmit, formState, setError, setValue } = useForm({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      nombre: category?.nombre ?? "",
      color: category?.color ?? CATEGORY_COLORS[0],
      estacion_preparacion_id: String(category?.estacion_preparacion_id ?? ""),
    } satisfies CategoryFormValues,
  });
  const color = useWatch({ control, name: "color" });

  async function submit(values: CategoryFormValues, thenAddProduct: boolean) {
    try {
      const { data } = await save.mutateAsync({
        id: category?.id,
        body: {
          nombre: values.nombre.trim(),
          color: values.color || null,
          estacion_preparacion_id: values.estacion_preparacion_id === "" ? null : Number(values.estacion_preparacion_id),
          ...(isNew ? {} : { es_activa: active }),
        },
      });

      toast({ tone: "ok", message: isNew ? `Categoría ${data.nombre} creada.` : "Cambios guardados." });
      if (isNew) onCreated(data);
      onClose();
      if (thenAddProduct) onAddProduct();
    } catch (error) {
      if (!applyApiErrors(error, setError, ["nombre", "color", "estacion_preparacion_id"])) {
        toast({ tone: "error", message: errorMessage(error) });
      }
    }
  }

  async function onDelete() {
    if (!category) return;
    try {
      await remove.mutateAsync(category.id);
      toast({ tone: "ok", message: `Categoría ${category.nombre} eliminada.` });
      onClose();
    } catch (error) {
      setConfirmDelete(false);
      toast({ tone: "error", message: errorMessage(error) });
    }
  }

  const busy = formState.isSubmitting;

  return (
    <Drawer
      title={isNew ? "Nueva categoría" : "Editar categoría"}
      open={open}
      onClose={onClose}
      footer={
        <>
          <button type="submit" form="categoria-form" disabled={busy} className={primaryButton}>
            {busy ? "Guardando…" : isNew ? "Crear" : "Guardar"}
          </button>
          {isNew && canAddProducts && (
            <button type="button" disabled={busy} onClick={handleSubmit((values) => submit(values, true))} className={secondaryButton}>
              Crear y agregar platos
            </button>
          )}
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
      <form id="categoria-form" noValidate onSubmit={handleSubmit((values) => submit(values, false))} className="space-y-5">
        <Field label="Nombre" error={formState.errors.nombre?.message}>
          {(id, describedBy) => (
            <input
              id={id}
              {...register("nombre")}
              placeholder="Ej. Entradas, Fondos, Bebidas"
              autoComplete="off"
              aria-invalid={formState.errors.nombre ? true : undefined}
              aria-describedby={describedBy}
              className={inputClass}
            />
          )}
        </Field>

        <fieldset>
          <legend className="mb-1.5 text-sm font-bold text-tinta">Color identificador</legend>
          <p className="mb-2.5 text-xs text-slate-500">Ayuda al mozo a identificar rápido la categoría en la comanda.</p>
          <div className="flex flex-wrap gap-2.5">
            {CATEGORY_COLORS.map((swatch) => {
              const isSelected = color.toUpperCase() === swatch.toUpperCase();
              return (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setValue("color", swatch, { shouldDirty: true })}
                  aria-label={`Color ${swatch}`}
                  aria-pressed={isSelected}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-95 ${
                    isSelected ? "scale-105 ring-4 ring-azul/40 ring-offset-2 shadow-xs" : "hover:scale-105"
                  }`}
                  style={{ background: swatch }}
                >
                  {isSelected && <Icon name="check" className="h-5 w-5 text-white drop-shadow-xs" />}
                </button>
              );
            })}
          </div>
        </fieldset>

        <Field label="Estación de preparación" hint="Adónde llegan los platos de esta categoría: cocina, bar…">
          {(id, describedBy) => (
            <select id={id} {...register("estacion_preparacion_id")} aria-describedby={describedBy} className={inputClass}>
              <option value="">Sin estación asignada</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.nombre}
                </option>
              ))}
            </select>
          )}
        </Field>

        {!isNew && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
            <div>
              <span className="block text-sm font-bold text-tinta">Visible en la carta</span>
              <span className="block text-xs text-slate-500">Oculta todos los platos de esta categoría para los mozos.</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              aria-label="Visible en la carta"
              onClick={() => setActive(!active)}
              className={`relative h-7.5 w-13 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azul/40 active:scale-[0.96] ${
                active ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6.5 w-6.5 rounded-full bg-white shadow-xs transition-transform duration-150 ${
                  active ? "translate-x-5.5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        )}
      </form>
    </Drawer>
  );
}
