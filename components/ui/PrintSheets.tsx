"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { CharacterId } from "@/data/types";
import { site } from "@/data/site";
import { useStore } from "@/lib/store";
import { templatesFor, type TemplatePiece } from "@/lib/templates";
import { contentTiles, OVERLAP, PAGE, tilePiece, type Tile, type Tiling } from "@/lib/tiling";
import { fmtLen } from "@/lib/units";
import { PATH_STYLE, PieceGroup } from "./PieceSvg";

const FONT = "Helvetica, Arial, sans-serif";

function Sheet({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="print-sheet mx-auto shadow-2xl">
      <svg
        className="pdf-page block"
        width="210mm"
        height="297mm"
        viewBox={`0 0 ${PAGE.w} ${PAGE.h}`}
        role="img"
        aria-label={label}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="0" y="0" width={PAGE.w} height={PAGE.h} fill="#fff" />
        {children}
      </svg>
    </div>
  );
}

function CropMarks({ tiling, tile }: { tiling: Tiling; tile: Tile }) {
  const o = OVERLAP;
  const hasLeft = tile.col > 0;
  const hasTop = tile.row > 0;
  const hasRight = tile.col < tiling.cols - 1;
  const hasBottom = tile.row < tiling.rows - 1;
  const len = 0.6;
  const stroke = { stroke: "#000", strokeWidth: 0.02 };
  const marks: React.ReactNode[] = [];
  // overlap zones (shaded) on the leading edges: trim these and glue under the neighbour
  if (hasLeft) marks.push(<rect key="l" x={0} y={0} width={o} height={PAGE.h} fill="rgba(0,0,0,0.05)" />);
  if (hasTop) marks.push(<rect key="t" x={0} y={0} width={PAGE.w} height={o} fill="rgba(0,0,0,0.05)" />);
  // trim lines
  if (hasLeft) marks.push(<line key="lt" x1={o} y1={0} x2={o} y2={PAGE.h} {...stroke} strokeDasharray="0.3 0.3" />);
  if (hasTop) marks.push(<line key="tt" x1={0} y1={o} x2={PAGE.w} y2={o} {...stroke} strokeDasharray="0.3 0.3" />);
  // corner crop marks at the overlap lines
  const xs = [hasLeft ? o : null, hasRight ? PAGE.w - o : null].filter((v): v is number => v !== null);
  const ys = [hasTop ? o : null, hasBottom ? PAGE.h - o : null].filter((v): v is number => v !== null);
  for (const x of xs) {
    marks.push(<line key={`cx${x}a`} x1={x} y1={0} x2={x} y2={len} {...stroke} />);
    marks.push(<line key={`cx${x}b`} x1={x} y1={PAGE.h - len} x2={x} y2={PAGE.h} {...stroke} />);
  }
  for (const y of ys) {
    marks.push(<line key={`cy${y}a`} x1={0} y1={y} x2={len} y2={y} {...stroke} />);
    marks.push(<line key={`cy${y}b`} x1={PAGE.w - len} y1={y} x2={PAGE.w} y2={y} {...stroke} />);
  }
  return <g>{marks}</g>;
}

function TilePage({ piece, tiling, tile, unit, pageNo, total }: { piece: TemplatePiece; tiling: Tiling; tile: Tile; unit: "cm" | "in"; pageNo: number; total: number }) {
  const neighbours = [
    tile.col < tiling.cols - 1 && `→ ${tile.label.replace(/\d+$/, String(tile.col + 2))}`,
    tile.row < tiling.rows - 1 && `↓ ${String.fromCharCode(tile.label.charCodeAt(0) + 1)}${tile.col + 1}`,
  ].filter(Boolean);
  return (
    <Sheet label={`${piece.name}, page ${tile.label} of ${tiling.rows} by ${tiling.cols} grid`}>
      <g transform={`translate(${-tile.x} ${-tile.y})`}>
        <PieceGroup piece={piece} unit={unit} rotate={tiling.rotate} />
      </g>
      <CropMarks tiling={tiling} tile={tile} />
      <g fontFamily={FONT}>
        <text x={PAGE.w - 1.6} y={PAGE.h - 2.1} fontSize="1.4" textAnchor="end" fill="#000" fillOpacity="0.55">
          {tile.label}
        </text>
        <text x={PAGE.w - 1.6} y={PAGE.h - 1.4} fontSize="0.32" textAnchor="end" fill="#333">
          {piece.name} · {tiling.rows}×{tiling.cols} · {neighbours.join("  ")}
        </text>
        <text x={1.6} y={PAGE.h - 1.4} fontSize="0.3" fill="#555">
          p. {pageNo}/{total} · 1:1 · overlap 1 cm: trim the shaded strip, glue it under the neighbour
        </text>
      </g>
    </Sheet>
  );
}

