"use client";

import { useId } from "react";

/**
 * Visual geométrico 3D isométrico con profundidad real, planos en capas y cuadrícula en perspectiva.
 * Se adapta automáticamente al modo claro y modo oscuro.
 */
export function Backoffice3DVisual() {
  const maskId = useId();
  const gradId = useId();
  const glowId = useId();

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {/* Resplandor ambiental radial volumétrico */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(24,180,250,0.22)_0%,rgba(12,94,167,0.12)_45%,transparent_70%)] blur-2xl dark:bg-[radial-gradient(circle,rgba(24,180,250,0.18)_0%,rgba(12,94,167,0.1)_50%,transparent_75%)]"
      />

      {/* Composición en perspectiva 3D real */}
      <div
        className="relative flex items-center justify-center [perspective:1200px]"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Superficie base: Malla de cuadrícula isométrica en perspectiva */}
        <div
          className="relative h-[480px] w-[480px] origin-center transition-transform duration-700 [transform:rotateX(62deg)_rotateZ(-35deg)]"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Grilla infinita en perspectiva */}
          <div
            className="absolute inset-0 rounded-3xl border border-sky-500/20 bg-linear-to-b from-sky-500/5 to-transparent dark:border-sky-400/25 dark:bg-sky-500/5 [background-image:linear-gradient(to_right,rgba(12,94,167,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(12,94,167,0.18)_1px,transparent_1px)] dark:[background-image:linear-gradient(to_right,rgba(56,189,248,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(56,189,248,0.2)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_85%)] shadow-2xl"
          />

          {/* Plano intermedio 3D flotante (Elevación +30px) */}
          <div
            className="absolute left-[15%] top-[15%] h-[70%] w-[70%] rounded-2xl border border-sky-400/40 bg-card/60 backdrop-blur-xs shadow-xl shadow-[#0c5ea7]/20 [transform:translateZ(30px)] transition-transform"
          >
            {/* Retícula interna del plano flotante */}
            <div className="absolute inset-0 rounded-2xl [background-image:linear-gradient(to_right,rgba(24,180,250,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(24,180,250,0.15)_1px,transparent_1px)] [background-size:24px_24px]" />

            {/* Marcadores de nodos / datos en esquinas */}
            <span className="absolute -left-1 -top-1 size-2 rounded-full bg-[#18b4fa] shadow-[0_0_8px_#18b4fa]" />
            <span className="absolute -right-1 -top-1 size-2 rounded-full bg-[#18b4fa] shadow-[0_0_8px_#18b4fa]" />
            <span className="absolute -bottom-1 -left-1 size-2 rounded-full bg-[#fccd0b] shadow-[0_0_8px_#fccd0b]" />
            <span className="absolute -bottom-1 -right-1 size-2 rounded-full bg-[#0c5ea7] shadow-[0_0_8px_#0c5ea7]" />
          </div>

          {/* Plano superior de alta elevación (Elevación +70px) */}
          <div
            className="absolute left-[30%] top-[30%] h-[40%] w-[40%] rounded-xl border border-[#18b4fa]/60 bg-linear-to-br from-[#18b4fa]/20 via-[#0c5ea7]/30 to-transparent backdrop-blur-md shadow-2xl shadow-[#18b4fa]/30 [transform:translateZ(70px)] flex flex-col justify-between p-3"
          >
            <div className="flex items-center justify-between">
              <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <div className="h-1 w-8 rounded-full bg-[#18b4fa]/40" />
            </div>

            <div className="space-y-1.5">
              <div className="h-1.5 w-3/4 rounded-full bg-[#18b4fa]/60" />
              <div className="h-1.5 w-1/2 rounded-full bg-amber-400/70" />
            </div>

            {/* Conectores ortogonales verticales proyectados hacia abajo */}
            <span className="absolute left-1/2 -top-10 h-10 w-px bg-linear-to-b from-transparent to-[#18b4fa]/60" />
          </div>

          {/* Viga de proyección de datos / Lápiz de luz */}
          <div
            className="absolute left-1/2 top-1/2 h-24 w-px bg-linear-to-t from-[#18b4fa] to-transparent [transform:translateZ(100px)_rotateY(45deg)]"
          />
        </div>
      </div>

      {/* SVG de detalle geométrico isométrico adicional con vectores nítidos */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-foreground/5 dark:text-sky-500/10"
        viewBox="0 0 600 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#18b4fa" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0c5ea7" stopOpacity="0.05" />
          </linearGradient>
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#18b4fa" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
          <mask id={maskId}>
            <rect width="600" height="600" fill={`url(#${glowId})`} />
          </mask>
        </defs>

        <g mask={`url(#${maskId})`} stroke="currentColor" strokeWidth="1">
          {/* Ejes isométricos a 30 grados */}
          {[-120, -60, 0, 60, 120].map((offset) => (
            <line
              key={`iso-1-${offset}`}
              x1={100 + offset}
              y1="500"
              x2={500 + offset}
              y2="100"
              strokeDasharray="4 4"
            />
          ))}
          {[-120, -60, 0, 60, 120].map((offset) => (
            <line
              key={`iso-2-${offset}`}
              x1={100 + offset}
              y1="100"
              x2={500 + offset}
              y2="500"
              strokeDasharray="4 4"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
