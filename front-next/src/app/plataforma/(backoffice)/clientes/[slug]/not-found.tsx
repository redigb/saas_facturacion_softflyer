"use client";

// Cliente: el ícono es un componente y no puede cruzar del servidor a ErrorState.
import { SearchX } from "lucide-react";

import { ErrorState } from "@/components/backoffice/organisms/error-state";

export default function ClientNotFound() {
  return (
    <ErrorState
      icon={SearchX}
      title="No encontramos ese cliente"
      description="El enlace puede estar mal escrito o el cliente cambió de subdominio. Búscalo en la lista de clientes o con Ctrl + K."
      backHref="/plataforma/clientes"
      backLabel="Volver a Clientes"
    />
  );
}
