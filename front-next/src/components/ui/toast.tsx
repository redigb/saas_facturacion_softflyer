"use client";

import React from "react";
import { toast as rToast, ToastContainer as RToastContainer, type ToastOptions } from "react-toastify";

export type ToastTone = "ok" | "error" | "info" | "warning";

export interface LegacyToastPayload {
  tone: ToastTone;
  message: string;
  action?: {
    label: string;
    run: () => void;
  };
}

const DEFAULT_OPTIONS: ToastOptions = {
  position: "top-right",
  autoClose: 3500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "light",
};

/**
 * Función global de Toast adaptada a Softflyer UI.
 * Soporta sintaxis estándar: toast.success("..."), toast.error("...")
 * y sintaxis del proyecto: toast({ tone: "ok", message: "..." })
 */
export function toast(payloadOrMessage: string | LegacyToastPayload, options?: ToastOptions) {
  if (typeof payloadOrMessage === "string") {
    return rToast(payloadOrMessage, { ...DEFAULT_OPTIONS, ...options });
  }

  const { tone, message } = payloadOrMessage;
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  switch (tone) {
    case "ok":
      return rToast.success(message, mergedOptions);
    case "error":
      return rToast.error(message, mergedOptions);
    case "warning":
      return rToast.warning(message, mergedOptions);
    case "info":
    default:
      return rToast.info(message, mergedOptions);
  }
}

// Métodos directos
toast.success = (message: string, options?: ToastOptions) =>
  rToast.success(message, { ...DEFAULT_OPTIONS, ...options });

toast.error = (message: string, options?: ToastOptions) =>
  rToast.error(message, { ...DEFAULT_OPTIONS, ...options });

toast.info = (message: string, options?: ToastOptions) =>
  rToast.info(message, { ...DEFAULT_OPTIONS, ...options });

toast.warning = (message: string, options?: ToastOptions) =>
  rToast.warning(message, { ...DEFAULT_OPTIONS, ...options });

toast.dismiss = (id?: string | number) => rToast.dismiss(id);

/**
 * Contenedor visual de toasts para montar en el Layout principal.
 */
export function ToastContainer() {
  return (
    <RToastContainer
      position="top-right"
      autoClose={3500}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
    />
  );
}

export { rToast };
