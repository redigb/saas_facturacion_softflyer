"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { z } from "zod";

import { switchUser } from "@/app/panel/actions";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import { apiRequest } from "@/lib/browser-api";
import { dataOf } from "@/lib/schemas/carta";
import { switchableSchema, type Switchable } from "@/lib/schemas/equipo";

const PIN_MAX = 6;
const PIN_MIN = 4;

/** Botón de la cabecera: otra persona del equipo entra con su PIN en este mismo dispositivo. */
export function SwitchUserButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Cambiar de usuario"
        className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-azul active:scale-[0.97] ${className}`}
      >
        <Icon name="equipo" className="h-4.5 w-4.5" />
        <span className="hidden md:inline">Cambiar usuario</span>
      </button>
      {open && <SwitchUserDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function SwitchUserDialog({ onClose }: { onClose: () => void }) {
  const [people, setPeople] = useState<Switchable[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [person, setPerson] = useState<Switchable | null>(null);

  useEffect(() => {
    apiRequest("equipo/cambio", dataOf(z.array(switchableSchema)))
      .then((response) => setPeople(response.data))
      .catch((error: Error) => setLoadError(error.message));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 bg-tinta/50 backdrop-blur-xs animate-in fade-in" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cambiar de usuario"
        className="relative z-10 w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl animate-in slide-in-from-bottom sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-tinta">{person ? `Hola, ${person.nombre.split(" ")[0]}` : "¿Quién eres?"}</h2>
          <Button variant="ghost" size="sm" onClick={person ? () => setPerson(null) : onClose} aria-label={person ? "Volver" : "Cerrar"}>
            <Icon name="cerrar" className="h-5 w-5" />
          </Button>
        </div>

        {person ? (
          <PinPad person={person} />
        ) : loadError ? (
          <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{loadError}</p>
        ) : people === null ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
            ))}
          </div>
        ) : people.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            Nadie del equipo tiene PIN todavía. El administrador puede asignarlo desde <strong>Equipo</strong>.
          </p>
        ) : (
          <ul className="mt-6 grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
            {people.map((candidate) => (
              <li key={candidate.id}>
                <button
                  type="button"
                  onClick={() => setPerson(candidate)}
                  className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:border-azul active:scale-[0.97]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-azul text-sm font-bold text-white">{initials(candidate.nombre)}</span>
                  <span className="w-full truncate text-center text-sm font-bold text-tinta">{candidate.nombre}</span>
                  <span className="text-xs text-slate-500">{candidate.roles.join(", ")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Teclado numérico grande (botones de 56px) que también acepta el teclado físico. */
function PinPad({ person }: { person: Switchable }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = useCallback(
    (value: string) => {
      startTransition(async () => {
        const result = await switchUser(person.id, value);
        // Si fue correcto, la acción redirige y esta línea no se ejecuta.
        setError(result.mensaje);
        setPin("");
      });
    },
    [person.id],
  );

  const press = useCallback(
    (digit: string) => {
      if (pending) return;
      setError(null);
      setPin((current) => (current.length < PIN_MAX ? current + digit : current));
    },
    [pending],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (/^\d$/.test(event.key)) press(event.key);
      else if (event.key === "Backspace") setPin((current) => current.slice(0, -1));
      else if (event.key === "Enter" && pin.length >= PIN_MIN) submit(pin);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, submit, pin]);

  const key = "flex h-14 items-center justify-center rounded-2xl bg-niebla text-xl font-bold text-tinta transition-all hover:bg-slate-200/70 active:scale-[0.96] disabled:opacity-50";

  return (
    <div className="mt-4">
      <p className="text-sm text-slate-600">Ingresa tu PIN para entrar.</p>
      <div className="mt-4 flex justify-center gap-3" aria-label={`${pin.length} dígitos ingresados`} role="status">
        {Array.from({ length: PIN_MAX }, (_, index) => (
          <span
            key={index}
            className={`h-4 w-4 rounded-full transition-all ${index < pin.length ? "bg-azul" : error && index < PIN_MIN ? "bg-red-300" : index < PIN_MIN ? "bg-slate-200" : "bg-slate-100"}`}
          />
        ))}
      </div>
      <p className="mt-3 min-h-5 text-center text-sm font-semibold text-red-600" role="alert">
        {error}
      </p>

      <div className="mt-2 grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button key={digit} type="button" onClick={() => press(digit)} disabled={pending} className={key}>
            {digit}
          </button>
        ))}
        <button type="button" onClick={() => setPin((current) => current.slice(0, -1))} disabled={pending} aria-label="Borrar" className={`${key} text-base`}>
          ⌫
        </button>
        <button type="button" onClick={() => press("0")} disabled={pending} className={key}>
          0
        </button>
        <button
          type="button"
          onClick={() => submit(pin)}
          disabled={pending || pin.length < PIN_MIN}
          className="flex h-14 items-center justify-center rounded-2xl bg-azul text-base font-bold text-white transition-all hover:bg-azul-oscuro active:scale-[0.96] disabled:opacity-50"
        >
          {pending ? "…" : "Entrar"}
        </button>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
