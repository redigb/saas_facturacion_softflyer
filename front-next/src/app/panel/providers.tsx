"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { Icon } from "@/components/icons";
import { ApiRequestError } from "@/lib/browser-api";

type Toast = { id: number; message: string; tone: "error" | "ok"; action?: { label: string; run: () => void } };

const ToastContext = createContext<(toast: Omit<Toast, "id">) => void>(() => {});

/** Avisos no bloqueantes: un error de red no tapa la pantalla ni borra lo escrito. */
export function useToast() {
  return useContext(ToastContext);
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
            retry: (count, error) => !(error instanceof ApiRequestError && error.status >= 400 && error.status < 500) && count < 2,
          },
        },
      }),
  );
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-2), { ...toast, id }]);
      setTimeout(() => dismiss(id), toast.action ? 8000 : 4000);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContext.Provider value={value}>
        {children}
        <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:left-auto sm:items-end">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
                toast.tone === "error" ? "bg-tinta text-white" : "bg-emerald-600 text-white"
              }`}
            >
              <Icon name={toast.tone === "error" ? "alerta" : "check"} className="h-5 w-5 shrink-0" />
              <span className="flex-1">{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.run();
                    dismiss(toast.id);
                  }}
                  className="rounded-lg bg-white/15 px-2.5 py-1 font-bold hover:bg-white/25"
                >
                  {toast.action.label}
                </button>
              )}
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Cerrar aviso" className="opacity-70 hover:opacity-100">
                <Icon name="cerrar" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </ToastContext.Provider>
    </QueryClientProvider>
  );
}
