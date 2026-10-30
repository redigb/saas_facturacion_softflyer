import type { ClientDetail } from "@/app/plataforma/types";
import { cn } from "@/lib/utils";

import { fiscalStage, type StageTone } from "./fiscal-stage";

export const TONE_CLASSES: Record<StageTone, string> = {
  done: "bg-primary text-primary-foreground",
  attention: "bg-warning text-neutral-900",
  waiting: "bg-muted text-foreground/80",
  error: "bg-destructive text-destructive-foreground",
};

/** Estado SUNAT del cliente con el vocabulario único de `fiscalStage`. */
export function StageBadge({ fiscal, className, prefix = false }: { fiscal: ClientDetail["fiscal"]; className?: string; prefix?: boolean }) {
  const { label, tone } = fiscalStage(fiscal);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span className={prefix ? undefined : "sr-only"}>SUNAT: </span>
      {label}
    </span>
  );
}
