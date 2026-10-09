"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { CartLine } from "@/lib/schemas/pedidos";

/**
 * Carrito local del mozo, uno por pedido (spec 006). Vive en el dispositivo: tocar un plato
 * no espera al servidor, y si se recarga la página o se va la señal, no se pierde.
 * `pendingKey` es la Idempotency-Key del envío en curso: un reintento reusa la misma.
 */
export type Cart = { lines: CartLine[]; pendingKey: string | null };

const EMPTY: Cart = { lines: [], pendingKey: null };
const cache = new Map<string, Cart>();
const listeners = new Set<() => void>();

const storageKey = (orderId: number) => `sf-carrito-${orderId}`;

function read(orderId: number): Cart {
  const key = storageKey(orderId);
  const cached = cache.get(key);
  if (cached) return cached;

  let cart = EMPTY;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) cart = { ...EMPTY, ...(JSON.parse(raw) as Cart) };
  } catch {
    // Almacenamiento bloqueado o dato corrupto: se empieza vacío.
  }
  cache.set(key, cart);
  return cart;
}

function write(orderId: number, cart: Cart) {
  const key = storageKey(orderId);
  cache.set(key, cart);
  try {
    if (cart.lines.length === 0 && !cart.pendingKey) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(cart));
  } catch {
    // Sin almacenamiento el carrito sigue funcionando en memoria.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCart(orderId: number) {
  const cart = useSyncExternalStore(subscribe, () => read(orderId), () => EMPTY);
  const update = useCallback((change: (current: Cart) => Cart) => write(orderId, change(read(orderId))), [orderId]);

  return { cart, update };
}

/** Mismo plato con las mismas opciones y sin nota: se suma cantidad en vez de otra línea. */
export function addLine(cart: Cart, line: Omit<CartLine, "key">): Cart {
  const same = cart.lines.find(
    (current) =>
      current.producto_id === line.producto_id &&
      current.notas === line.notas &&
      current.notas === "" &&
      [...current.modificador_ids].sort().join() === [...line.modificador_ids].sort().join(),
  );

  return same
    ? { ...cart, lines: cart.lines.map((current) => (current === same ? { ...current, cantidad: current.cantidad + line.cantidad } : current)) }
    : { ...cart, lines: [...cart.lines, { ...line, key: crypto.randomUUID() }] };
}
