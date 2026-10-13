"use client";

import { useRef, useState } from "react";

import { useChargeOrder, usePaymentMethods } from "@/app/panel/caja/queries";
import { ReceiptTicket } from "@/app/panel/caja/receipt-ticket";
import { Drawer, Skeleton } from "@/app/panel/carta/ui";
import { useOrder } from "@/app/panel/pedidos/queries";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { Badge, Button, Input, PriceText } from "@/components/ui";
import { ApiRequestError } from "@/lib/browser-api";
import { fromCents, toCents, type ChargeResult, type CustomerDraft, type PaymentDraft, type PaymentMethod } from "@/lib/schemas/caja";
import type { Order } from "@/lib/schemas/pedidos";

/** Cobro de un pedido: elegir platos (cuenta dividida), cómo se paga y confirmar (spec 009). */
export function ChargeDrawer({ orderId, sessionId, onClose }: { orderId: number; sessionId: number; onClose: () => void }) {
  const order = useOrder(orderId);
  const methods = usePaymentMethods();

  if (order.isPending || methods.isPending) {
    return (
      <Drawer title="Cobrar cuenta" open onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}>
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-24" />
        </div>
      </Drawer>
    );
  }
  if (order.isError || methods.isError) {
    return (
      <Drawer title="Cobrar cuenta" open onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Cerrar</Button>}>
        <p className="font-bold text-red-700">No pudimos cargar la cuenta.</p>
        <p className="mt-1 text-sm text-slate-600">{(order.error ?? methods.error)?.message}</p>
      </Drawer>
    );
  }

  return <ChargeForm order={order.data} methods={methods.data} sessionId={sessionId} onClose={onClose} />;
}

type Done = { result: ChargeResult; label: string };

