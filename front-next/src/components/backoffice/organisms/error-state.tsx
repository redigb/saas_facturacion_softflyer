"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, RotateCw, ServerCrash, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Pantalla de error del backoffice: dice qué pasó en palabras simples, ofrece reintentar o volver, y deja a mano la
 * referencia para buscar el error en los registros del servidor. El detalle técnico solo aparece en desarrollo.
 */
export function ErrorState({
  title,
  description,
  icon: Icon = ServerCrash,
  reference,
  technicalDetail,
  onRetry,
  backHref = "/plataforma",
  backLabel = "Ir al resumen",
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  reference?: string;
  technicalDetail?: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  const [retrying, setRetrying] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyReference = async () => {
    if (!reference) return;
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sin permiso de portapapeles: la referencia sigue visible para copiarla a mano.
    }
  };

  return (
    <section role="alert" className="mx-auto w-full max-w-xl py-10 sm:py-16">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Icon className="size-6" aria-hidden />
        </span>

        <h1 className="mt-5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted-foreground">{description}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          {onRetry ? (
            <Button
              type="button"
              isLoading={retrying}
              onClick={() => {
                setRetrying(true);
                onRetry();
                // Si el reintento vuelve a fallar, el botón queda listo para otro intento.
                setTimeout(() => setRetrying(false), 1500);
              }}
              className="gap-2"
            >
              {!retrying ? <RotateCw className="size-4" aria-hidden /> : null}
              Reintentar
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        </div>

        {reference ? (
          <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/70 pt-4 text-[13px] text-muted-foreground">
            <span>Si sigue fallando, pásale esta referencia a soporte técnico:</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-foreground">
              {reference}
              <button
                type="button"
                onClick={copyReference}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label={copied ? "Referencia copiada" : "Copiar referencia"}
              >
                {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
              </button>
            </span>
          </div>
        ) : null}

        {technicalDetail ? (
          <details className="mt-4 text-[13px]">
            <summary className="font-semibold text-muted-foreground hover:text-foreground">Detalle técnico (solo en desarrollo)</summary>
            <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 font-mono text-xs text-foreground">
              {technicalDetail}
            </pre>
          </details>
        ) : null}
      </div>
    </section>
  );
}
