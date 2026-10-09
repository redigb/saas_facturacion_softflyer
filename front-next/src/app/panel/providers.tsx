"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { toast, type LegacyToastPayload } from "@/components/ui/toast";
import { ApiRequestError } from "@/lib/browser-api";

/** Avisos no bloqueantes con react-toastify adaptado a Softflyer UI. */
export function useToast() {
  return (payload: LegacyToastPayload) => {
    toast(payload);
  };
}

export function PanelProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            // 4xx no se reintenta: la respuesta no va a cambiar.
            retry: (count, error) =>
              !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500) &&
              count < 2,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
