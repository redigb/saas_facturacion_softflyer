import { AlertCircle, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Aviso de error con los tokens del tema: se lee igual en modo claro y oscuro, y los lectores de pantalla lo anuncian. */
export function ErrorNotice({ title, message, className }: { title: string; message?: string; className?: string }) {
  return (
    <div
      role="alert"
      className={cn("flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm", className)}
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
      <div>
        <p className="font-bold text-foreground">{title}</p>
        {message ? <p className="mt-1 text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  );
}

/** Estado vacío: explica por qué no hay nada y, si aplica, ofrece la siguiente acción. */
export function EmptyPanel({
  icon: Icon,
  title,
  description,
  tone = "success",
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: "success" | "neutral";
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-full",
          tone === "success" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-7" aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-bold text-foreground">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
