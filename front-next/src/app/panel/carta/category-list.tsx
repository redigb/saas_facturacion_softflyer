"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { usePermissions } from "@/app/panel/carta/menu-editor";
import { useReorderCategories } from "@/app/panel/carta/queries";
import { Icon } from "@/components/icons";
import type { Category } from "@/lib/schemas/carta";

export type Selection = number | "todas" | "sin";

type Props = {
  categories: Category[];
  uncategorized: number;
  total: number;
  selected: Selection;
  onSelect: (selection: Selection) => void;
  onCreate: () => void;
  onEdit: (category: Category) => void;
};

export function CategoryList(props: Props) {
  return (
    <>
      <MobileChips {...props} />
      <DesktopList {...props} />
    </>
  );
}

/** Celular y tablet: barra horizontal deslizable. */
function MobileChips({ categories, uncategorized, total, selected, onSelect, onCreate }: Props) {
  const can = usePermissions();
  const chip = (active: boolean) =>
    `shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-all ${
      active
        ? "bg-azul text-white shadow-xs"
        : "border border-slate-200 bg-white text-tinta hover:border-slate-300 active:bg-slate-50"
    }`;

  return (
    <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden">
      {categories.map((category) => (
        <button key={category.id} type="button" onClick={() => onSelect(category.id)} className={chip(selected === category.id)}>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: category.color ?? "#CBD5E1" }} />
            {category.nombre}
          </span>
        </button>
      ))}
      {uncategorized > 0 && (
        <button type="button" onClick={() => onSelect("sin")} className={chip(selected === "sin")}>
          Sin categoría
        </button>
      )}
      <button type="button" onClick={() => onSelect("todas")} className={chip(selected === "todas")}>
        Todos ({total})
      </button>
      {can.create && (
        <button
          type="button"
          onClick={onCreate}
          className="shrink-0 rounded-full border border-dashed border-azul/40 bg-azul/5 px-4 py-2 text-sm font-bold text-azul transition-colors hover:bg-azul/10"
        >
          + Categoría
        </button>
      )}
    </div>
  );
}

/** Escritorio: lista vertical que se ordena arrastrando (también con teclado). */
function DesktopList({ categories, uncategorized, total, selected, onSelect, onCreate, onEdit }: Props) {
  const can = usePermissions();
  const reorder = useReorderCategories();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = categories.map((category) => category.id);
    reorder.mutate(arrayMove(ids, ids.indexOf(Number(active.id)), ids.indexOf(Number(over.id))));
  }

  return (
    <aside className="hidden self-start rounded-3xl border border-slate-200/90 bg-white p-4.5 shadow-xs lg:sticky lg:top-24 lg:block">
      <div className="flex items-center justify-between px-1.5 pt-1 pb-3.5">
        <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Categorías</p>
        {can.create && (
          <button
            type="button"
            onClick={onCreate}
            className="flex items-center gap-1.5 rounded-xl bg-azul/10 px-3 py-1.5 text-xs font-bold text-azul transition-all hover:bg-azul/15 active:scale-95"
          >
            <Icon name="mas" className="h-3.5 w-3.5" />
            Nueva
          </button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={categories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1.5">
            {categories.map((category) => (
              <SortableCategory
                key={category.id}
                category={category}
                active={selected === category.id}
                draggable={can.edit}
                onSelect={() => onSelect(category.id)}
                onEdit={can.edit ? () => onEdit(category) : undefined}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-3">
        {uncategorized > 0 && <PlainItem label="Sin categoría" count={uncategorized} active={selected === "sin"} onClick={() => onSelect("sin")} />}
        <PlainItem label="Todos los productos" count={total} active={selected === "todas"} onClick={() => onSelect("todas")} />
      </div>

      {can.edit && categories.length > 1 && (
        <p className="px-2 pt-3.5 text-xs text-slate-400">
          Arrastra para ordenar cómo se ven en la carta.
        </p>
      )}
    </aside>
  );
}

function SortableCategory({
  category,
  active,
  draggable,
  onSelect,
  onEdit,
}: {
  category: Category;
  active: boolean;
  draggable: boolean;
  onSelect: () => void;
  onEdit?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: category.id, disabled: !draggable });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-1 rounded-2xl transition-all ${
        isDragging ? "z-10 bg-white shadow-xl ring-2 ring-celeste" : ""
      } ${active ? "bg-azul text-white shadow-xs" : "text-tinta hover:bg-slate-50"}`}
    >
      {draggable && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Mover ${category.nombre}`}
          className={`cursor-grab touch-none rounded-xl py-3 pl-2.5 active:cursor-grabbing ${
            active ? "text-white/70 hover:text-white" : "text-slate-300 opacity-60 group-hover:opacity-100 hover:text-slate-600"
          }`}
        >
          <Icon name="arrastrar" className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onSelect}
        className={`flex min-w-0 flex-1 items-center gap-3 py-3 text-left text-sm font-semibold ${draggable ? "" : "pl-3.5"}`}
      >
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white/70 shadow-2xs"
          style={{ background: category.color ?? "#CBD5E1" }}
        />
        <span className={`truncate text-[15px] font-bold ${category.es_activa ? "" : "line-through opacity-60"}`}>{category.nombre}</span>
        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${
            active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {category.productos_count}
        </span>
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${category.nombre}`}
          className={`rounded-xl p-2.5 transition-all group-hover:opacity-100 focus:opacity-100 ${
            active ? "text-white/80 hover:text-white" : "text-slate-400 opacity-0 hover:bg-slate-200/60 hover:text-slate-700"
          }`}
        >
          <Icon name="editar" className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

function PlainItem({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center rounded-2xl px-3.5 py-2.5 text-left text-sm font-semibold transition-colors ${
        active ? "bg-azul text-white shadow-xs" : "text-slate-600 hover:bg-slate-50 hover:text-tinta"
      }`}
    >
      <span className="text-[14px] font-semibold">{label}</span>
      <span
        className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
