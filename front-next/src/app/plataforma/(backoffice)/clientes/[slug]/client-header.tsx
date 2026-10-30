"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Store } from "lucide-react";

import type { ClientDetail } from "@/app/plataforma/types";
import { formatDate, statusOf } from "@/app/plataforma/ui";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

import { StageBadge } from "./billing/stage-badge";

export function ClientHeader({
  client,
  fullUrl,
  loginUrl,
}: {
  client: ClientDetail;
  fullUrl: string;
  loginUrl: string;
}) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedUrl(true);
      toast.success("URL del restaurante copiada al portapapeles.");
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Ignorar fallo de permisos
    }
  };

  const commercial = statusOf(client);
  const shownUrl = fullUrl.replace(/^https?:\/\//, "");

  return (
    <div className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Store className="size-7" aria-hidden />
        </div>

        <div className="min-w-0 space-y-2">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{client.nombre}</h1>

          {/* Dos estados de cosas distintas: el comercial (neutro) y el de SUNAT (con color). */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-bold text-foreground/80">{commercial.label}</span>
            <StageBadge fiscal={client.fiscal} prefix />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <a
                href={loginUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-foreground hover:text-primary hover:underline"
                title={fullUrl}
              >
                {shownUrl}
              </a>
              <Button
                type="button"
                variant="ghost"
                onClick={copyUrl}
                className="h-7 min-h-0 w-7 p-0 text-muted-foreground"
                aria-label={copiedUrl ? "Dirección copiada" : "Copiar dirección"}
              >
                {copiedUrl ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
              </Button>
            </span>
            <span>
              RUC <span className="font-semibold tabular-nums text-foreground">{client.ruc || "sin registrar"}</span>
            </span>
            <span>Alta el {formatDate(client.creado_en)}</span>
          </div>
        </div>
      </div>

      <Button asChild variant="outline" className="shrink-0 gap-2 font-semibold">
        <a href={loginUrl} target="_blank" rel="noreferrer">
          <ExternalLink className="size-4" aria-hidden />
          Visitar restaurante
        </a>
      </Button>
    </div>
  );
}
