import type { PathKind, TemplatePiece } from "@/lib/templates";
import type { Unit } from "@/lib/store";
import { fmtLen } from "@/lib/units";

/** Stroke styles in centimetres (the SVG user unit is 1 cm). Kept svg2pdf-friendly: no CSS, no vector-effect. */
export const PATH_STYLE: Record<PathKind, { stroke: string; width: number; dash?: string; fill?: string }> = {
  cut: { stroke: "#000", width: 0.06 },
  stitch: { stroke: "#444", width: 0.035, dash: "0.4 0.25" },
  fold: { stroke: "#1f4fa0", width: 0.04, dash: "0.8 0.25 0.15 0.25" },
  glue: { stroke: "#a3361f", width: 0.04, dash: "0.6 0.3" },
  window: { stroke: "#000", width: 0.045, dash: "0.3 0.2", fill: "rgba(0,0,0,0.06)" },
  mark: { stroke: "#000", width: 0.04 },
  hole: { stroke: "#000", width: 0.04, fill: "rgba(0,0,0,0.08)" },
  guide: { stroke: "#7a7a7a", width: 0.03, dash: "0.2 0.2" },
};

export function PieceGroup({ piece, unit, rotate = false, labelScale = 0.55 }: { piece: TemplatePiece; unit: Unit; rotate?: boolean; labelScale?: number }) {
  return (
    <g transform={rotate ? "rotate(90)" : undefined}>
      {piece.paths.map((p, i) => {
        const st = PATH_STYLE[p.kind];
        return (
          <path
            key={i}
            d={p.d}
            fill={st.fill ?? "none"}
            stroke={st.stroke}
            strokeWidth={st.width}
            strokeDasharray={st.dash}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        );
      })}
      {piece.labels.map((l, i) => {
        const text = l.lengthCm !== undefined ? fmtLen(l.lengthCm, unit) : l.text;
        return (
          <text
            key={i}
            x={l.x}
            y={l.y}
            fontSize={(l.size ?? 1) * labelScale}
            fontFamily="Helvetica, Arial, sans-serif"
            textAnchor={l.anchor ?? "middle"}
            dominantBaseline="middle"
            fill={l.lengthCm !== undefined ? "#a3361f" : "#111"}
            transform={l.rotate ? `rotate(${l.rotate} ${l.x} ${l.y})` : undefined}
          >
            {text}
          </text>
        );
      })}
    </g>
  );
}

/** A scaled-down preview of a piece. */
export function PieceThumb({ piece, unit }: { piece: TemplatePiece; unit: Unit }) {
  const b = piece.bbox;
  const pad = 3;
  const w = b.maxX - b.minX + pad * 2;
  const h = b.maxY - b.minY + pad * 2;
  return (
    <svg
      viewBox={`${b.minX - pad} ${b.minY - pad} ${w} ${h}`}
      className="h-48 w-full bg-bandage"
      role="img"
      aria-label={`Template preview: ${piece.name}, about ${fmtLen(b.maxX - b.minX, unit, 0)} by ${fmtLen(b.maxY - b.minY, unit, 0)}`}
    >
      <PieceGroup piece={piece} unit={unit} labelScale={0.7} />
    </svg>
  );
}
