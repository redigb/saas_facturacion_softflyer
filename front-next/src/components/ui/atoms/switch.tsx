import React from "react";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  title?: string;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  "aria-label": ariaLabel,
  title,
  className = "",
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      title={title}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-azul/20 active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none ${
        checked ? "bg-emerald-500" : "bg-slate-300"
      } ${className}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-7 w-7 rounded-full bg-white shadow-xs transition-transform duration-150 ${
          checked ? "translate-x-6" : "translate-x-0"
        }`}
      />
    </button>
  );
}
