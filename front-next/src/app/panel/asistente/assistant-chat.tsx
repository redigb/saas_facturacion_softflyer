"use client";

import { useEffect, useRef, useState } from "react";

import { useAskAssistant } from "@/app/panel/asistente/queries";
import { Visualization } from "@/app/panel/asistente/visualizations";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";
import type { AssistantAnswer } from "@/lib/schemas/asistente";

const DEFAULT_SUGGESTIONS = [
  "¿Cuánto vendí ayer?",
  "¿Cuáles son mis horas punta?",
  "¿Cómo van mis meseros?",
  "¿Cómo está mi inventario?",
  "¿Qué me recomiendas?",
  "Productos más vendidos de este mes",
];

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  answer?: AssistantAnswer;
  error?: boolean;
};

/** Núcleo del chat del asistente, compartido por la página y el globo flotante (spec 040). */
export function AssistantChat({ compact = false, autoFocus = false }: { compact?: boolean; autoFocus?: boolean }) {
  const assistant = useAskAssistant();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const [input, setInput] = useState("");
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const ids = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);

  const pending = assistant.isPending;

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  useEffect(() => {
    if (autoFocus) composer.current?.focus();
  }, [autoFocus]);

  function nextId(): number {
    ids.current += 1;
    return ids.current;
  }

  async function ask(question: string, appendUser = true) {
    const text = question.trim();
    if (text === "" || pending) return;

    if (appendUser) {
      setMessages((current) => [...current, { id: nextId(), role: "user", text }]);
    }
    setLastQuestion(text);
    setInput("");

    try {
      const answer = await assistant.mutateAsync(text);
      if (answer.sugerencias.length > 0) setSuggestions(answer.sugerencias);
      setMessages((current) => [...current, { id: nextId(), role: "assistant", text: answer.respuesta, answer }]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: nextId(), role: "assistant", text: error instanceof Error ? error.message : "No pudimos consultar tus datos. Inténtalo de nuevo.", error: true },
      ]);
    }
  }

  function reset() {
    setMessages([]);
    setSuggestions(DEFAULT_SUGGESTIONS);
    setLastQuestion(null);
    setInput("");
    composer.current?.focus();
  }

  return (
    <div className={compact ? "flex h-full min-h-0 flex-col" : "space-y-5"}>
      {!compact ? (
        <p className="rounded-2xl border border-celeste/30 bg-celeste/5 px-4 py-3 text-xs leading-5 text-slate-600">
          El asistente solo consulta información. No modifica precios, ventas, pedidos ni inventario. Los montos son de ventas
          registradas y no reemplazan un cierre contable.
        </p>
      ) : null}

      <section
        aria-label="Conversación"
        aria-live="polite"
        className={
          compact
            ? "min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-4"
            : "min-h-[46vh] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-6"
        }
      >
        {messages.length === 0 ? (
          <div className={compact ? "flex h-full flex-col items-center justify-center text-center" : "flex min-h-[36vh] flex-col items-center justify-center text-center"}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-azul/10 text-azul">
              <Icon name="asistente" className="h-6 w-6" />
            </span>
            <h2 className="mt-3 text-base font-bold text-tinta">¿Qué quieres saber?</h2>
            <p className="mt-1 max-w-sm text-xs text-slate-500">Solo se consultan datos de tu restaurante.</p>
            <div className="mt-4 grid w-full max-w-sm gap-2">
              {DEFAULT_SUGGESTIONS.slice(0, compact ? 3 : 6).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void ask(suggestion)}
                  className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-tinta transition-colors hover:border-azul hover:bg-azul/5 active:scale-[0.99]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-4">
            {messages.map((message) => (
              <li key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-azul px-3.5 py-2.5 text-sm leading-6 whitespace-pre-line text-white shadow-2xs"
                      : `w-full max-w-[95%] rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-sm leading-6 whitespace-pre-line ${message.error ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-white text-tinta"}`
                  }
                >
                  {message.text}

                  {message.answer?.periodo ? (
                    <span className="mt-2.5 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                      {message.answer.periodo.etiqueta}
                    </span>
                  ) : null}

                  {message.answer?.visualizacion ? <Visualization visualization={message.answer.visualizacion} /> : null}

                  {message.error && lastQuestion ? (
                    <button
                      type="button"
                      onClick={() => void ask(lastQuestion, false)}
                      disabled={pending}
                      className="mt-2.5 inline-flex min-h-[34px] items-center rounded-lg bg-white px-3 text-xs font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                    >
                      Reintentar
                    </button>
                  ) : null}
                </div>
              </li>
            ))}

            {pending ? (
              <li className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-500">
                  <span className="flex gap-1" aria-hidden="true">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-azul [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-azul [animation-delay:120ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-azul [animation-delay:240ms]" />
                  </span>
                  Consultando tus datos…
                </div>
              </li>
            ) : null}
          </ul>
        )}
        <div ref={bottom} />
      </section>

      {messages.length > 0 && !pending ? (
        <div className={compact ? "flex flex-wrap gap-1.5 border-t border-slate-100 bg-white px-3 pt-2.5" : "flex flex-wrap gap-2"} aria-label="Sugerencias">
          {suggestions.slice(0, compact ? 2 : 4).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => void ask(suggestion)}
              className="min-h-[34px] rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-azul hover:text-azul"
            >
              {suggestion}
            </button>
          ))}
          <button
            type="button"
            onClick={reset}
            className="min-h-[34px] rounded-full px-2 text-[11px] font-bold text-slate-400 transition-colors hover:text-azul"
          >
            Nueva conversación
          </button>
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask(input);
        }}
        className={compact ? "border-t border-slate-100 bg-white p-3" : "rounded-3xl border border-slate-200 bg-white p-3 shadow-2xs sm:p-4"}
      >
        <label htmlFor="asistente-mensaje" className="sr-only">Pregunta para el asistente</label>
        <textarea
          ref={composer}
          id="asistente-mensaje"
          value={input}
          onChange={(event) => setInput(event.target.value.slice(0, 500))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void ask(input);
            }
          }}
          rows={2}
          maxLength={500}
          disabled={pending}
          placeholder="Ej. ¿Cuánto vendí esta semana?"
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-tinta placeholder:text-slate-400 focus:border-azul focus:ring-4 focus:ring-azul/10 focus:outline-none disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className={`text-[11px] tabular-nums ${input.length >= 480 ? "font-bold text-amber-600" : "text-slate-400"}`}>{input.length}/500</span>
          <Button type="submit" size={compact ? "sm" : "md"} disabled={pending || input.trim() === ""} isLoading={pending}>
            <Icon name="asistente" className="h-4 w-4" /> Preguntar
          </Button>
        </div>
      </form>
    </div>
  );
}
