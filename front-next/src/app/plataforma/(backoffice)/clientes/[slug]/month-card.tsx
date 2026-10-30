import { useId } from "react";

import { cn } from "@/lib/utils";

const NAMES: Record<number, string> = { 1: "Mensual", 3: "Trimestral", 6: "Semestral", 12: "Anual" };

/**
 * Silueta de la carpeta: el mismo trazo de la tarjeta original (pestaña a la izquierda, una curva larga que baja al
 * cuerpo). El viewBox coincide con el interior del bisel, así que `preserveAspectRatio="none"` no deforma los radios.
 * Se pasa de los bordes y por abajo para que el panel siga cubriendo la tarjeta cuando se desliza al pasar el cursor.
 */
const FOLDER_PATH =
  "M-2,151 a16,16 0 0 1 16,-16 h247 " +
  "c26.6,0 59.3,59 76,59 " +
  "h149 a32,32 0 0 1 32,32 v368 " +
  "a32,32 0 0 1 -32,32 h-456 a32,32 0 0 1 -32,-32 Z";

/** Azul de Softflyer con un resplandor amarillo que sube desde abajo a la derecha. */
const COVER_GRADIENT = [
  "radial-gradient(58% 76% at 76% 114%, rgba(252,205,11,.78) 0%, rgba(252,205,11,.3) 34%, rgba(0,0,0,0) 72%)",
  "radial-gradient(105% 95% at 28% 136%, rgba(24,180,250,.8) 0%, rgba(12,94,167,.45) 46%, rgba(0,0,0,0) 80%)",
  "linear-gradient(172deg, #041a33 0%, #07305c 40%, #0a4a85 74%, #0c5ea7 100%)",
].join(",");

const TOKENS = [
  "[--fc-bezel:var(--muted)]",
  "[--fc-surface:var(--card)]",
  "[--fc-panel-from:var(--card)]",
  "[--fc-panel-to:var(--muted)]",
  "[--fc-title:var(--foreground)]",
  "[--fc-subtitle:var(--muted-foreground)]",
].join(" ");

const MONTHS_IN_YEAR = 12;

/**
 * Duración como tarjeta de carpeta: una portada con 12 casillas (una por mes, llenas las que incluye la duración),
 * la pestaña con el nombre del periodo y la fecha de vencimiento, y en el pie los meses en grande con los días.
 * Es un radio nativo, así que viaja en el formulario y se maneja con teclado. Al pasar el cursor, o al elegirla, la
 * carpeta baja para dejar ver más portada y la tarjeta se levanta.
 */
export function MonthCard({
  months,
  until,
  days,
  checked,
  onSelect,
}: {
  months: number;
  /** Fecha de vencimiento ya formateada ("24 feb 2027"). */
  until: string;
  /** Días que durará desde hoy. */
  days: number;
  checked: boolean;
  onSelect: () => void;
}) {
  const gradientId = useId();

  return (
    <label
      className={cn(
        "group block cursor-pointer select-none [container-type:inline-size]",
        "transition-transform duration-300 ease-out hover:-translate-y-1.5 has-[:focus-visible]:-translate-y-1.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        TOKENS,
      )}
    >
      <input type="radio" name="meses" value={String(months)} checked={checked} onChange={onSelect} className="peer sr-only" />

      {/* Bisel */}
      <span
        className={cn(
          "relative box-border block aspect-[544/522] w-full rounded-[8.46cqw] bg-[var(--fc-bezel)] p-[2.57cqw] shadow-[0_2cqw_5cqw_-2cqw_rgb(0_0_0/.35)] transition-shadow",
          checked ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "ring-1 ring-border",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
        )}
      >
        <span className="relative block h-full w-full overflow-hidden rounded-[5.88cqw] bg-[var(--fc-surface)]">
          {/* Portada: degradado con las 12 casillas de los meses */}
          <span className="absolute left-px right-px top-0 block h-[54%] overflow-hidden">
            <span
              aria-hidden
              style={{ background: COVER_GRADIENT }}
              className={cn(
                "block h-full w-full origin-bottom transition-transform duration-500 ease-out group-hover:scale-[1.07] motion-reduce:transition-none",
                checked && "scale-[1.07]",
              )}
            />
            <span aria-hidden className="absolute left-[5.5cqw] top-[5.5cqw] flex gap-[1.1cqw]">
              {Array.from({ length: MONTHS_IN_YEAR }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "block h-[3.4cqw] w-[3.4cqw] rounded-[0.9cqw] transition-colors duration-300",
                    i < months ? "bg-white shadow-[0_0_1.6cqw_rgb(255_255_255/.55)]" : "bg-white/20",
                  )}
                />
              ))}
            </span>
          </span>

          {/* Frente de la carpeta: panel + texto de la pestaña, se mueven juntos */}
          <span className="absolute -left-px -right-px inset-y-0 block overflow-hidden">
            <span
              className={cn(
                "absolute inset-0 block transition-transform duration-500 ease-out group-hover:translate-y-[8%] motion-reduce:transition-none",
                checked && "translate-y-[8%]",
              )}
            >
              <svg aria-hidden viewBox="0 0 516 494" preserveAspectRatio="none" className="absolute inset-0 block h-full w-full">
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" style={{ stopColor: "var(--fc-panel-from)" }} />
                    <stop offset="1" style={{ stopColor: "var(--fc-panel-to)" }} />
                  </linearGradient>
                </defs>
                {/* Relleno y trazo con el mismo degradado para que no asome una costura en los bordes */}
                <path d={FOLDER_PATH} fill={`url(#${gradientId})`} stroke={`url(#${gradientId})`} strokeWidth="2" />
              </svg>

              <span className="absolute left-[4.78cqw] top-[28cqw] block leading-none">
                <span className={cn("block text-[6cqw] font-semibold tracking-[0.005em]", checked ? "text-primary" : "text-[var(--fc-title)]")}>
                  {NAMES[months] ?? `${months} meses`}
                </span>
                <span className="mt-[2.2cqw] block text-[4.6cqw] font-normal tracking-[0.005em] text-[var(--fc-subtitle)]">Hasta el {until}</span>
              </span>
            </span>
          </span>

          {/* Pie: queda quieto mientras la carpeta se desliza */}
          <span className="absolute inset-x-[4.78cqw] bottom-[4.3cqw] flex items-baseline justify-between leading-none text-[var(--fc-title)]">
            <span>
              <span className="text-[11cqw] font-semibold tabular-nums tracking-[-0.01em]">{months}</span>
              <span className="ml-[1.8cqw] text-[5cqw] font-normal text-[var(--fc-subtitle)]">{months === 1 ? "mes" : "meses"}</span>
            </span>
            <span className="text-[4.8cqw] font-semibold tabular-nums">{days} días</span>
          </span>
        </span>
      </span>
    </label>
  );
}
