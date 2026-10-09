import React from "react";

export type BadgeVariant = "neutral" | "info" | "warning" | "success" | "danger" | "code";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  neutral: "bg-slate-100 text-slate-600",
  info: "bg-celeste/15 text-azul font-bold",
  warning: "bg-amber-100/90 text-amber-800 font-bold",
  success: "bg-emerald-100/90 text-emerald-800 font-bold",
  danger: "bg-red-100 text-red-700 font-bold",
  code: "bg-slate-100 text-slate-500 font-mono",
};

export function Badge({ variant = "neutral", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${VARIANT_STYLES[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
