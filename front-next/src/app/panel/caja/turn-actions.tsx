"use client";

import { useState } from "react";

import { useCashMovement, useCloseCash } from "@/app/panel/caja/queries";
import { Drawer } from "@/app/panel/carta/ui";
import { useToast } from "@/app/panel/providers";
import { Icon } from "@/components/icons";
import { Button, Input, PriceText } from "@/components/ui";
import type { CashSession } from "@/lib/schemas/caja";
import { fromCents, toCents } from "@/lib/schemas/caja";

/** Movimiento manual y cierre con arqueo (spec 009). */
export function TurnActions({
  session,
  expectedCash,
  onClosed,
}: {
  session: CashSession;
  expectedCash: string | null;
  onClosed: (session: CashSession) => void;
}) {
  const [panel, setPanel] = useState<"movimiento" | "cierre" | null>(null);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setPanel("movimiento")}>
          <Icon name="mas" className="h-4.5 w-4.5" />
          Ingreso / egreso
        </Button>
        <Button variant="primary" onClick={() => setPanel("cierre")}>
          Cerrar caja
        </Button>
      </div>

      {panel === "movimiento" ? <MovementDrawer sessionId={session.id} onClose={() => setPanel(null)} /> : null}
      {panel === "cierre" ? (
        <CloseDrawer
          sessionId={session.id}
          expectedCash={expectedCash}
          onClose={() => setPanel(null)}
          onClosed={(closed) => {
            setPanel(null);
            onClosed(closed);
          }}
        />
      ) : null}
    </>
  );
}

function MovementDrawer({ sessionId, onClose }: { sessionId: number; onClose: () => void }) {
  const movement = useCashMovement(sessionId);
  const toast = useToast();
  const [type, setType] = useState<"INGRESO" | "EGRESO">("EGRESO");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const valid = Number(amount) > 0 && concept.trim() !== "";

  async function submit() {
    if (!valid || movement.isPending) return;

    try {
      await movement.mutateAsync({ tipo: type, monto: Number(amount).toFixed(2), concepto: concept.trim() });
      toast({ tone: "ok", message: type === "INGRESO" ? "Ingreso registrado." : "Egreso registrado." });
      onClose();
    } catch (error) {
      toast({ tone: "error", message: error instanceof Error ? error.message : "No se pudo registrar el movimiento." });
    }
  }

  return (
    <Drawer
      title="Movimiento de caja"
      open
      onClose={onClose}
      footer={
        <>
          <Button onClick={() => void submit()} disabled={!valid} isLoading={movement.isPending}>
            Registrar
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div role="radiogroup" aria-label="Tipo de movimiento" className="grid grid-cols-2 gap-2">
          {(["EGRESO", "INGRESO"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={type === option}
              onClick={() => setType(option)}
              className={`min-h-[48px] rounded-xl border-2 text-sm font-bold transition-all ${
                type === option ? "border-azul bg-azul/5 text-azul" : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {option === "EGRESO" ? "Sale dinero" : "Entra dinero"}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="mov-monto" className="mb-1.5 block text-sm font-bold text-tinta">
            Monto (S/)
          </label>
          <Input id="mov-monto" inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value.replace(",", "."))} className="text-xl font-bold tabular-nums" />
        </div>

        <div>
          <label htmlFor="mov-concepto" className="mb-1.5 block text-sm font-bold text-tinta">
            Concepto
          </label>
          <Input id="mov-concepto" maxLength={120} placeholder="Ej. Compra de gas" value={concept} onChange={(event) => setConcept(event.target.value)} />
        </div>
      </div>
    </Drawer>
  );
}

function CloseDrawer({
  sessionId,
  expectedCash,
  onClose,
  onClosed,
}: {
  sessionId: number;
  expectedCash: string | null;
  onClose: () => void;
  onClosed: (session: CashSession) => void;
}) {
  const close = useCloseCash(sessionId);
  const toast = useToast();
  const [counted, setCounted] = useState("");
  const valid = counted.trim() !== "" && Number(counted) >= 0 && !Number.isNaN(Number(counted));
  const difference = valid && expectedCash !== null ? toCents(counted) - toCents(expectedCash) : null;

  async function submit() {
    if (!valid || close.isPending) return;

    try {
      const { data } = await close.mutateAsync(Number(counted).toFixed(2));
      onClosed(data);
    } catch (error) {
      toast({ tone: "error", message: error instanceof Error ? error.message : "No se pudo cerrar la caja." });
    }
  }

  return (
    <Drawer
      title="Cerrar caja"
      open
      onClose={onClose}
      footer={
        <>
          <Button onClick={() => void submit()} disabled={!valid} isLoading={close.isPending}>
            Cerrar caja
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Seguir cobrando
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-slate-600">Cuenta el efectivo que hay en la caja e ingrésalo. El sistema lo compara con lo esperado.</p>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-xs font-semibold text-slate-500">Efectivo esperado</p>
          <PriceText amount={expectedCash} size="xl" />
        </div>

        <div>
          <label htmlFor="contado" className="mb-1.5 block text-sm font-bold text-tinta">
            Efectivo contado (S/)
          </label>
          <Input id="contado" inputMode="decimal" autoFocus placeholder="0.00" value={counted} onChange={(event) => setCounted(event.target.value.replace(",", "."))} className="text-2xl font-bold tabular-nums" />
        </div>

        {difference !== null ? (
          <p
            role="status"
            className={`rounded-xl px-4 py-3 text-sm font-bold ${difference === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}
          >
            {difference === 0 ? "La caja cuadra." : difference > 0 ? `Sobran S/ ${fromCents(difference)}.` : `Faltan S/ ${fromCents(-difference)}.`}
          </p>
        ) : null}
      </div>
    </Drawer>
  );
}