function Legend({ x, y }: { x: number; y: number }) {
  const rows: [keyof typeof PATH_STYLE, string][] = [
    ["cut", "Cut line"],
    ["stitch", "Stitch line (seam allowance outside)"],
    ["fold", "Fold / bevel / centre line"],
    ["glue", "Former glue line"],
    ["window", "Window or slot (cut out)"],
    ["hole", "Hole"],
    ["guide", "Guide (do not cut)"],
  ];
  return (
    <g transform={`translate(${x} ${y})`} fontFamily={FONT}>
      {rows.map(([k, label], i) => {
        const s = PATH_STYLE[k];
        return (
          <g key={k} transform={`translate(0 ${i * 0.75})`}>
            <line x1={0} y1={0} x2={2} y2={0} stroke={s.stroke} strokeWidth={s.width * 1.5} strokeDasharray={s.dash} />
            <text x={2.4} y={0.15} fontSize="0.38" fill="#111">
              {label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function CoverPage({
  character,
  pieces,
  tilings,
  pageTiles,
  unit,
  firstPage,
  total,
}: {
  character: CharacterId;
  pieces: TemplatePiece[];
  tilings: Tiling[];
  pageTiles: Tile[][];
  unit: "cm" | "in";
  firstPage: number[];
  total: number;
}) {
  const sq = 10;
  return (
    <Sheet label={`${character.toUpperCase()} templates cover page with a 10 centimetre calibration square and page index`}>
      <g fontFamily={FONT} fill="#111">
        <text x={1.5} y={2.4} fontSize="1.1" fontWeight="bold">
          {character.toUpperCase()} · 1:1 templates
        </text>
        <text x={1.5} y={3.3} fontSize="0.42">
          A4 portrait · print at 100% (“Actual size”), no scaling, no “Fit to page”.
        </text>
        <text x={1.5} y={3.9} fontSize="0.42">
          Check your printer scale: the square must measure exactly 10 cm (3.94 in) on each side.
        </text>
      </g>
      <g transform="translate(1.5 4.8)">
        <rect x={0} y={0} width={sq} height={sq} fill="none" stroke="#000" strokeWidth="0.04" />
        {Array.from({ length: 11 }, (_, i) => (
          <g key={i}>
            <line x1={i} y1={0} x2={i} y2={i % 5 === 0 ? 0.8 : 0.4} stroke="#000" strokeWidth="0.02" />
            <line x1={0} y1={i} x2={i % 5 === 0 ? 0.8 : 0.4} y2={i} stroke="#000" strokeWidth="0.02" />
          </g>
        ))}
        <text x={sq / 2} y={sq / 2} fontSize="0.6" textAnchor="middle" fontFamily={FONT} fill="#111">
          10 cm × 10 cm
        </text>
        <text x={sq / 2} y={sq / 2 + 0.8} fontSize="0.38" textAnchor="middle" fontFamily={FONT} fill="#555">
          calibration square
        </text>
      </g>
      <Legend x={12.6} y={5.4} />
      <g fontFamily={FONT} fill="#111" transform="translate(1.5 16.6)">
        <text x={0} y={0} fontSize="0.55" fontWeight="bold">
          Pieces and pages
        </text>
        {pieces.map((p, i) => (
          <g key={p.id} transform={`translate(0 ${0.95 + i * 1.25})`}>
            <text x={0} y={0} fontSize="0.4" fontWeight="bold">
              {p.name}
            </text>
            <text x={0} y={0.5} fontSize="0.3" fill="#444">
              p. {firstPage[i]}–{firstPage[i] + pageTiles[i].length - 1} · {pageTiles[i].map((t) => t.label).join(" ")} · grid {tilings[i].rows}×{tilings[i].cols}, A1
              top-left ·{" "}
              {fmtLen(p.bbox.maxX - p.bbox.minX, unit, 0)} × {fmtLen(p.bbox.maxY - p.bbox.minY, unit, 0)}
              {tilings[i].rotate ? " · rotated 90°" : ""}
            </text>
          </g>
        ))}
      </g>
      <text x={1.5} y={PAGE.h - 1.4} fontSize="0.3" fontFamily={FONT} fill="#555">
        p. 1/{total} · {site.disclaimer}
      </text>
    </Sheet>
  );
}

export function PrintSheets({ character }: { character: CharacterId }) {
  const uvi = useStore((s) => s.uvi);
  const ruvi = useStore((s) => s.ruvi);
  const unit = useStore((s) => s.unit);
  const all = useMemo(() => templatesFor(character, uvi, ruvi), [character, uvi, ruvi]);
  const [excluded, setExcluded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const area = useRef<HTMLDivElement>(null);

  const pieces = all.filter((p) => !excluded[p.id]);
  const tilings = pieces.map((p) => tilePiece(p.bbox));
  const pageTiles = pieces.map((p, i) => contentTiles(p.outline, tilings[i]));
  const firstPage: number[] = [];
  let n = 2;
  for (const t of pageTiles) {
    firstPage.push(n);
    n += t.length;
  }
  const total = n - 1;

  const exportPdf = async () => {
    if (!area.current) return;
    setBusy(true);
    try {
      const { jsPDF } = await import("jspdf");
      await import("svg2pdf.js");
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      const svgs = Array.from(area.current.querySelectorAll<SVGSVGElement>("svg.pdf-page"));
      for (let i = 0; i < svgs.length; i++) {
        if (i) doc.addPage("a4", "portrait");
        await doc.svg(svgs[i], { x: 0, y: 0, width: 210, height: 297 });
      }
      doc.save(`${character}-templates-1to1.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="no-print mx-auto max-w-4xl px-4 py-8">
        <p className="font-heading text-xs uppercase tracking-[0.35em] text-sick">Trace the shapes</p>
        <h1 className="mt-1 font-heading text-4xl text-bandage">{character.toUpperCase()} · print templates</h1>
        <p className="mt-3 text-fog">
          {total} A4 pages at true 1:1 scale. Print at <strong className="text-bandage">100% / Actual size</strong>, A4 portrait, with no
          scaling. Measure the 10 cm square on page 1 before cutting anything. Dimensions follow the measurements in the Measure tab; labels are in{" "}
          {unit === "cm" ? "centimetres" : "inches"}.
        </p>
        <fieldset className="mt-4">
          <legend className="text-xs uppercase tracking-widest text-fog-dim">Include</legend>
          <div className="mt-1 flex flex-wrap gap-x-4">
            {all.map((p) => (
              <label key={p.id} className="flex min-h-11 items-center gap-2 text-sm text-fog">
                <input
                  type="checkbox"
                  className="size-5 accent-[#9FA87A]"
                  checked={!excluded[p.id]}
                  onChange={() => setExcluded((e) => ({ ...e, [p.id]: !e[p.id] }))}
                />
                {p.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => window.print()} className="min-h-11 bg-blood px-5 font-heading text-lg text-bandage hover:bg-blood-bright">
            Print
          </button>
          <button
            type="button"
            onClick={exportPdf}
            disabled={busy}
            className="min-h-11 border border-fog/30 px-5 text-fog hover:text-bandage disabled:opacity-50"
          >
            {busy ? "Building PDF…" : "Export PDF"}
          </button>
          <Link href={`/${character}#templates`} className="flex min-h-11 items-center px-3 text-fog-dim underline hover:text-bandage">
            Back to {character.toUpperCase()}
          </Link>
        </div>
      </div>
      <div ref={area} className="print-area flex flex-col gap-6 pb-16 [&_.print-sheet]:max-md:[zoom:0.42]">
        <CoverPage character={character} pieces={pieces} tilings={tilings} pageTiles={pageTiles} unit={unit} firstPage={firstPage} total={total} />
        {pieces.map((p, i) =>
          pageTiles[i].map((t, j) => (
            <TilePage key={`${p.id}-${t.label}`} piece={p} tiling={tilings[i]} tile={t} unit={unit} pageNo={firstPage[i] + j} total={total} />
          )),
        )}
      </div>
    </div>
  );
}
