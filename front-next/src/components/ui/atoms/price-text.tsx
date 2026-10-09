import React from "react";

export interface PriceTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  amount: string | number | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZE_STYLES = {
  sm: "text-sm font-bold",
  md: "text-base font-bold",
  lg: "text-lg font-extrabold",
  xl: "text-xl font-extrabold",
};

export function PriceText({ amount, size = "md", className = "", ...props }: PriceTextProps) {
  const numeric = typeof amount === "number" ? amount : Number(amount ?? 0);
  const formatted = isNaN(numeric) ? "0.00" : numeric.toFixed(2);

  return (
    <span
      className={`font-sans tracking-tight text-tinta tabular-nums ${SIZE_STYLES[size]} ${className}`}
      {...props}
    >
      S/ {formatted}
    </span>
  );
}
