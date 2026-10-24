import { Icon } from "@/components/icons";

export interface ProductAvatarProps {
  tipo: string;
  /** Foto del plato (spec 023): si existe, reemplaza al ícono genérico. */
  imagenUrl?: string | null;
  size?: "md" | "lg";
  className?: string;
}

export function ProductAvatar({
  tipo,
  imagenUrl,
  size = "md",
  className = "",
}: ProductAvatarProps) {
  const isDrink = tipo === "BEBIDA";
  const sizeClasses = size === "lg" ? "h-14 w-14" : "h-13 w-13";

  if (imagenUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- la foto ya viene comprimida del cliente
      <img
        src={imagenUrl}
        alt=""
        loading="lazy"
        className={`shrink-0 rounded-2xl object-cover ${sizeClasses} ${className}`}
      />
    );
  }

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
