"use client";

import { useMemo, useState } from "react";

import { errorMessage } from "@/app/panel/carta/queries";
import { Drawer, inputClass, Skeleton } from "@/app/panel/carta/ui";
import {
  useCreateInventoryItem,
  useInventory,
  useInventoryCatalogs,
  useInventoryCount,
  useInventoryLedger,
  useInventoryMovement,
  useUpdateInventoryItem,
} from "@/app/panel/inventario/queries";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { Badge, Button, Input } from "@/components/ui";
import type { InventoryCatalogs, InventoryStock } from "@/lib/schemas/inventario";

type Branch = { id: number; nombre: string };
type DrawerState =
  | { type: "new" }
  | { type: "edit"; item: InventoryStock }
  | { type: "movement"; item: InventoryStock }
  | { type: "count"; item: InventoryStock }
  | { type: "ledger"; item: InventoryStock }
  | null;

const CATEGORY_LABELS: Record<string, string> = {
  ALIMENTO: "Alimentos y verduras",
  BEBIDA: "Bebidas",
  LIMPIEZA: "Limpieza",
  EMPAQUE: "Empaques",
  UTENSILIO: "Utensilios",
  EQUIPO: "Equipos",
  OTRO: "Otros",
};

export function InventoryView({ branches, canAdmin, canAdjust }: { branches: Branch[]; canAdmin: boolean; canAdjust: boolean }) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? 0);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const inventory = useInventory(branchId, warehouseId);
  const catalogs = useInventoryCatalogs(branchId);
  const effectiveWarehouseId = warehouseId ?? inventory.data?.almacen_actual_id ?? null;

  const items = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    if (!term) return inventory.data?.existencias ?? [];
    return (inventory.data?.existencias ?? []).filter(({ producto }) =>
      `${producto.nombre} ${producto.codigo} ${producto.categoria}`.toLocaleLowerCase("es").includes(term),
    );
  }, [inventory.data?.existencias, search]);

  if (branches.length === 0) {
    return <Message title="Sin sucursal asignada">Asigna este usuario a una sucursal antes de usar inventario.</Message>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">Inventario</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 sm:text-base">Controla insumos, bebidas, utensilios y equipos con conteos y kardex por estación.</p>
        </div>
        {canAdmin && catalogs.data?.almacenes.length ? (
          <Button onClick={() => setDrawer({ type: "new" })}>
            <Icon name="mas" /> Nuevo artículo
          </Button>
        ) : null}
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric icon="inventario" label="Artículos" value={inventory.data?.resumen.articulos ?? 0} />
        <Metric icon="alerta" label="Stock bajo" value={inventory.data?.resumen.stock_bajo ?? 0} warning={(inventory.data?.resumen.stock_bajo ?? 0) > 0} />
        <Metric icon="cocina" label="Almacenes visibles" value={inventory.data?.resumen.almacenes ?? 0} />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(180px,0.7fr)_minmax(180px,0.7fr)_minmax(240px,1.4fr)]">
          <Field label="Sucursal">
            <select
              className={inputClass}
              value={branchId}
              onChange={(event) => { setBranchId(Number(event.target.value)); setWarehouseId(null); }}
            >
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.nombre}</option>)}
            </select>
          </Field>
          <Field label="Almacén / estación">
            <select
              className={inputClass}
              value={effectiveWarehouseId ?? ""}
              onChange={(event) => setWarehouseId(Number(event.target.value))}
              disabled={!inventory.data?.almacenes.length}
            >
              {(inventory.data?.almacenes ?? []).map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.nombre}</option>)}
            </select>
          </Field>
          <Field label="Buscar artículo">
            <div className="relative">
              <Icon name="buscar" className="absolute top-3.5 left-3.5 h-5 w-5 text-slate-400" />
              <Input className="pl-11" placeholder="Papa, detergente, copa…" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
          </Field>
        </div>
      </section>

      {inventory.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((id) => <Skeleton key={id} className="h-64" />)}</div>
      ) : inventory.isError ? (
        <Message title="No pudimos cargar el inventario" danger>{inventory.error.message}</Message>
      ) : inventory.data.almacenes.length === 0 ? (
        <Message title="Sin almacén autorizado">El administrador debe asignarte una estación de Cocina o Barra desde Equipo.</Message>
      ) : items.length === 0 ? (
        <Message title={search ? "Sin coincidencias" : "Inventario vacío"}>
          {search ? "Prueba con otro nombre o código." : canAdmin ? "Crea el primer artículo para comenzar a registrar existencias." : "El administrador aún no creó artículos inventariables."}
        </Message>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <InventoryCard
              key={item.producto.id}
              item={item}
              canAdmin={canAdmin}
              canAdjust={canAdjust}
              onAction={(type) => setDrawer({ type, item } as Exclude<DrawerState, null>)}
            />
          ))}
        </div>
      )}

      <InventoryDrawer
        state={drawer}
        onClose={() => setDrawer(null)}
        warehouseId={effectiveWarehouseId}
        catalogs={catalogs.data}
      />
    </div>
  );
}

