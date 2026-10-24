import type { MeasureFigure as Kind } from "@/data/types";

/* Small inline SVGs showing where to put the tape. Neutral mannequin silhouettes, 100 × 140 viewBox. */

const body = (
  <g fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55">
    <ellipse cx="50" cy="16" rx="8" ry="10" />
    <path d="M46 26 v5 M54 26 v5" />
    <path d="M30 34 Q50 29 70 34 L73 60 Q68 66 66 74 L67 92 Q50 96 33 92 L34 74 Q32 66 27 60 Z" />
    <path d="M30 34 L20 62 L18 82 M70 34 L80 62 L82 82" />
    <path d="M38 93 L36 136 M62 93 L64 136" />
  </g>
);

const headFront = (
  <g fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55">
    <ellipse cx="50" cy="60" rx="26" ry="34" />
    <path d="M36 56 h8 M56 56 h8" />
    <path d="M50 60 v10 M44 80 q6 4 12 0" />
    <path d="M22 62 q-4 6 0 12 M78 62 q4 6 0 12" />
    <path d="M40 94 v24 M60 94 v24" />
  </g>
);

const headSide = (
  <g fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55">
    <path d="M30 40 Q34 20 56 22 Q80 26 78 56 Q76 78 64 92 L58 118 M30 40 Q24 52 26 60 L22 66 L27 69 L26 78 Q28 88 40 90 L44 118" />
    <path d="M60 60 q-4 6 0 10" />
    <path d="M30 52 h4" />
  </g>
);

function Line({ d }: { d: string }) {
  const [x1, y1, x2, y2] = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  return (
    <g stroke="#c06a35" strokeWidth="2.2" strokeLinecap="round">
      <path d={d} fill="none" />
      <circle cx={x1} cy={y1} r="2" fill="#c06a35" />
      <circle cx={x2} cy={y2} r="2" fill="#c06a35" />
    </g>
  );
}

function Loop({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#c06a35" strokeWidth="2.2" strokeDasharray="4 2" />;
}

const figures: Record<Kind, { base: React.ReactNode; mark: React.ReactNode }> = {
  "shoulder-width": { base: body, mark: <Line d="M30 34 L70 34" /> },
  "shoulder-height": { base: body, mark: <Line d="M88 34 L88 136" /> },
  waist: { base: body, mark: <Loop cx={50} cy={64} rx={20} ry={3.5} /> },
  "waist-floor": { base: body, mark: <Line d="M88 64 L88 136" /> },
  "hat-shoulder": {
    base: (
      <>
        {body}
        <path d="M38 12 Q50 -2 62 12 L64 14 L36 14 Z" fill="#e9b949" opacity="0.55" />
      </>
    ),
    mark: <Line d="M84 4 L84 34" />,
  },
  "head-circ": { base: headFront, mark: <Loop cx={50} cy={44} rx={28} ry={5} /> },
  "head-length": { base: headSide, mark: <Line d="M24 44 L80 44" /> },
  "head-width": { base: headFront, mark: <Line d="M22 52 L78 52" /> },
  "chin-crown": { base: headSide, mark: <Line d="M88 22 L88 90" /> },
  "chin-eyes": { base: headFront, mark: <Line d="M88 56 L88 94" /> },
  neck: { base: headFront, mark: <Loop cx={50} cy={108} rx={11} ry={3} /> },
  bust: { base: body, mark: <Loop cx={50} cy={46} rx={22} ry={3.5} /> },
  hips: { base: body, mark: <Loop cx={50} cy={84} rx={19} ry={3.5} /> },
  "dress-length": { base: body, mark: <Line d="M88 32 L88 110" /> },
  "upper-arm": { base: body, mark: <Loop cx={24} cy={48} rx={6} ry={2.5} /> },
};

export function MeasureFigure({ kind, label }: { kind: Kind; label: string }) {
  const f = figures[kind];
  return (
    <svg viewBox="0 0 100 140" className="h-28 w-20 shrink-0 text-fog" role="img" aria-label={`Diagram: how to measure ${label.toLowerCase()}`}>
      {f.base}
      {f.mark}
    </svg>
  );
}
