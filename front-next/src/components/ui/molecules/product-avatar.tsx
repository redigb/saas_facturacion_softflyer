import React from "react";

import { Icon } from "@/components/icons";

export interface ProductAvatarProps {
  tipo: string;
  size?: "md" | "lg";
  className?: string;
}

export function ProductAvatar({
  tipo,
  size = "md",
  className = "",
}: ProductAvatarProps) {
  const isDrink = tipo === "BEBIDA";
  const sizeClasses = size === "lg" ? "h-14 w-14" : "h-13 w-13";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl transition-transform ${sizeClasses} ${
        isDrink
          ? "bg-celeste/15 text-azul"
          : "bg-amber-100/70 text-amber-600"
      } ${className}`}
    >
      <Icon name={isDrink ? "bebida" : "plato"} className="h-6 w-6" />
    </div>
  );
}