function InventoryCard({ item, canAdmin, canAdjust, onAction }: { item: InventoryStock; canAdmin: boolean; canAdjust: boolean; onAction: (type: "edit" | "movement" | "count" | "ledger") => void }) {
  const { producto } = item;
  return (
    <article className={`rounded-3xl border bg-white p-5 shadow-xs ${item.stock_bajo ? "border-amber-300" : "border-slate-200"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="info">{CATEGORY_LABELS[producto.categoria]}</Badge>
            {item.stock_bajo ? <Badge variant="warning"><Icon name="alerta" className="h-3.5 w-3.5" /> Stock bajo</Badge> : null}
          </div>
          <h2 className="mt-3 truncate text-lg font-bold text-tinta">{producto.nombre}</h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-400">{producto.codigo}</p>
        </div>
        {canAdmin ? <Button variant="icon" aria-label={`Editar ${producto.nombre}`} onClick={() => onAction("edit")}><Icon name="editar" /></Button> : null}
      </div>

      <div className="mt-5 rounded-2xl bg-niebla p-4">
        <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Existencia actual</p>
        <p className="mt-1 text-3xl font-bold text-tinta tabular-nums">{formatNumber(item.cantidad)} <span className="text-sm text-slate-500">{producto.unidad.codigo}</span></p>
        <p className="mt-1 text-xs text-slate-500">Mínimo: <span className="font-bold tabular-nums">{formatNumber(item.stock_minimo)} {producto.unidad.codigo}</span></p>
      </div>

      {producto.naturaleza === "REUTILIZABLE" ? (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Condition label="Disponibles" value={item.estado.disponible} />
          <Condition label="Dañados" value={item.estado.danada} warning />
          <Condition label="Perdidos" value={item.estado.perdida} danger />
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {canAdjust ? <Button variant="secondary" onClick={() => onAction("movement")}>Movimiento</Button> : null}
        {canAdjust ? <Button variant="secondary" onClick={() => onAction("count")}>Conteo</Button> : null}
        <Button variant="ghost" className="col-span-2" onClick={() => onAction("ledger")}><Icon name="lista" /> Ver kardex</Button>
      </div>
    </article>
  );
}

function InventoryDrawer({ state, onClose, warehouseId, catalogs }: { state: DrawerState; onClose: () => void; warehouseId: number | null; catalogs?: InventoryCatalogs }) {
  if (!state || !warehouseId) return null;
  const title = state.type === "new" ? "Nuevo artículo" : state.type === "edit" ? "Editar artículo" : state.type === "movement" ? `Movimiento · ${state.item.producto.nombre}` : state.type === "count" ? `Conteo · ${state.item.producto.nombre}` : `Kardex · ${state.item.producto.nombre}`;
  const isForm = state.type !== "ledger";

  return (
    <Drawer
      title={title}
      open
      onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cerrar</Button>{isForm ? <Button type="submit" form="inventory-form">Guardar</Button> : null}</>}
    >
      {state.type === "new" || state.type === "edit" ? <ItemForm state={state} warehouseId={warehouseId} catalogs={catalogs} onDone={onClose} /> : null}
      {state.type === "movement" ? <MovementForm item={state.item} warehouseId={warehouseId} onDone={onClose} /> : null}
      {state.type === "count" ? <CountForm item={state.item} warehouseId={warehouseId} onDone={onClose} /> : null}
      {state.type === "ledger" ? <Ledger item={state.item} warehouseId={warehouseId} /> : null}
    </Drawer>
  );
}

function ItemForm({ state, warehouseId, catalogs, onDone }: { state: Extract<DrawerState, { type: "new" | "edit" }>; warehouseId: number; catalogs?: InventoryCatalogs; onDone: () => void }) {
  const initial = state.type === "edit" ? state.item : null;
  const create = useCreateInventoryItem();
  const update = useUpdateInventoryItem();
  const toast = useToast();
  const [name, setName] = useState(initial?.producto.nombre ?? "");
  const [code, setCode] = useState(initial?.producto.codigo ?? "");
  const [description, setDescription] = useState(initial?.producto.descripcion ?? "");
  const [category, setCategory] = useState(initial?.producto.categoria ?? "ALIMENTO");
  const [nature, setNature] = useState(initial?.producto.naturaleza ?? "CONSUMIBLE");
  const [unitId, setUnitId] = useState(initial?.producto.unidad.id ?? catalogs?.unidades[0]?.id ?? 0);
  const [minimum, setMinimum] = useState(String(initial?.stock_minimo ?? 0));
  const [failure, setFailure] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setFailure(null);
    const body = { almacen_id: warehouseId, nombre: name, codigo: code || null, descripcion: description || null, categoria_inventario: category, naturaleza_inventario: nature, unidad_medida_id: unitId, stock_minimo: Number(minimum) };
    const mutation = state.type === "edit" ? update : create;
    mutation.mutate(state.type === "edit" ? { productId: state.item.producto.id, body } : body as never, {
      onSuccess: () => { toast({ tone: "ok", message: state.type === "edit" ? "Artículo actualizado." : "Artículo creado." }); onDone(); },
      onError: (error) => setFailure(errorMessage(error)),
    });
  }

  return (
    <form id="inventory-form" className="space-y-4" onSubmit={submit}>
      <Field label="Nombre"><Input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Papa amarilla" /></Field>
      <Field label="Código" hint="Si lo dejas vacío, se generará automáticamente."><Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="INV-0001" /></Field>
      <Field label="Categoría"><select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value as InventoryStock["producto"]["categoria"])}>{(catalogs?.categorias ?? []).map((value) => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}</select></Field>
      <Field label="Tipo de control"><select className={inputClass} value={nature} onChange={(event) => setNature(event.target.value as InventoryStock["producto"]["naturaleza"])}><option value="CONSUMIBLE">Consumible · se gasta</option><option value="REUTILIZABLE">Reutilizable · se cuenta por estado</option></select></Field>
      <Field label="Unidad de medida"><select className={inputClass} value={unitId} onChange={(event) => setUnitId(Number(event.target.value))}>{(catalogs?.unidades ?? []).map((unit) => <option key={unit.id} value={unit.id}>{unit.nombre} ({unit.codigo})</option>)}</select></Field>
      <Field label="Stock mínimo"><Input required min="0" step="0.0001" type="number" value={minimum} onChange={(event) => setMinimum(event.target.value)} /></Field>
      <Field label="Descripción"><textarea className={`${inputClass} min-h-24 resize-y`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Presentación, ubicación o detalle útil…" /></Field>
      {failure ? <FormError>{failure}</FormError> : null}
      {pending ? <p className="text-sm font-semibold text-azul">Guardando…</p> : null}
    </form>
  );
}

function MovementForm({ item, warehouseId, onDone }: { item: InventoryStock; warehouseId: number; onDone: () => void }) {
  const mutation = useInventoryMovement();
  const toast = useToast();
  const [type, setType] = useState("ENTRADA");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [failure, setFailure] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault(); setFailure(null);
    mutation.mutate({ almacen_id: warehouseId, producto_id: item.producto.id, tipo: type, cantidad: Number(quantity), motivo: reason }, {
      onSuccess: () => { toast({ tone: "ok", message: "Movimiento registrado en el kardex." }); onDone(); },
      onError: (error) => setFailure(errorMessage(error)),
    });
  }

  return <form id="inventory-form" className="space-y-4" onSubmit={submit}>
    <StockSnapshot item={item} />
    <Field label="Tipo"><select className={inputClass} value={type} onChange={(event) => setType(event.target.value)}><option value="ENTRADA">Entrada</option><option value="SALIDA">Salida</option><option value="MERMA">Merma</option></select></Field>
    <Field label={`Cantidad (${item.producto.unidad.codigo})`}><Input required min="0.0001" step="0.0001" type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></Field>
    <Field label="Motivo"><textarea required className={`${inputClass} min-h-24 resize-y`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ej. Compra semanal, producción del día…" /></Field>
    {failure ? <FormError>{failure}</FormError> : null}
    {mutation.isPending ? <p className="text-sm font-semibold text-azul">Registrando…</p> : null}
  </form>;
}

function CountForm({ item, warehouseId, onDone }: { item: InventoryStock; warehouseId: number; onDone: () => void }) {
  const mutation = useInventoryCount();
  const toast = useToast();
  const reusable = item.producto.naturaleza === "REUTILIZABLE";
  const [count, setCount] = useState(String(item.cantidad));
  const [available, setAvailable] = useState(String(item.estado.disponible));
  const [damaged, setDamaged] = useState(String(item.estado.danada));
  const [lost, setLost] = useState(String(item.estado.perdida));
  const [reason, setReason] = useState("Conteo físico");
  const [failure, setFailure] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault(); setFailure(null);
    const body = reusable
      ? { cantidad_disponible: Number(available), cantidad_danada: Number(damaged), cantidad_perdida: Number(lost) }
      : { cantidad_contada: Number(count) };
    mutation.mutate({ almacen_id: warehouseId, producto_id: item.producto.id, motivo: reason, ...body }, {
      onSuccess: () => { toast({ tone: "ok", message: "Conteo guardado con su ajuste de kardex." }); onDone(); },
      onError: (error) => setFailure(errorMessage(error)),
    });
  }

  return <form id="inventory-form" className="space-y-4" onSubmit={submit}>
    <StockSnapshot item={item} />
    {reusable ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Field label="Disponibles"><Input required min="0" step="1" type="number" value={available} onChange={(event) => setAvailable(event.target.value)} /></Field><Field label="Dañados"><Input required min="0" step="1" type="number" value={damaged} onChange={(event) => setDamaged(event.target.value)} /></Field><Field label="Perdidos"><Input required min="0" step="1" type="number" value={lost} onChange={(event) => setLost(event.target.value)} /></Field></div> : <Field label={`Cantidad contada (${item.producto.unidad.codigo})`}><Input required min="0" step="0.0001" type="number" value={count} onChange={(event) => setCount(event.target.value)} /></Field>}
    <Field label="Motivo"><Input required value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
    <p className="rounded-2xl bg-celeste/10 p-4 text-sm text-azul">El sistema calculará la diferencia y registrará un ajuste; nunca reemplaza el saldo sin dejar evidencia.</p>
    {failure ? <FormError>{failure}</FormError> : null}
    {mutation.isPending ? <p className="text-sm font-semibold text-azul">Guardando conteo…</p> : null}
  </form>;
}

function Ledger({ item, warehouseId }: { item: InventoryStock; warehouseId: number }) {
  const ledger = useInventoryLedger(warehouseId, item.producto.id);
  if (ledger.isPending) return <div className="space-y-3">{[1, 2, 3].map((id) => <Skeleton key={id} className="h-28" />)}</div>;
  if (ledger.isError) return <FormError>{ledger.error.message}</FormError>;
  if (!ledger.data.movimientos.length) return <Message title="Sin movimientos">Este artículo todavía no tiene registros en este almacén.</Message>;
  return <ol className="space-y-3">{ledger.data.movimientos.map((movement) => <li key={movement.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><Badge variant={movement.tipo === "ENTRADA" ? "success" : movement.tipo === "MERMA" ? "danger" : movement.tipo === "AJUSTE" ? "info" : "warning"}>{movement.tipo}</Badge><p className="mt-2 font-bold text-tinta tabular-nums">{movement.sentido === "SALIDA" ? "−" : "+"}{formatNumber(movement.cantidad)} {item.producto.unidad.codigo}</p></div><p className="text-right text-xs text-slate-500">{formatDate(movement.creado_en)}<br />{movement.usuario?.nombre}</p></div><p className="mt-3 text-sm text-slate-600">{movement.motivo}</p><p className="mt-2 text-xs text-slate-400 tabular-nums">Saldo: {formatNumber(movement.saldo_anterior)} → {formatNumber(movement.saldo_resultante)}</p></li>)}</ol>;
}

function Metric({ icon, label, value, warning = false }: { icon: "inventario" | "alerta" | "cocina"; label: string; value: number; warning?: boolean }) {
  return <div className={`rounded-3xl border bg-white p-5 ${warning ? "border-amber-300" : "border-slate-200"}`}><div className="flex items-center gap-3"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${warning ? "bg-amber-100 text-amber-700" : "bg-celeste/10 text-azul"}`}><Icon name={icon} /></span><div><p className="text-2xl font-bold text-tinta tabular-nums">{value}</p><p className="text-xs font-semibold text-slate-500">{label}</p></div></div></div>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-bold text-tinta">{label}</span>{children}{hint ? <span className="mt-1.5 block text-xs text-slate-500">{hint}</span> : null}</label>;
}

function Condition({ label, value, warning, danger }: { label: string; value: number; warning?: boolean; danger?: boolean }) {
  return <div className={`rounded-xl px-2 py-3 ${danger ? "bg-red-50" : warning ? "bg-amber-50" : "bg-emerald-50"}`}><p className={`font-bold tabular-nums ${danger ? "text-red-700" : warning ? "text-amber-800" : "text-emerald-800"}`}>{formatNumber(value)}</p><p className="mt-0.5 text-[10px] font-semibold text-slate-500">{label}</p></div>;
}

function StockSnapshot({ item }: { item: InventoryStock }) {
  return <div className="rounded-2xl bg-niebla p-4"><p className="text-xs font-bold tracking-widest text-slate-400 uppercase">Saldo registrado</p><p className="mt-1 text-2xl font-bold text-tinta tabular-nums">{formatNumber(item.cantidad)} {item.producto.unidad.codigo}</p></div>;
}

function Message({ title, children, danger = false }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return <div className={`rounded-3xl border p-6 text-center ${danger ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}><p className={`font-bold ${danger ? "text-red-700" : "text-tinta"}`}>{title}</p><p className="mt-1 text-sm text-slate-500">{children}</p></div>;
}

function FormError({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{children}</p>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 4 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(value));
}
