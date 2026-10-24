import { cn } from "@/lib/utils";

/** Un dato de una ficha: etiqueta pequeña arriba y valor debajo ("—" si falta). */
export function DefinitionItem({ label, value, mono = false }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={cn("mt-0.5 text-sm text-foreground", mono && "font-mono")}>{value || "—"}</dd>
    </div>
  );
}
