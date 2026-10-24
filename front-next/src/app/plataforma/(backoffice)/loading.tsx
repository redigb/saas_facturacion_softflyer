import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto con la forma del resumen: la pantalla responde al instante mientras llegan los datos. */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-64 bg-foreground/10" />
        <Skeleton className="h-4 w-96 max-w-full bg-foreground/10" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl bg-foreground/10" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl bg-foreground/10" />
    </div>
  );
}
