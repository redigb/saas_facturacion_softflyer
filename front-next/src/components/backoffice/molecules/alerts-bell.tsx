import { Bell } from "lucide-react";
import Link from "next/link";

/** Campana de la barra superior: lleva a las alertas y muestra cuántas hay activas. */
export function AlertsBell({ count }: { count: number }) {
  return (
    <Link
      href="/plataforma/alertas"
      aria-label={count > 0 ? `${count} alertas de facturación` : "Alertas de facturación"}
      className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      <Bell className="size-4" />
      {count > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-bold text-destructive-foreground ring-2 ring-background">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
