"use client";

import { RotateCw } from "lucide-react";

import { ErrorNotice } from "@/components/backoffice/molecules/notice";
import { Button } from "@/components/ui/button";

export default function BackofficeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl space-y-4 py-12">
      <ErrorNotice title="Algo salió mal al cargar esta pantalla" message={error.digest ? `Referencia: ${error.digest}` : undefined} />
      <Button onClick={reset} variant="outline" className="gap-2">
        <RotateCw className="size-4" aria-hidden />
        Reintentar
      </Button>
    </div>
  );
}
