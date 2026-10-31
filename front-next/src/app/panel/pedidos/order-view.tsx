"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useDeliver } from "@/app/panel/cocina/queries";
import { addLine, useCart, type Cart } from "@/app/panel/pedidos/cart-store";
import { MenuPicker, QuantityStepper } from "@/app/panel/pedidos/menu-picker";
import { useMenu, useOrder, useOrderAction, useSendToKitchen } from "@/app/panel/pedidos/queries";
import { minutesSince, useNow } from "@/app/panel/pedidos/use-now";
import { Skeleton } from "@/app/panel/carta/ui";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { Badge, Button, Input } from "@/components/ui";
import { ApiRequestError } from "@/lib/browser-api";
import type { CartLine, Menu, Order, OrderItem } from "@/lib/schemas/pedidos";

const KITCHEN = {
  PENDIENTE: { label: "En cola", variant: "neutral" },
  EN_PREPARACION: { label: "Preparando", variant: "warning" },
  LISTO: { label: "Listo", variant: "success" },
  ENTREGADO: { label: "Entregado", variant: "info" },
} as const;

export function OrderView({ orderId, canVoid, user }: { orderId: number; canVoid: boolean; user: { id: number; esJefe: boolean } }) {
  const order = useOrder(orderId);
  const menu = useMenu();
  const { cart, update } = useCart(orderId);
  const [tab, setTab] = useState<"carta" | "pedido">("carta");
  const now = useNow();
  const discard = useOrderAction(orderId);

  if (order.isPending || menu.isPending) {
    return <Skeleton className="h-[60vh]" />;
  }
  if (order.isError || menu.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-bold">No pudimos cargar el pedido.</p>
        <p className="mt-1 text-sm">{(order.error ?? menu.error)?.message}</p>
        <Link href="/panel/pedidos" className="mt-4 inline-block font-bold underline">
          Volver al salón
        </Link>
      </div>
    );
  }

  const data = order.data;
  // Spec 025: un pedido ajeno (de otro mozo) solo lo operan su dueño, el encargado o el admin.
  const ajena = data.mozo !== null && data.mozo.id !== user.id && !user.esJefe;
  const editable = data.estado === "ABIERTO" && cart.pendingKey === null && !ajena;
  const cartCount = cart.lines.reduce((sum, line) => sum + line.cantidad, 0);

  // Un pedido que se queda en cero no debe seguir existiendo (spec 020): sin platos activos
  // y con el carrito vacío se anula al salir — nunca si el pedido es ajeno (spec 025).
  function leaveSalon() {
    if (ajena) return;
    if (cart.pendingKey !== null) return;
    if (data.estado !== "ABIERTO" && data.estado !== "POR_COBRAR") return;
    const activeItems = data.detalles.filter((item) => !item.anulado).length;
    if (activeItems > 0 || cart.lines.length > 0) return;
    void discard.mutateAsync({ action: "anular" }).catch(() => {});
  }

  return (
    <div className="pb-28 md:pb-0">
      <header className="flex flex-wrap items-center gap-3">
        <Link href="/panel/pedidos" onClick={leaveSalon} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-tinta ring-1 ring-slate-200" aria-label="Volver al salón">
          <Icon name="abajo" className="h-5 w-5 rotate-90" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-tinta sm:text-2xl">
            {data.mesa ? `Mesa ${data.mesa.codigo}` : "Para llevar"} <span className="text-slate-400">· #{data.numero}</span>
          </h1>
          <p className="text-sm text-slate-500">
            {data.mozo?.nombre} · hace {minutesSince(data.abierto_en, now)} min
            {data.numero_comensales ? ` · ${data.numero_comensales} pers.` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total</p>
          <p className="text-2xl font-bold text-tinta tabular-nums">S/ {data.total}</p>
        </div>
      </header>

      {data.estado !== "ABIERTO" && (
        <p className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${data.estado === "POR_COBRAR" ? "bg-amarillo/25 text-tinta" : "bg-slate-100 text-slate-600"}`}>
          {data.estado === "POR_COBRAR" ? "Cuenta pedida: esperando cobro. Reabre el pedido si el cliente quiere algo más." : `Pedido ${data.estado.toLowerCase()}.`}
        </p>
      )}

      {ajena && (
        <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
          Este pedido lo abrió {data.mozo?.nombre ?? "otra persona"}. Solo esa persona, el encargado o el admin pueden operarlo.
        </p>
      )}

      {/* Celular: pestañas Carta / Pedido. Tablet y PC: carta y carrito lado a lado (spec 022). */}
      <div role="tablist" className="mt-4 grid grid-cols-2 gap-2 md:hidden">
        {(["carta", "pedido"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
            className={`min-h-[44px] rounded-xl text-sm font-bold ${tab === item ? "bg-azul text-white" : "bg-white text-tinta ring-1 ring-slate-200"}`}
          >
            {item === "carta" ? "Carta" : `Pedido (${data.detalles.filter((detail) => !detail.anulado).length})`}
          </button>
        ))}
      </div>

      <div className="mt-4 md:grid md:grid-cols-[1fr_340px] md:gap-5 lg:grid-cols-[1fr_400px] lg:gap-6">
        <section className={tab === "carta" ? "" : "hidden md:block"}>
          <MenuPicker menu={menu.data} disabled={!editable} onAdd={(line) => update((current) => addLine(current, line))} />
        </section>

        <aside className={`space-y-4 ${tab === "pedido" ? "" : "hidden md:block"} md:sticky md:top-24 md:self-start`}>
          <CartPanel order={data} menu={menu.data} cart={cart} update={update} readOnly={ajena} />
          <SentItems order={data} menu={menu.data} canVoid={canVoid} readOnly={ajena} />
          {!ajena && <OrderActions order={data} />}
        </aside>
      </div>

      {/* Barra fija del carrito en el celular */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
          <Button size="lg" className="w-full" onClick={() => setTab("pedido")}>
            Ver carrito · {cartCount} plato{cartCount === 1 ? "" : "s"} · S/ {cartTotal(cart.lines, menu.data)}
          </Button>
        </div>
      )}
    </div>
  );
}

function CartPanel({ order, menu, cart, update, readOnly }: { order: Order; menu: Menu; cart: Cart; update: (change: (current: Cart) => Cart) => void; readOnly: boolean }) {
  const toast = useToast();
  const send = useSendToKitchen(order.id);
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const cartCount = cart.lines.reduce((sum, line) => sum + line.cantidad, 0);

  if (cart.lines.length === 0 && !cart.pendingKey) {
    return order.estado === "ABIERTO" && !readOnly ? (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-5 text-center">
        <p className="font-bold text-tinta">Tu carrito está vacío</p>
        <p className="mt-1 text-sm text-slate-500">Toca los platos de la carta para agregarlos y envíalos al final.</p>
      </div>
    ) : null;
  }

  async function submit() {
    // La clave se guarda antes de enviar: si la red falla, el reintento usa la misma.
    const key = cart.pendingKey ?? crypto.randomUUID();
    if (!cart.pendingKey) update((current) => ({ ...current, pendingKey: key }));

    try {
      await send.mutateAsync({ lines: cart.lines, key });
      update(() => ({ lines: [], pendingKey: null }));
      setLineErrors({});
      toast({ tone: "ok", message: "Pedido enviado." });
    } catch (error) {
      const definitive = error instanceof ApiRequestError && error.status >= 400 && error.status < 500;
      // Si el servidor respondió, la clave ya no sirve; si no respondió, se conserva para reintentar.
      if (definitive) update((current) => ({ ...current, pendingKey: null }));
      if (error instanceof ApiRequestError && error.status === 422 && error.detalles) {
        const errors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(error.detalles)) {
          const index = Number(/^items\.(\d+)\./.exec(field)?.[1]);
          if (!Number.isNaN(index) && cart.lines[index]) errors[cart.lines[index].key] = messages[0];
        }
        setLineErrors(errors);
        toast({ tone: "error", message: "Revisa los platos marcados en rojo." });
      } else {
        toast({ tone: "error", message: error instanceof Error ? error.message : "No se pudo enviar." });
      }
    }
  }

  const locked = cart.pendingKey !== null || readOnly;

  return (
    <section className="rounded-2xl border-2 border-azul bg-white p-4">
      <h2 className="flex items-center justify-between font-bold text-tinta">
        Carrito
        <span className="text-sm text-slate-500 tabular-nums">
          {cartCount} {cartCount === 1 ? "plato" : "platos"} · S/ {cartTotal(cart.lines, menu)}
        </span>
      </h2>
      <p className="mt-1 text-xs text-slate-500">Revisa tu pedido y envíalo: cada estación recibirá lo suyo.</p>

      {locked && !readOnly && !send.isPending && (
        <p className="mt-3 rounded-xl bg-amarillo/25 px-3 py-2 text-sm font-semibold text-tinta" role="alert">
          No se confirmó el envío (sin conexión). Reintenta: la cocina no recibirá la tanda dos veces.
        </p>
      )}

      <ul className="mt-3 divide-y divide-slate-100">
        {cart.lines.map((line) => (
          <CartRow
            key={line.key}
            line={line}
            menu={menu}
            error={lineErrors[line.key]}
            locked={locked}
            onChange={(patch) => update((current) => ({ ...current, lines: current.lines.map((item) => (item.key === line.key ? { ...item, ...patch } : item)) }))}
            onRemove={() => update((current) => ({ ...current, lines: current.lines.filter((item) => item.key !== line.key) }))}
          />
        ))}
      </ul>

      {!readOnly && (
        <Button size="lg" className="mt-4 w-full" onClick={() => void submit()} isLoading={send.isPending} disabled={order.estado !== "ABIERTO" || cart.lines.length === 0}>
          {locked ? "Reintentar envío" : "Enviar pedido"}
        </Button>
      )}
    </section>
  );
}

function CartRow({ line, menu, error, locked, onChange, onRemove }: { line: CartLine; menu: Menu; error?: string; locked: boolean; onChange: (patch: Partial<CartLine>) => void; onRemove: () => void }) {
  const product = menu.productos.find((candidate) => candidate.id === line.producto_id);
  const options = menu.modificador_grupos.flatMap((group) => group.modificadores).filter((option) => line.modificador_ids.includes(option.id));
  // Observación por plato (spec 021): cualquier línea puede llevar nota, tenga opciones o no.
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(line.notas);

  function saveNote() {
    onChange({ notas: noteDraft.trim() });
    setEditingNote(false);
  }

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className={`font-bold ${error ? "text-red-600" : "text-tinta"}`}>{product?.nombre ?? "Plato ya no disponible"}</p>
          {product?.promocion ? (
            <p className="text-xs font-bold text-azul">{product.promocion.nombre} · S/ {product.precio_promocional}</p>
          ) : null}
          {options.length > 0 && <p className="text-xs text-slate-500">{options.map((option) => option.nombre).join(", ")}</p>}
          {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}

          {editingNote && !locked ? (
            <div className="mt-2 flex items-center gap-1.5">
              <Input
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                maxLength={200}
                placeholder="Ej. sin hielo, sin arroz"
                aria-label={`Observación para ${product?.nombre ?? "el plato"}`}
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    saveNote();
                  }
                  if (event.key === "Escape") {
                    setNoteDraft(line.notas);
                    setEditingNote(false);
                  }
                }}
              />
              <Button size="sm" onClick={saveNote}>
                Listo
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNoteDraft(line.notas);
                  setEditingNote(false);
                }}
              >
                No
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingNote(true)}
              disabled={locked}
              className={`mt-1 min-h-[32px] rounded-lg px-1 text-left text-xs font-semibold transition-colors disabled:opacity-60 ${
                line.notas ? "text-azul hover:bg-azul/5" : "text-slate-400 hover:text-azul"
              }`}
            >
              {line.notas ? `“${line.notas}” · editar` : "+ Observación"}
            </button>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove} disabled={locked} aria-label={`Quitar ${product?.nombre ?? "plato"}`}>
          <Icon name="basura" className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        {locked ? <span /> : <QuantityStepper value={line.cantidad} onChange={(cantidad) => onChange({ cantidad })} />}
        <span className="text-sm font-bold text-tinta tabular-nums">S/ {lineSubtotal(line, menu)}</span>
      </div>
    </li>
  );
}

function SentItems({ order, menu, canVoid, readOnly }: { order: Order; menu: Menu; canVoid: boolean; readOnly: boolean }) {
  if (order.detalles.length === 0) return null;
  const stations = new Map(menu.estaciones.map((station) => [station.id, station.nombre]));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="font-bold text-tinta">Enviados</h2>
      <ul className="mt-2 divide-y divide-slate-100">
        {order.detalles.map((item) => (
          <SentRow key={item.id} order={order} item={item} station={item.comanda?.estacion_preparacion_id ? stations.get(item.comanda.estacion_preparacion_id) : undefined} canVoid={canVoid} readOnly={readOnly} />
        ))}
      </ul>
    </section>
  );
}

function SentRow({ order, item, station, canVoid, readOnly }: { order: Order; item: OrderItem; station?: string; canVoid: boolean; readOnly: boolean }) {
  const toast = useToast();
  const action = useOrderAction(order.id);
  const deliver = useDeliver(order.id);
  const [voiding, setVoiding] = useState(false);
  const [reason, setReason] = useState("");
  const state = KITCHEN[item.estado_cocina];

  async function confirmVoid() {
    if (!reason.trim()) return;
    try {
      await action.mutateAsync({ action: `detalles/${item.id}/anular`, body: { motivo: reason.trim() } });
      setVoiding(false);
      toast({ tone: "ok", message: `${item.nombre} anulado.` });
    } catch (error) {
      toast({ tone: "error", message: error instanceof Error ? error.message : "No se pudo anular." });
    }
  }

  return (
    <li className={`py-3 ${item.anulado ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <span className="w-8 shrink-0 text-right font-bold text-tinta tabular-nums">{Number(item.cantidad)}×</span>
        <div className="min-w-0 flex-1">
          <p className={`font-semibold text-tinta ${item.anulado ? "line-through" : ""}`}>{item.nombre}</p>
          {item.modificadores.length > 0 && <p className="text-xs text-slate-500">{item.modificadores.map((option) => option.nombre).join(", ")}</p>}
          {item.notas && <p className="text-xs font-semibold text-azul">“{item.notas}”</p>}
          {item.promocion ? <p className="text-xs font-semibold text-emerald-700">{item.promocion} · ahorro S/ {item.descuento}</p> : null}
          <p className="text-xs text-slate-400">{station ?? "General"} · comanda {item.comanda?.numero}</p>
          {item.anulado && <p className="text-xs font-semibold text-red-600">Anulado por {item.anulado.por}: {item.anulado.motivo}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-bold text-tinta tabular-nums">S/ {item.subtotal}</span>
          {!item.anulado && <Badge variant={state.variant}>{state.label}</Badge>}
        </div>
      </div>
      {/* Plato listo en cocina: el mozo lo recoge y lo marca entregado (spec 007). */}
      {!readOnly && !item.anulado && item.estado_cocina === "LISTO" && (
        <Button
          size="lg"
          className="mt-2 ml-11 w-[calc(100%-2.75rem)] bg-emerald-600 hover:bg-emerald-700"
          onClick={() =>
            deliver.mutate(item.id, {
              onError: (error) => toast({ tone: "error", message: error instanceof Error ? error.message : "No se pudo marcar." }),
            })
          }
          isLoading={deliver.isPending}
        >
          <Icon name="check" className="h-5 w-5" />
          Entregado
        </Button>
      )}
      {canVoid && !readOnly && !item.anulado && order.estado !== "CERRADO" && (
        voiding ? (
          <div className="mt-2 flex gap-2">
            <Input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} placeholder="Motivo de la anulación" aria-label="Motivo de la anulación" autoFocus />
            <Button variant="danger" onClick={() => void confirmVoid()} disabled={!reason.trim()} isLoading={action.isPending}>
              Anular
            </Button>
            <Button variant="ghost" onClick={() => setVoiding(false)}>
              No
            </Button>
          </div>
        ) : (
          <button type="button" onClick={() => setVoiding(true)} className="mt-1 ml-11 min-h-[36px] text-xs font-bold text-red-600">
            Anular plato
          </button>
        )
      )}
    </li>
  );
}

function OrderActions({ order }: { order: Order }) {
  const router = useRouter();
  const toast = useToast();
  const action = useOrderAction(order.id);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const hasActiveItems = order.detalles.some((item) => !item.anulado);

  async function run(name: "cuenta" | "reabrir" | "anular", message: string) {
    try {
      await action.mutateAsync({ action: name });
      toast({ tone: "ok", message });
      if (name === "anular") router.push("/panel/pedidos");
    } catch (error) {
      toast({ tone: "error", message: error instanceof Error ? error.message : "No se pudo completar." });
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {order.estado === "ABIERTO" && hasActiveItems && (
        <Button variant="secondary" size="lg" className="flex-1" onClick={() => void run("cuenta", "Cuenta pedida.")} isLoading={action.isPending}>
          Pedir cuenta
        </Button>
      )}
      {order.estado === "POR_COBRAR" && (
        <Button variant="secondary" size="lg" className="flex-1" onClick={() => void run("reabrir", "Pedido reabierto.")} isLoading={action.isPending}>
          Reabrir
        </Button>
      )}
      {(order.estado === "ABIERTO" || order.estado === "POR_COBRAR") && !hasActiveItems && (
        confirmCancel ? (
          <span className="flex items-center gap-2">
            <Button variant="danger" onClick={() => void run("anular", "Pedido anulado.")} isLoading={action.isPending}>
              Sí, anular pedido
            </Button>
            <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
              No
            </Button>
          </span>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmCancel(true)} className="text-red-600">
            Anular pedido
          </Button>
        )
      )}
    </div>
  );
}

function cartTotal(lines: CartLine[], menu: Menu): string {
  const options = new Map(menu.modificador_grupos.flatMap((group) => group.modificadores).map((option) => [option.id, Number(option.precio_adicional)]));
  const prices = new Map(menu.productos.map((product) => [product.id, Number(product.precio_promocional ?? product.precio_venta)]));
  const total = lines.reduce(
    (sum, line) => sum + line.cantidad * ((prices.get(line.producto_id) ?? 0) + line.modificador_ids.reduce((extra, id) => extra + (options.get(id) ?? 0), 0)),
    0,
  );
  return total.toFixed(2);
}

/** Subtotal de una línea del carrito: cantidad × (precio promocional o de lista + adicionales) — specs 022 y 039. */
function lineSubtotal(line: CartLine, menu: Menu): string {
  const product = menu.productos.find((item) => item.id === line.producto_id);
  const productPrice = Number(product?.precio_promocional ?? product?.precio_venta ?? 0);
  const extras = menu.modificador_grupos
    .flatMap((group) => group.modificadores)
    .filter((option) => line.modificador_ids.includes(option.id))
    .reduce((sum, option) => sum + Number(option.precio_adicional), 0);
  return (line.cantidad * (productPrice + extras)).toFixed(2);
}
