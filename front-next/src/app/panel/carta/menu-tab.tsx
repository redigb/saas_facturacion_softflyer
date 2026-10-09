"use client";

import { useMemo, useState } from "react";

import { CategoryDialog } from "@/app/panel/carta/category-dialog";
import { CategoryList, type Selection } from "@/app/panel/carta/category-list";
import { usePermissions } from "@/app/panel/carta/menu-editor";
import { ProductDrawer } from "@/app/panel/carta/product-drawer";
import { ProductList } from "@/app/panel/carta/product-list";
import { useCategories, useModifierGroups, useProducts, useStations } from "@/app/panel/carta/queries";
import { primaryButton, Skeleton } from "@/app/panel/carta/ui";
import { MasterDetailLayout } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { Category, Product } from "@/lib/schemas/carta";

type DrawerState = { open: false } | { open: true; product?: Product };
type CategoryDialogState = { open: false } | { open: true; category?: Category };

export function MenuTab() {
  const can = usePermissions();
  const categories = useCategories();
  const products = useProducts();
  const stations = useStations();
  const groups = useModifierGroups();

  const [selected, setSelected] = useState<Selection | null>(null);
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<DrawerState>({ open: false });
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialogState>({ open: false });

  const sortedCategories = useMemo(
    () => [...(categories.data ?? [])].sort((a, b) => a.orden - b.orden || a.id - b.id),
    [categories.data],
  );
  const uncategorized = (products.data ?? []).filter((product) => product.categoria_id === null).length;

  // Por defecto, la primera categoría; si se borró la elegida, también.
  const current: Selection =
    selected !== null && (typeof selected !== "number" || sortedCategories.some((category) => category.id === selected))
      ? selected
      : (sortedCategories[0]?.id ?? "todas");

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    return (products.data ?? [])
      .filter((product) =>
        term
          ? product.nombre.toLocaleLowerCase("es").includes(term) || product.codigo.toLowerCase().includes(term)
          : current === "todas" || (current === "sin" ? product.categoria_id === null : product.categoria_id === current),
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [products.data, search, current]);

  if (categories.isPending || products.isPending) {
    return <LoadingState />;
  }

  if (categories.isError || products.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-bold">No pudimos cargar la carta.</p>
        <p className="mt-1 text-sm">{(categories.error ?? products.error)?.message}</p>
        <button
          type="button"
          onClick={() => {
            void categories.refetch();
            void products.refetch();
          }}
          className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-red-700 shadow-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const isEmpty = sortedCategories.length === 0 && products.data.length === 0;
  const currentCategory = typeof current === "number" ? sortedCategories.find((category) => category.id === current) : undefined;

  return (
    <>
      {isEmpty ? (
        <EmptyState onStart={() => setCategoryDialog({ open: true })} />
      ) : (
        <MasterDetailLayout
          sidebar={
            <CategoryList
              categories={sortedCategories}
              uncategorized={uncategorized}
              total={products.data.length}
              selected={current}
              onSelect={(selection) => {
                setSelected(selection);
                setSearch("");
              }}
              onCreate={() => setCategoryDialog({ open: true })}
              onEdit={(category) => setCategoryDialog({ open: true, category })}
            />
          }
          content={
            <ProductList
              title={
                search
                  ? `Resultados para “${search.trim()}”`
                  : current === "todas"
                  ? "Todos los productos"
                  : current === "sin"
                  ? "Sin categoría"
                  : (currentCategory?.nombre ?? "")
              }
              products={visible}
              stations={stations.data ?? []}
              search={search}
              onSearch={setSearch}
              onAdd={() => setDrawer({ open: true })}
              onOpen={(product) => setDrawer({ open: true, product })}
              onEditCategory={
                currentCategory && can.edit && !search
                  ? () => setCategoryDialog({ open: true, category: currentCategory })
                  : undefined
              }
            />
          }
        />
      )}

      <ProductDrawer
        key={drawer.open ? (drawer.product?.id ?? "nuevo") : "cerrado"}
        open={drawer.open}
        product={drawer.open ? drawer.product : undefined}
        defaultCategoryId={typeof current === "number" ? current : null}
        categories={sortedCategories}
        stations={stations.data ?? []}
        groups={groups.data ?? []}
        onClose={() => setDrawer({ open: false })}
      />

      <CategoryDialog
        key={categoryDialog.open ? (categoryDialog.category?.id ?? "nueva") : "cerrada"}
        open={categoryDialog.open}
        category={categoryDialog.open ? categoryDialog.category : undefined}
        stations={stations.data ?? []}
        onClose={() => setCategoryDialog({ open: false })}
        onCreated={(category) => setSelected(category.id)}
        canAddProducts={can.create}
        onAddProduct={() => setDrawer({ open: true })}
      />
    </>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  const can = usePermissions();
  const steps = [
    { title: "1. Crea una categoría", text: "Entradas, Fondos, Bebidas… como en tu carta física." },
    { title: "2. Agrega tus platos", text: "Solo nombre y precio. Los impuestos y códigos van por defecto." },
    { title: "3. Opcional: cocina y opciones", text: "Define a qué estación va cada plato y modificadores como término o salsas." },
  ];

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xs sm:p-14">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-celeste/20 via-celeste/10 to-azul/10 text-azul ring-8 ring-celeste/5">
        <Icon name="carta" className="h-10 w-10 text-azul" />
      </div>
      <h2 className="mt-6 text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Tu carta está lista para crearse</h2>
      <p className="mx-auto mt-2 max-w-lg text-slate-500">
        {can.create
          ? "En unos minutos la tienes lista. Tus mozos la descargarán en su celular para tomar pedidos sin demora."
          : "Aún no se ha cargado ningún plato en este restaurante."}
      </p>

      {can.create && (
        <>
          <ol className="mx-auto mt-10 grid max-w-3xl gap-4 text-left sm:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="group relative rounded-2xl border border-slate-200/70 bg-slate-50/50 p-5 transition-all hover:border-slate-300 hover:bg-slate-50/90 hover:shadow-2xs"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-azul to-azul-oscuro text-xs font-bold text-white shadow-2xs">
                  {index + 1}
                </div>
                <p className="mt-3.5 font-bold text-tinta">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.text}</p>
              </li>
            ))}
          </ol>
          <button type="button" onClick={onStart} className={`${primaryButton} mt-10 px-6 py-3 text-base shadow-sm`}>
            <Icon name="mas" className="h-5 w-5" />
            Crear mi primera categoría
          </button>
        </>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="lg:grid lg:grid-cols-[320px_1fr] lg:gap-8" aria-busy="true" aria-label="Cargando la carta">
      <div className="hidden space-y-2 lg:block">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-12" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="mb-4 h-10 w-64" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-16" />
        ))}
      </div>
    </div>
  );
}
