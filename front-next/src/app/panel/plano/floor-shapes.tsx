"use client";

import type { FloorItem } from "@/app/panel/plano/editor-state";

export type ShapeTheme = {
  tableBg: string;
  tableBorder: string;
  chairBg: string;
  chairBorder: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
};

export const TABLE_THEMES: Record<string, ShapeTheme> = {
  LIBRE: {
    tableBg: "#ffffff",
    tableBorder: "#0c5ea7",
    chairBg: "#f8fafc",
    chairBorder: "#0c5ea7",
    textColor: "#0b2a4a",
    badgeBg: "rgba(12, 94, 167, 0.08)",
    badgeText: "#0c5ea7",
  },
  // Ocupada y por cobrar van rellenas, igual que las tarjetas del panel (spec 018).
  OCUPADA: {
    tableBg: "#0c5ea7",
    tableBorder: "#083f71",
    chairBg: "#e0f2fe",
    chairBorder: "#0369a1",
    textColor: "#ffffff",
    badgeBg: "rgba(255, 255, 255, 0.24)",
    badgeText: "#ffffff",
  },
  POR_COBRAR: {
    tableBg: "#f59e0b",
    tableBorder: "#b45309",
    chairBg: "#fef3c7",
    chairBorder: "#d97706",
    textColor: "#ffffff",
    badgeBg: "rgba(255, 255, 255, 0.28)",
    badgeText: "#ffffff",
  },
  BLOQUEADA: {
    tableBg: "#f8fafc",
    tableBorder: "#94a3b8",
    chairBg: "#f1f5f9",
    chairBorder: "#cbd5e1",
    textColor: "#64748b",
    badgeBg: "rgba(148, 163, 184, 0.15)",
    badgeText: "#64748b",
  },
  ERROR: {
    tableBg: "#fef2f2",
    tableBorder: "#ef4444",
    chairBg: "#fee2e2",
    chairBorder: "#dc2626",
    textColor: "#991b1b",
    badgeBg: "rgba(239, 68, 68, 0.15)",
    badgeText: "#dc2626",
  },
};

/**
 * Renderizado arquitectónico lúcido de sillas para mesas cuadradas/rectangulares.
 * Se dibujan encajadas en los bordes como en un plano arquitectónico profesional.
 */
function RectChairs({
  w,
  h,
  capacidad,
  theme,
}: {
  w: number;
  h: number;
  capacidad: number;
  theme: ShapeTheme;
}) {
  const chairW = Math.min(28, Math.max(16, Math.min(w, h) * 0.35));
  const chairD = Math.max(8, chairW * 0.42);
  const offset = 4; // Distancia hacia afuera del borde

  // Distribuir sillas entre los lados
  const chairs: { x: number; y: number; w: number; h: number; rx: number }[] = [];

  if (capacidad <= 2) {
    // 2 sillas: una arriba y una abajo
    chairs.push({ x: (w - chairW) / 2, y: -chairD + offset, w: chairW, h: chairD, rx: 4 });
    chairs.push({ x: (w - chairW) / 2, y: h - offset, w: chairW, h: chairD, rx: 4 });
  } else if (capacidad <= 4) {
    // 4 sillas: 1 en cada lado
    chairs.push({ x: (w - chairW) / 2, y: -chairD + offset, w: chairW, h: chairD, rx: 4 });
    chairs.push({ x: (w - chairW) / 2, y: h - offset, w: chairW, h: chairD, rx: 4 });
    chairs.push({ x: -chairD + offset, y: (h - chairW) / 2, w: chairD, h: chairW, rx: 4 });
    chairs.push({ x: w - offset, y: (h - chairW) / 2, w: chairD, h: chairW, rx: 4 });
  } else {
    // 6 o más sillas: distribuir a lo largo del lado mayor
    const longSideCount = Math.floor((capacidad - (capacidad >= 8 ? 2 : 0)) / 2);
    const step = w / (longSideCount + 1);

    for (let i = 1; i <= longSideCount; i++) {
      const cx = step * i - chairW / 2;
      chairs.push({ x: cx, y: -chairD + offset, w: chairW, h: chairD, rx: 4 });
      chairs.push({ x: cx, y: h - offset, w: chairW, h: chairD, rx: 4 });
    }

    if (capacidad >= 8) {
      // Cabeceras
      chairs.push({ x: -chairD + offset, y: (h - chairW) / 2, w: chairD, h: chairW, rx: 4 });
      chairs.push({ x: w - offset, y: (h - chairW) / 2, w: chairD, h: chairW, rx: 4 });
    }
  }

  return (
    <g className="pointer-events-none">
      {chairs.map((c, idx) => (
        <rect
          key={idx}
          x={c.x}
          y={c.y}
          width={c.w}
          height={c.h}
          rx={c.rx}
          fill={theme.chairBg}
          stroke={theme.chairBorder}
          strokeWidth={1.8}
        />
      ))}
    </g>
  );
}

