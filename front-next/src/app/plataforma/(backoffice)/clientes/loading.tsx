import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 bg-foreground/10" />
        <Skeleton className="h-4 w-80 max-w-full bg-foreground/10" />
      </div>
      <Skeleton className="h-14 rounded-xl bg-foreground/10" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-lg bg-foreground/10" />
      ))}
    </div>
  );
}
