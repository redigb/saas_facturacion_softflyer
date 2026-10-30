"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Botón con flechas que cruzan y un círculo que se expande al pasar el cursor. Toma los colores del tema
 * (`primary`) en lugar de valores fijos, así que sirve en modo claro y oscuro. Sin animación si el usuario pide
 * menos movimiento.
 */
export const FlowButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean }
>(function FlowButton({ className, children, isLoading = false, disabled, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={cn(
        "group relative inline-flex min-h-[44px] cursor-pointer items-center gap-1 overflow-hidden rounded-full border-[1.5px] border-primary/50 bg-card px-9 py-2.5 text-sm font-bold text-primary",
        "transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:rounded-xl hover:border-transparent hover:text-primary-foreground active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-60",
        "motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <ArrowRight
        aria-hidden
        className="absolute left-[-25%] z-[9] size-4 transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:left-4 motion-reduce:transition-none"
      />

      <span className="relative z-[1] -translate-x-3 whitespace-nowrap transition-all duration-[800ms] ease-out group-hover:translate-x-3 motion-reduce:transition-none">
        {children}
      </span>

      {/* Círculo que se expande y tiñe el botón. */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0 transition-all duration-[800ms] ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:size-[260px] group-hover:opacity-100 motion-reduce:transition-none"
      />

      <ArrowRight
        aria-hidden
        className="absolute right-4 z-[9] size-4 transition-all duration-[800ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:right-[-25%] motion-reduce:transition-none"
      />
    </button>
  );
});
