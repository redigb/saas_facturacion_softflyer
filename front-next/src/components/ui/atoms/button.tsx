import React from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "icon";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-azul text-white hover:bg-azul-oscuro shadow-sm hover:shadow focus-visible:ring-celeste/40",
  secondary:
    "border border-slate-200 bg-white text-tinta shadow-2xs hover:border-slate-300 hover:bg-slate-50/80 focus-visible:ring-slate-300",
  danger:
    "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 focus-visible:ring-red-200",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-azul focus-visible:ring-azul/20",
  icon:
    "border border-slate-200/80 bg-white text-slate-500 hover:border-azul/30 hover:bg-slate-50 hover:text-azul focus-visible:ring-azul/30",
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "min-h-[38px] px-3 py-1.5 text-xs font-bold rounded-xl",
  md: "min-h-[44px] px-4.5 py-2.5 text-sm font-bold rounded-xl",
  lg: "min-h-[50px] px-6 py-3 text-base font-bold rounded-2xl",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    isLoading = false,
    disabled = false,
    className = "",
    type = "button",
    children,
    ...props
  },
  ref
) {
  const isIcon = variant === "icon";
  const sizeClasses = isIcon ? "h-11 w-11 rounded-xl p-0" : SIZE_STYLES[size];

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 font-bold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-60 ${VARIANT_STYLES[variant]} ${sizeClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
});