/**
 * Renderizado de sillas para mesas redondas dispuestas radialmente.
 */
function RoundChairs({
  w,
  h,
  capacidad,
  theme,
}: {
  w: number;
  h: number;
  capacidad: number;
  theme: ShapeTheme;
}) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2;
  const chairW = Math.min(26, Math.max(16, r * 0.45));
  const chairD = Math.max(8, chairW * 0.45);
  const dist = r - chairD * 0.35;

  const count = Math.max(2, capacidad);
  const chairs: { x: number; y: number; angle: number }[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    chairs.push({
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
      angle: (angle * 180) / Math.PI + 90,
    });
  }

  return (
    <g className="pointer-events-none">
      {chairs.map((c, idx) => (
        <g key={idx} transform={`translate(${c.x} ${c.y}) rotate(${c.angle})`}>
          <rect
            x={-chairW / 2}
            y={-chairD / 2}
            width={chairW}
            height={chairD}
            rx={4}
            fill={theme.chairBg}
            stroke={theme.chairBorder}
            strokeWidth={1.8}
          />
        </g>
      ))}
    </g>
  );
}

/**
 * Componente principal para representar una MESA con estilo arquitectónico lúcido.
 */
export function ArchitecturalTableView({
  item,
  error,
  badge,
}: {
  item: Extract<FloorItem, { kind: "mesa" }>;
  error: boolean;
  /** Reemplaza la cápsula de capacidad (ej. `#42` con pedido abierto, spec 018). */
  badge?: string;
}) {
  const theme = error ? TABLE_THEMES.ERROR : TABLE_THEMES[item.estado] ?? TABLE_THEMES.LIBRE;
  const w = item.ancho;
  const h = item.alto;
  const minDim = Math.min(w, h);
  const fontSize = Math.max(13, Math.min(20, minDim * 0.24));
  const badgeFontSize = Math.max(9, fontSize * 0.62);
  const capsule = badge ?? `${item.capacidad} pers.`;
  const capsuleWidth = badge ? capsule.length * badgeFontSize * 0.66 + badgeFontSize * 1.3 : fontSize * 3;

  return (
    <g>
      {/* Sillas por debajo del tablero */}
      {item.forma === "REDONDA" ? (
        <RoundChairs w={w} h={h} capacidad={item.capacidad} theme={theme} />
      ) : (
        <RectChairs w={w} h={h} capacidad={item.capacidad} theme={theme} />
      )}

      {/* Tablero de la mesa */}
      {item.forma === "REDONDA" ? (
        <>
          <ellipse
            cx={w / 2}
            cy={h / 2}
            rx={w / 2 - 2}
            ry={h / 2 - 2}
            fill={theme.tableBg}
            stroke={theme.tableBorder}
            strokeWidth={2.5}
            className="transition-colors"
          />
          {/* Aro decorativo sutil en el borde interior */}
          <ellipse
            cx={w / 2}
            cy={h / 2}
            rx={w / 2 - 7}
            ry={h / 2 - 7}
            fill="none"
            stroke={theme.tableBorder}
            strokeWidth={0.8}
            strokeDasharray="4 3"
            opacity={0.4}
            className="pointer-events-none"
          />
        </>
      ) : (
        <>
          <rect
            x={2}
            y={2}
            width={w - 4}
            height={h - 4}
            rx={Math.min(14, minDim * 0.16)}
            fill={theme.tableBg}
            stroke={theme.tableBorder}
            strokeWidth={2.5}
            className="transition-colors"
          />
          {/* Filete decorativo sutil */}
          <rect
            x={7}
            y={7}
            width={w - 14}
            height={h - 14}
            rx={Math.max(4, Math.min(10, minDim * 0.12))}
            fill="none"
            stroke={theme.tableBorder}
            strokeWidth={0.8}
            strokeDasharray="4 3"
            opacity={0.35}
            className="pointer-events-none"
          />
        </>
      )}

      {/* Identificador de la mesa (M1, M2, etc.) */}
      <text
        x={w / 2}
        y={h / 2 - fontSize * 0.3}
        textAnchor="middle"
        dominantBaseline="central"
        fill={theme.textColor}
        fontWeight="bold"
        fontSize={fontSize}
        className="pointer-events-none select-none tracking-tight font-sans"
      >
        {item.codigo}
      </text>

      {/* Cápsula: capacidad o `#pedido` cuando hay cuenta abierta (spec 018) */}
      <g transform={`translate(${w / 2} ${h / 2 + fontSize * 0.85})`} className="pointer-events-none select-none">
        <rect
          x={-capsuleWidth / 2}
          y={-badgeFontSize * 0.85}
          width={capsuleWidth}
          height={badgeFontSize * 1.7}
          rx={badgeFontSize * 0.85}
          fill={theme.badgeBg}
        />
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          fill={theme.badgeText}
          fontWeight="600"
          fontSize={badgeFontSize}
          className="font-sans"
        >
          {capsule}
        </text>
      </g>
    </g>
  );
}

