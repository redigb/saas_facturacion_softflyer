import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { hasError = false, className = "", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={hasError ? true : undefined}
      className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-base text-tinta transition-all placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
        hasError
          ? "border-red-400 focus:border-red-500 focus:ring-red-100"
          : "border-slate-200 focus:border-azul focus:ring-azul/10"
      } ${className}`}
      {...props}
    />
  );
});