function ChargeForm({ order, methods, sessionId, onClose }: { order: Order; methods: PaymentMethod[]; sessionId: number; onClose: () => void }) {
  const charge = useChargeOrder(order.id, sessionId);
  const toast = useToast();
  const items = order.detalles.filter((item) => !item.anulado && !item.cobrado);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(items.map((item) => item.id)));
  const [payments, setPayments] = useState<PaymentDraft[]>(() => [blankPayment(methods)]);
  const [done, setDone] = useState<Done | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customer, setCustomer] = useState<CustomerDraft>({ tipo_documento: "DNI", numero: "", nombre: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const attempt = useRef<{ signature: string; key: string } | null>(null);

  const methodOf = (id: number) => methods.find((method) => method.id === id);
  const total = items.filter((item) => selected.has(item.id)).reduce((sum, item) => sum + toCents(item.subtotal), 0);

  // Una fila sin monto cobra "lo que falta" (como máximo una, la última).
  const explicit = payments.reduce((sum, payment) => sum + (payment.monto === "" ? 0 : toCents(payment.monto)), 0);
  const rest = Math.max(0, total - explicit);
  const amountOf = (payment: PaymentDraft) => (payment.monto === "" ? rest : toCents(payment.monto));
  const paid = payments.reduce((sum, payment) => sum + amountOf(payment), 0);
  const missing = total - paid;

  const cashErrors = payments.some((payment) => {
    const method = methodOf(payment.metodo_pago_id);
    return method?.es_efectivo && payment.monto_recibido !== "" && toCents(payment.monto_recibido) < amountOf(payment);
  });
  const valid = selected.size > 0 && total > 0 && missing === 0 && payments.every((payment) => amountOf(payment) > 0) && !cashErrors;
  const change = payments.reduce((sum, payment) => {
    const method = methodOf(payment.metodo_pago_id);
    return method?.es_efectivo && payment.monto_recibido !== "" ? sum + Math.max(0, toCents(payment.monto_recibido) - amountOf(payment)) : sum;
  }, 0);

  function patch(key: string, changes: Partial<PaymentDraft>) {
    setPayments((current) => current.map((payment) => (payment.key === key ? { ...payment, ...changes } : payment)));
  }

  function addPayment() {
    // Lo que estaba "por completar" se fija en su valor actual y la nueva fila toma el resto.
    setPayments((current) => [
      ...current.map((payment) => (payment.monto === "" ? { ...payment, monto: fromCents(amountOf(payment)) } : payment)),
      blankPayment(methods, methods.find((method) => !method.es_efectivo)?.id),
    ]);
  }

  async function submit() {
    if (!valid || charge.isPending) return;

    const body = {
      ...(selected.size < items.length ? { detalle_ids: [...selected] } : {}),
      version: order.version,
      ...(customerOpen && customer.numero.trim() !== ""
        ? { cliente: { tipo_documento: customer.tipo_documento, numero: customer.numero.trim(), ...(customer.nombre.trim() !== "" ? { nombre: customer.nombre.trim() } : {}) } }
        : {}),
      pagos: payments.map((payment) => {
        const isCash = methodOf(payment.metodo_pago_id)?.es_efectivo ?? false;
        return {
          metodo_pago_id: payment.metodo_pago_id,
          monto: fromCents(amountOf(payment)),
          ...(isCash && payment.monto_recibido !== "" ? { monto_recibido: fromCents(toCents(payment.monto_recibido)) } : {}),
          ...(!isCash && payment.referencia.trim() !== "" ? { referencia: payment.referencia.trim() } : {}),
        };
      }),
    };

    // Misma clave mientras el cuerpo no cambie: un reintento por red caída no cobra doble.
    const signature = JSON.stringify(body);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };

    setFieldErrors({});

    try {
      const { data } = await charge.mutateAsync({ body, key: attempt.current.key });
      attempt.current = null;
      setDone({ result: data, label: order.mesa ? `Mesa ${order.mesa.codigo}` : "Para llevar" });
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 422 && error.detalles) {
        // Datos del cliente inválidos: se muestran junto al campo y nada se cobró.
        const fields = Object.fromEntries(
          Object.entries(error.detalles)
            .filter(([key]) => key.startsWith("cliente."))
            .map(([key, messages]) => [key, messages[0]]),
        );
        if (Object.keys(fields).length > 0) {
          setCustomerOpen(true);
          setFieldErrors(fields);
          return;
        }
      }
      toast({ tone: "error", message: error instanceof Error ? error.message : "No se pudo cobrar." });
      if (error instanceof ApiRequestError && error.status === 409) attempt.current = null;
    }
  }

  if (done) {
    return <ChargeDone done={done} onClose={onClose} />;
  }

  return (
    <Drawer
      title={`Cobrar ${order.mesa ? `mesa ${order.mesa.codigo}` : "para llevar"} · #${order.numero}`}
      open
      onClose={onClose}
      footer={
        <>
          <Button size="lg" className="flex-1" onClick={() => void submit()} disabled={!valid} isLoading={charge.isPending}>
            Cobrar <span className="tabular-nums">S/ {fromCents(total)}</span>
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <section aria-label="Platos a cobrar">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase">Platos</h3>
            {items.length > 1 ? (
              <button
                type="button"
                className="min-h-[36px] rounded-lg px-2 text-xs font-bold text-azul hover:bg-azul/5"
                onClick={() => setSelected(selected.size === items.length ? new Set() : new Set(items.map((item) => item.id)))}
              >
                {selected.size === items.length ? "Quitar todos" : "Elegir todos"}
              </button>
            ) : null}
          </div>
          <ul className="space-y-2">
            {items.map((item) => {
              const on = selected.has(item.id);
              return (
                <li key={item.id}>
                  <label
                    className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border-2 px-3 py-2 transition-colors ${
                      on ? "border-azul/40 bg-azul/5" : "border-slate-200 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() =>
                        setSelected((current) => {
                          const next = new Set(current);
                          if (next.has(item.id)) next.delete(item.id);
                          else next.add(item.id);
                          return next;
                        })
                      }
                      className="h-5 w-5 accent-azul"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-tinta">
                        {Number(item.cantidad)}× {item.nombre ?? "Plato"}
                      </span>
                      {item.modificadores.length > 0 ? (
                        <span className="block truncate text-xs text-slate-500">{item.modificadores.map((modifier) => modifier.nombre).join(", ")}</span>
                      ) : null}
                    </span>
                    <PriceText amount={item.subtotal} size="sm" />
                  </label>
                </li>
              );
            })}
          </ul>
          {order.detalles.some((item) => item.cobrado) ? <p className="mt-2 text-xs text-slate-500">Otros platos de esta cuenta ya se cobraron.</p> : null}
        </section>

        <section aria-label="Pagos" className="space-y-3">
          <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase">Cómo paga</h3>

          {payments.map((payment) => {
            const method = methodOf(payment.metodo_pago_id);
            const amount = amountOf(payment);
            const received = payment.monto_recibido === "" ? null : toCents(payment.monto_recibido);

            return (
              <div key={payment.key} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Método de pago">
                  {methods.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={payment.metodo_pago_id === option.id}
                      onClick={() => patch(payment.key, { metodo_pago_id: option.id })}
                      className={`min-h-[44px] rounded-xl border-2 px-3 text-sm font-bold transition-all ${
                        payment.metodo_pago_id === option.id ? "border-azul bg-azul text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {option.nombre}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-500">Monto (S/)</label>
                    <Input
                      inputMode="decimal"
                      aria-label="Monto de este pago"
                      value={payment.monto === "" ? fromCents(rest) : payment.monto}
                      onChange={(event) => patch(payment.key, { monto: event.target.value.replace(",", ".") })}
                      className="font-bold tabular-nums"
                    />
                  </div>
                  {method?.es_efectivo ? (
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-500">Recibido (S/)</label>
                      <Input
                        inputMode="decimal"
                        aria-label="Efectivo recibido"
                        placeholder={fromCents(amount)}
                        value={payment.monto_recibido}
                        onChange={(event) => patch(payment.key, { monto_recibido: event.target.value.replace(",", ".") })}
                        aria-invalid={received !== null && received < amount}
                        className="font-bold tabular-nums"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-500">N.º de operación</label>
                      <Input
                        aria-label="Referencia de la operación"
                        maxLength={60}
                        value={payment.referencia}
                        onChange={(event) => patch(payment.key, { referencia: event.target.value })}
                      />
                    </div>
                  )}
                </div>

                {payments.length > 1 ? (
                  <button
                    type="button"
                    className="flex min-h-[40px] items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-red-600 hover:bg-red-50"
                    onClick={() => setPayments((current) => current.filter((item) => item.key !== payment.key))}
                  >
                    <Icon name="basura" className="h-4 w-4" />
                    Quitar este pago
                  </button>
                ) : null}
              </div>
            );
          })}

          <Button variant="secondary" onClick={addPayment} disabled={missing <= 0}>
            <Icon name="mas" className="h-4.5 w-4.5" />
            Otro método de pago
          </Button>
        </section>

        <section aria-label="Datos del cliente">
          <button
            type="button"
            aria-expanded={customerOpen}
            onClick={() => setCustomerOpen((open) => !open)}
            className="flex min-h-[44px] w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-tinta hover:border-slate-300"
          >
            <span>Datos del cliente (opcional)</span>
            <Icon name="abajo" className={`h-4 w-4 transition-transform ${customerOpen ? "rotate-180" : ""}`} />
          </button>

          {customerOpen ? (
            <div className="mt-3 space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de documento">
                {(["DNI", "RUC"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={customer.tipo_documento === option}
                    onClick={() => setCustomer({ ...customer, tipo_documento: option })}
                    className={`min-h-[44px] rounded-xl border-2 text-sm font-bold transition-all ${
                      customer.tipo_documento === option ? "border-azul bg-azul text-white" : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {option === "RUC" ? "RUC (factura)" : "DNI (boleta)"}
                  </button>
                ))}
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">N.º de {customer.tipo_documento}</label>
                <Input
                  inputMode="numeric"
                  maxLength={customer.tipo_documento === "RUC" ? 11 : 8}
                  value={customer.numero}
                  aria-invalid={fieldErrors["cliente.numero"] !== undefined}
                  onChange={(event) => setCustomer({ ...customer, numero: event.target.value.replace(/\D/g, "") })}
                  className="font-bold tabular-nums"
                />
                {fieldErrors["cliente.numero"] ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors["cliente.numero"]}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">{customer.tipo_documento === "RUC" ? "Razón social" : "Nombre (opcional)"}</label>
                <Input
                  maxLength={200}
                  value={customer.nombre}
                  aria-invalid={fieldErrors["cliente.nombre"] !== undefined}
                  onChange={(event) => setCustomer({ ...customer, nombre: event.target.value })}
                />
                {fieldErrors["cliente.nombre"] ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors["cliente.nombre"]}</p> : null}
              </div>
            </div>
          ) : null}
        </section>

        <section aria-live="polite" className="space-y-2 rounded-2xl bg-slate-50 p-4">
          <Line label="Total a cobrar" value={fromCents(total)} />
          {missing > 0 ? <Line label="Falta" value={fromCents(missing)} tone="warn" /> : null}
          {missing < 0 ? <Line label="Sobra" value={fromCents(-missing)} tone="warn" /> : null}
          {change > 0 ? <Line label="Vuelto" value={fromCents(change)} tone="ok" /> : null}
        </section>
      </div>
    </Drawer>
  );
}

function ChargeDone({ done, onClose }: { done: Done; onClose: () => void }) {
  const { result, label } = done;
  const closed = result.pedido.estado === "CERRADO";
  const [showReceipt, setShowReceipt] = useState(false);

  if (showReceipt) {
    return <ReceiptTicket receipt={result.comprobante} onClose={() => setShowReceipt(false)} />;
  }

  return (
    <Drawer
      title="Cobro registrado"
      open
      onClose={onClose}
      footer={
        <>
          <Button size="lg" className="flex-1" onClick={onClose}>
            {closed ? "Listo" : "Seguir cobrando"}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setShowReceipt(true)}>
            Ver / imprimir
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Icon name="check" className="h-8 w-8" />
        </div>
        <div>
          <p className="text-lg font-bold text-tinta">{label}</p>
          <p className="text-sm text-slate-500">{closed ? "Cuenta cobrada y mesa libre." : "Cobro parcial registrado."}</p>
        </div>
        <PriceText amount={result.venta.total} size="xl" />
        <p className="text-sm font-bold text-tinta">
          {result.comprobante.tipo === "FACTURA" ? "Factura" : "Boleta"} {result.comprobante.numero}
          {result.comprobante.es_simulado ? (
            <span className="ml-2 align-middle">
              <Badge variant="warning">Simulado</Badge>
            </span>
          ) : null}
        </p>
        {Number(result.vuelto) > 0 ? (
          <div className="rounded-2xl bg-emerald-50 px-6 py-4">
            <p className="text-xs font-bold tracking-widest text-emerald-700 uppercase">Vuelto</p>
            <p className="text-3xl font-extrabold text-emerald-800 tabular-nums">S/ {result.vuelto}</p>
          </div>
        ) : null}
        {!closed ? <Badge variant="warning">Quedan S/ {result.pedido.pendiente} por cobrar</Badge> : null}
      </div>
    </Drawer>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: "warn" | "ok" }) {
  const color = tone === "warn" ? "text-amber-700" : tone === "ok" ? "text-emerald-700" : "text-tinta";

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-slate-600">{label}</span>
      <span className={`text-lg font-extrabold tabular-nums ${color}`}>S/ {value}</span>
    </div>
  );
}

function blankPayment(methods: PaymentMethod[], methodId?: number): PaymentDraft {
  const method = methods.find((item) => item.id === methodId) ?? methods.find((item) => item.es_efectivo) ?? methods[0];

  return { key: crypto.randomUUID(), metodo_pago_id: method?.id ?? 0, monto: "", monto_recibido: "", referencia: "" };
}
