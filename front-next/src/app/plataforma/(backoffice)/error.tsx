"use client";

import { ErrorState } from "@/components/backoffice/organisms/error-state";

export default function BackofficeError({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return (
    <ErrorState
      title="No pudimos cargar esta pantalla"
      description="Puede ser un corte momentáneo con el servidor. Reintenta en unos segundos; tus datos no se perdieron."
      reference={error.digest}
      technicalDetail={process.env.NODE_ENV === "development" ? error.stack ?? error.message : undefined}
      onRetry={unstable_retry}
    />
  );
}