/**
 * Componente principal para representar ELEMENTOS con simbología arquitectónica lúcida.
 */
export function ArchitecturalElementView({
  item,
  error,
}: {
  item: Extract<FloorItem, { kind: "elemento" }>;
  error: boolean;
}) {
  const w = item.ancho;
  const h = item.alto;

  const renderContent = () => {
    switch (item.tipo) {
    case "BARRA": {
      // Mostrador con textura y taburetes alineados
      const stoolR = Math.min(10, Math.max(6, h * 0.22));
      const stoolCount = Math.max(2, Math.floor(w / (stoolR * 3.5)));
      const step = w / (stoolCount + 1);

      return (
        <g>
          {/* Taburetes de la barra a lo largo del frente */}
          <g className="pointer-events-none">
            {Array.from({ length: stoolCount }).map((_, idx) => (
              <circle
                key={idx}
                cx={step * (idx + 1)}
                cy={h + stoolR * 0.8}
                r={stoolR}
                fill="#e0f2fe"
                stroke="#0284c7"
                strokeWidth={1.8}
              />
            ))}
          </g>

          {/* Barra principal */}
          <rect
            x={1}
            y={1}
            width={w - 2}
            height={h - 2}
            rx={8}
            fill="#f0f9ff"
            stroke="#0284c7"
            strokeWidth={2.5}
          />
          {/* Borde biselado interior */}
          <line x1={8} y1={h * 0.35} x2={w - 8} y2={h * 0.35} stroke="#38bdf8" strokeWidth={1.2} opacity={0.6} />

          <text
            x={w / 2}
            y={h / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#0369a1"
            fontWeight="bold"
            fontSize={Math.max(12, Math.min(18, h * 0.35))}
            className="pointer-events-none select-none tracking-wider uppercase font-sans"
          >
            {item.etiqueta || "Barra"}
          </text>
        </g>
      );
    }

    case "PARED": {
      // Muro arquitectónico sólido
      return (
        <g>
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            rx={2}
            fill="#1e293b"
            stroke="#0f172a"
            strokeWidth={1.5}
          />
          {/* Trama rayada arquitectónica sutil */}
          <rect x={1} y={1} width={Math.max(0, w - 2)} height={Math.max(0, h - 2)} fill="#334155" opacity={0.6} />
        </g>
      );
    }

    case "PUERTA": {
      // Simbología arquitectónica: Marco + hoja de puerta + arco de apertura de 90°
      const radius = Math.min(w, 80);
      return (
        <g>
          {/* Marco base */}
          <rect x={0} y={0} width={w} height={h} rx={2} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1.5} />
          {/* Arco de apertura de 90° punteado */}
          <path
            d={`M 0 ${h} A ${radius} ${radius} 0 0 1 ${radius} 0`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={1.8}
            strokeDasharray="4 3"
            opacity={0.85}
          />
          {/* Hoja de la puerta abierta a 90° */}
          <line x1={0} y1={h} x2={0} y2={0} stroke="#d97706" strokeWidth={3} strokeLinecap="round" />
          {/* Pivote */}
          <circle cx={0} cy={h} r={3} fill="#d97706" />
        </g>
      );
    }

    case "VENTANA": {
      // Simbología arquitectónica de ventana: marco exterior con doble línea de cristal
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={1} fill="#e0f2fe" stroke="#0284c7" strokeWidth={1.5} />
          {/* Cristales gemelos */}
          <line x1={4} y1={h / 2} x2={w - 4} y2={h / 2} stroke="#38bdf8" strokeWidth={1.5} />
          <line x1={w / 2} y1={0} x2={w / 2} y2={h} stroke="#0284c7" strokeWidth={1.5} opacity={0.5} />
        </g>
      );
    }

    case "COLUMNA": {
      // Pilar arquitectónico con cruz estructural
      return (
        <g>
          <rect x={1} y={1} width={w - 2} height={h - 2} rx={4} fill="#e2e8f0" stroke="#475569" strokeWidth={2} />
          <line x1={2} y1={2} x2={w - 2} y2={h - 2} stroke="#94a3b8" strokeWidth={1.2} />
          <line x1={w - 2} y1={2} x2={2} y2={h - 2} stroke="#94a3b8" strokeWidth={1.2} />
        </g>
      );
    }

    case "PLANTA": {
      // Planta vista cenital con maceta y hojas orgánicas
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2 - 2;

      return (
        <g>
          {/* Maceta exterior */}
          <circle cx={cx} cy={cy} r={r} fill="#dcfce7" stroke="#16a34a" strokeWidth={2} />
          {/* Centro de tierra */}
          <circle cx={cx} cy={cy} r={r * 0.4} fill="#86efac" />
          {/* 4 pétalos/hojas cenitales */}
          <ellipse cx={cx} cy={cy - r * 0.45} rx={r * 0.3} ry={r * 0.45} fill="#22c55e" opacity={0.8} />
          <ellipse cx={cx} cy={cy + r * 0.45} rx={r * 0.3} ry={r * 0.45} fill="#22c55e" opacity={0.8} />
          <ellipse cx={cx - r * 0.45} cy={cy} rx={r * 0.45} ry={r * 0.3} fill="#16a34a" opacity={0.8} />
          <ellipse cx={cx + r * 0.45} cy={cy} rx={r * 0.45} ry={r * 0.3} fill="#16a34a" opacity={0.8} />
        </g>
      );
    }

    case "BANO": {
      // Baños con símbolo universal
      return (
        <g>
          <rect x={1} y={1} width={w - 2} height={h - 2} rx={8} fill="#f8fafc" stroke="#64748b" strokeWidth={2} />
          {/* Suelo alicatado sutil */}
          <line x1={1} y1={h / 2} x2={w - 1} y2={h / 2} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" />
          <line x1={w / 2} y1={1} x2={w / 2} y2={h - 1} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="4 4" />

          {/* Icono WC */}
          <text
            x={w / 2}
            y={h / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#334155"
            fontWeight="bold"
            fontSize={Math.max(12, Math.min(18, Math.min(w, h) * 0.3))}
            className="pointer-events-none select-none tracking-wider font-sans"
          >
            WC
          </text>
        </g>
      );
    }

    case "CAJA": {
      // Mostrador de caja y POS
      return (
        <g>
          <rect x={1} y={1} width={w - 2} height={h - 2} rx={8} fill="#f0fdf4" stroke="#16a34a" strokeWidth={2} />
          {/* Pantalla POS vista arriba */}
          <rect x={w * 0.2} y={h * 0.18} width={w * 0.6} height={h * 0.32} rx={3} fill="#bbf7d0" stroke="#15803d" strokeWidth={1.2} />
          <text
            x={w / 2}
            y={h * 0.72}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#15803d"
            fontWeight="bold"
            fontSize={Math.max(11, Math.min(15, h * 0.28))}
            className="pointer-events-none select-none tracking-wide font-sans"
          >
            {item.etiqueta || "Caja"}
          </text>
        </g>
      );
    }

    case "COCINA": {
      // Estación de cocina y fuegos
      return (
        <g>
          <rect x={1} y={1} width={w - 2} height={h - 2} rx={8} fill="#f1f5f9" stroke="#475569" strokeWidth={2} />
          {/* Fuegos / hornillas estilizados */}
          <circle cx={w * 0.3} cy={h * 0.35} r={Math.min(12, h * 0.2)} fill="#e2e8f0" stroke="#64748b" strokeWidth={1.5} />
          <circle cx={w * 0.7} cy={h * 0.35} r={Math.min(12, h * 0.2)} fill="#e2e8f0" stroke="#64748b" strokeWidth={1.5} />
          <text
            x={w / 2}
            y={h * 0.75}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#334155"
            fontWeight="bold"
            fontSize={Math.max(11, Math.min(16, h * 0.24))}
            className="pointer-events-none select-none tracking-wider uppercase font-sans"
          >
            {item.etiqueta || "Cocina"}
          </text>
        </g>
      );
    }

    case "TEXTO":
    default: {
      return (
        <g>
          <rect x={0} y={0} width={w} height={h} rx={6} fill="transparent" stroke="none" />
          <text
            x={w / 2}
            y={h / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#0b2a4a"
            fontWeight="bold"
            fontSize={Math.max(13, Math.min(22, h * 0.65))}
            className="pointer-events-none select-none font-sans"
          >
            {item.etiqueta || "Texto"}
          </text>
        </g>
      );
    }
  }
};

  return (
    <g>
      {renderContent()}
      {error && (
        <rect
          x={-2}
          y={-2}
          width={w + 4}
          height={h + 4}
          rx={4}
          fill="rgba(239, 68, 68, 0.15)"
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="4 2"
          className="pointer-events-none"
        />
      )}
    </g>
  );
}
