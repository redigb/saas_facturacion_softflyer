import { formatDate } from "@/app/plataforma/ui";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;
const DAYS_PER_MONTH = 30.44;
/** Más marcas que esto saturan la barra: pasado ese largo se dibujan solo las de cada 3 meses. */
const MAX_TICKS = 13;

/** Fecha sin hora ("2026-10-24" o ISO completo) a medianoche local, para contar días sin que la zona horaria los corra. */
export function parseDay(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);

  return new Date(year, month - 1, day);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY);
}

export function today(): Date {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Cuánto lleva consumido el periodo vigente y cuánto le queda: días restantes en grande, una barra con una marca por
 * mes y un punto en "hoy", y debajo las fechas de inicio y fin.
 */
export function PlanTimeline({ start, end, label }: { start: string; end: string; label: string }) {
  const from = parseDay(start);
  const to = parseDay(end);
  const left = daysBetween(today(), to);
  const total = Math.max(daysBetween(from, to), 1);
  const elapsed = Math.min(Math.max(daysBetween(from, today()) / total, 0), 1);
  const percent = Math.round(elapsed * 100);
  const months = Math.max(Math.round(total / DAYS_PER_MONTH), 1);
  const step = months >= MAX_TICKS ? 3 : 1;
  const ticks = Array.from({ length: Math.floor((months - 1) / step) }, (_, i) => ((i + 1) * step * DAYS_PER_MONTH) / total).filter((at) => at < 1);
  const expired = left < 0;
  const ending = !expired && left <= 7;
  const tone = expired ? "bg-destructive" : ending ? "bg-warning" : "bg-primary";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <p className="flex items-baseline gap-2">
          {expired ? (
            <span className="text-3xl font-semibold leading-none tracking-tight text-destructive">
              Venció hace {-left} {-left === 1 ? "día" : "días"}
            </span>
          ) : left === 0 ? (
            <span className="text-3xl font-semibold leading-none tracking-tight text-foreground">Vence hoy</span>
          ) : (
            <>
              <span className="text-4xl font-semibold leading-none tabular-nums tracking-tight text-foreground">{left}</span>
              <span className="text-sm font-medium text-foreground/70">{left === 1 ? "día restante" : "días restantes"}</span>
            </>
          )}
        </p>
        <p className="text-sm font-medium text-foreground/70">
          {label} el <span className="font-semibold text-foreground">{formatDate(end)}</span>
        </p>
      </div>

      {/* Barra: relleno de lo consumido, una marca por mes y un punto en "hoy". */}
      <div className="relative py-1.5">
        <div
          role="progressbar"
          aria-label="Tiempo transcurrido del periodo"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="relative h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <div className={cn("h-full rounded-full", tone)} style={{ width: `${percent}%` }} />
          {ticks.map((at) => (
            <span key={at} aria-hidden className="absolute inset-y-0 w-0.5 bg-card/80" style={{ left: `${at * 100}%` }} />
          ))}
        </div>
        {!expired ? (
          <span
            aria-hidden
            className={cn("absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px] ring-card", tone)}
            style={{ left: `${Math.min(Math.max(percent, 1.5), 98.5)}%` }}
          />
        ) : null}
      </div>

      <div className="flex justify-between text-[13px] font-medium tabular-nums text-foreground/70">
        <span>Desde el {formatDate(start)}</span>
        <span>
          {months} {months === 1 ? "mes" : "meses"} · {total} días
        </span>
      </div>
    </div>
  );
}
