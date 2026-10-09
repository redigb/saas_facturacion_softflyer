"use client";

import React, { useId } from "react";

import { Icon } from "@/components/icons";

export interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
}

export function FormField({
  label,
  error,
  hint,
  className = "",
  children,
}: FormFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-tinta">
        {label}
      </label>
      {children(id, error || hint ? messageId : undefined)}
      {error ? (
        <p id={messageId} className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-red-600">
          <Icon name="alerta" className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
