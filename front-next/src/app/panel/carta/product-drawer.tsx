"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { usePermissions } from "@/app/panel/carta/menu-editor";
import { errorMessage, useDeleteProduct, useSaveProduct } from "@/app/panel/carta/queries";
import { applyApiErrors, dangerButton, Drawer, Field, inputClass, primaryButton, secondaryButton } from "@/app/panel/carta/ui";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { CustomSelect } from "@/components/ui";
import {
  productFormSchema,
  type Category,
  type ModifierGroup,
  type Product,
  type ProductFormValues,
  type Station,
} from "@/lib/schemas/carta";

const FIELDS = ["nombre", "precio_venta", "categoria_id", "tipo", "descripcion", "estacion_preparacion_id", "modificador_grupo_ids"] as const;

type Props = {
  open: boolean;
  product?: Product;
  defaultCategoryId: number | null;
  categories: Category[];
  stations: Station[];
  groups: ModifierGroup[];
  onClose: () => void;
};

export function ProductDrawer({ open, product, defaultCategoryId, categories, stations, groups, onClose }: Props) {
  const can = usePermissions();
  const toast = useToast();
  const save = useSaveProduct();
  const remove = useDeleteProduct();
  const isNew = product === undefined;

  const [moreOptions, setMoreOptions] = useState(
    !isNew && (product.tipo === "BEBIDA" || !!product.descripcion || product.estacion_preparacion_id !== null || product.modificador_grupo_ids.length > 0),
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      nombre: product?.nombre ?? "",
      precio_venta: product?.precio_venta ?? "",
      categoria_id: String(product ? (product.categoria_id ?? "") : (defaultCategoryId ?? "")),
      tipo: product?.tipo ?? "PLATO",
      descripcion: product?.descripcion ?? "",
      estacion_preparacion_id: String(product?.estacion_preparacion_id ?? ""),
      modificador_grupo_ids: product?.modificador_grupo_ids ?? [],
    } satisfies ProductFormValues,
  });
  const { register, control, handleSubmit, formState, setError, reset, setFocus, setValue } = form;
  const errors = formState.errors;

  const categoryId = useWatch({ control, name: "categoria_id" });
  const selectedGroups = useWatch({ control, name: "modificador_grupo_ids" });
  const estacionPreparacionId = useWatch({ control, name: "estacion_preparacion_id" });
  const categoryStation = categories.find((category) => String(category.id) === categoryId)?.estacion_preparacion_id;
  const categoryStationName = stations.find((station) => station.id === categoryStation)?.nombre;

  async function submit(values: ReturnType<typeof productFormSchema.parse>, addAnother: boolean) {
    try {
      const { data } = await save.mutateAsync({
        id: product?.id,
        body: {
          nombre: values.nombre,
          precio_venta: Number(values.precio_venta).toFixed(2),
          categoria_id: values.categoria_id === "" ? null : Number(values.categoria_id),
          tipo: values.tipo,
          descripcion: values.descripcion.trim() || null,
          estacion_preparacion_id: values.estacion_preparacion_id === "" ? null : Number(values.estacion_preparacion_id),
          modificador_grupo_ids: values.modificador_grupo_ids,
        },
      });

      toast({ tone: "ok", message: isNew ? `${data.nombre} se agregó a la carta.` : "Cambios guardados." });

      if (addAnother) {
        // Se queda en la misma categoría y tipo: cargar varios platos seguidos es rápido.
        reset({ ...values, nombre: "", precio_venta: "", descripcion: "", modificador_grupo_ids: [] });
        setFocus("nombre");
      } else {
        onClose();
      }
    } catch (error) {
      if (!applyApiErrors(error, setError, FIELDS)) {
        toast({ tone: "error", message: errorMessage(error) });
      }
    }
  }

  async function onDelete() {
    if (!product) return;
    try {
      await remove.mutateAsync(product.id);
      toast({ tone: "ok", message: `${product.nombre} se eliminó de la carta.` });
      onClose();
    } catch (error) {
      toast({ tone: "error", message: errorMessage(error) });
    }
  }

  const busy = formState.isSubmitting;

  return (
    <Drawer
      title={isNew ? "Agregar plato" : "Editar plato"}
      open={open}
      onClose={onClose}
      footer={
        <>
          <button type="submit" form="producto-form" disabled={busy} className={primaryButton}>
            {busy ? "Guardando…" : "Guardar"}
          </button>
          {isNew && (
            <button type="button" disabled={busy} onClick={handleSubmit((values) => submit(values, true))} className={secondaryButton}>
              Guardar y agregar otro
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
      <form id="producto-form" noValidate onSubmit={handleSubmit((values) => submit(values, false))} className="space-y-5">
        <Field label="Nombre" error={errors.nombre?.message}>
          {(id, describedBy) => (
            <input
              id={id}
              {...register("nombre")}
              placeholder="Ej. Lomo saltado"
              autoComplete="off"
              aria-invalid={errors.nombre ? true : undefined}
              aria-describedby={describedBy}
              className={inputClass}
            />
          )}
        </Field>

        <Field label="Precio (incluye IGV)" error={errors.precio_venta?.message}>
          {(id, describedBy) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-bold text-slate-400">S/</span>
              <input
                id={id}
                {...register("precio_venta", {
                  onBlur: (event) => {
                    const value = String(event.target.value).replace(",", ".");
                    if (/^\d+(\.\d{1,2})?$/.test(value)) setValue("precio_venta", Number(value).toFixed(2));
                  },
                })}
                inputMode="decimal"
                placeholder="0.00"
                aria-invalid={errors.precio_venta ? true : undefined}
                aria-describedby={describedBy}
                className={`${inputClass} pl-10 tabular-nums`}
              />
            </div>
          )}
        </Field>

        <Field label="Categoría">
          {(id) => (
            <CustomSelect
              id={id}
              value={categoryId ?? ""}
              onChange={(val) => setValue("categoria_id", val, { shouldDirty: true, shouldValidate: true })}
              options={[
                { value: "", label: "Sin categoría" },
                ...categories.map((category) => ({
                  value: String(category.id),
                  label: category.nombre,
                })),
              ]}
            />
          )}
        </Field>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setMoreOptions((value) => !value)}
            aria-expanded={moreOptions}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-bold text-azul transition-colors hover:bg-azul/10"
          >
            <Icon name="abajo" className={`h-4 w-4 transition-transform duration-200 ${moreOptions ? "rotate-180" : ""}`} />
            {moreOptions ? "Menos opciones" : "Más opciones (tipo, cocina, modificadores)"}
          </button>
        </div>

        {moreOptions && (
          <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4.5">
            <fieldset>
              <legend className="mb-1.5 text-sm font-bold text-tinta">Tipo de ítem</legend>
              <div className="flex gap-2">
                {(["PLATO", "BEBIDA"] as const).map((tipo) => (
                  <label key={tipo} className="flex-1 cursor-pointer">
                    <input type="radio" value={tipo} {...register("tipo")} className="peer sr-only" />
                    <span className="block rounded-xl border border-slate-200 bg-white py-2.5 text-center text-sm font-bold text-slate-600 transition-all peer-checked:border-azul peer-checked:bg-azul/5 peer-checked:text-azul peer-focus-visible:ring-4 peer-focus-visible:ring-celeste/40 active:scale-[0.99]">
                      {tipo === "PLATO" ? "Plato" : "Bebida"}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <Field label="Descripción" error={errors.descripcion?.message} hint="Opcional. Ayuda al mozo a explicar el plato.">
              {(id, describedBy) => (
                <textarea id={id} rows={2} {...register("descripcion")} aria-describedby={describedBy} className={inputClass} />
              )}
            </Field>

            <Field
              label="¿A qué estación va?"
              hint={categoryStationName ? `Si no eliges, va a ${categoryStationName} (la de su categoría).` : "Si no eliges, usa la de su categoría."}
            >
              {(id, describedBy) => (
                <CustomSelect
                  id={id}
                  aria-describedby={describedBy}
                  value={estacionPreparacionId ?? ""}
                  onChange={(val) => setValue("estacion_preparacion_id", val, { shouldDirty: true, shouldValidate: true })}
                  options={[
                    { value: "", label: "La de su categoría" },
                    ...stations.map((station) => ({
                      value: String(station.id),
                      label: station.nombre,
                      icon: "cocina" as const,
                    })),
                  ]}
                />
              )}
            </Field>

            <fieldset>
              <legend className="mb-1.5 text-sm font-bold text-tinta">Opciones para el cliente</legend>
              {groups.length === 0 ? (
                <p className="text-xs text-slate-500">Crea grupos en la pestaña Modificadores (ej. “Término de la carne”).</p>
              ) : (
                <div className="space-y-2">
                  {groups.map((group) => {
                    const checked = selectedGroups.includes(group.id);
                    return (
                      <label
                        key={group.id}
                        className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-3.5 transition-all active:scale-[0.99] ${
                          checked ? "border-azul/50 bg-azul/5" : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setValue(
                              "modificador_grupo_ids",
                              event.target.checked ? [...selectedGroups, group.id] : selectedGroups.filter((groupId) => groupId !== group.id),
                              { shouldDirty: true },
                            )
                          }
                          className="h-5 w-5 rounded-md accent-azul"
                        />
                        <span className="flex-1 text-sm font-semibold text-tinta">{group.nombre}</span>
                        <span className="text-xs font-semibold text-slate-500">{group.modificadores.length} opciones</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>
          </div>
        )}
      </form>
    </Drawer>
  );
}
