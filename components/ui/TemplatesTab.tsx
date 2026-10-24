"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { CharacterId } from "@/data/types";
import { useStore } from "@/lib/store";
import { templatesFor } from "@/lib/templates";
import { contentTiles, tilePiece } from "@/lib/tiling";
import { fmtLen } from "@/lib/units";
import { PieceThumb } from "./PieceSvg";
import { SectionHeading } from "./Section";

export function TemplatesTab({ character }: { character: CharacterId }) {
  const uvi = useStore((s) => s.uvi);
  const ruvi = useStore((s) => s.ruvi);
  const unit = useStore((s) => s.unit);
  const pieces = useMemo(() => templatesFor(character, uvi, ruvi), [character, uvi, ruvi]);
  const totalPages = 1 + pieces.reduce((n, p) => n + contentTiles(p.outline, tilePiece(p.bbox)).length, 0);

  return (
    <div>
      <SectionHeading kicker="Trace the shapes" title="Templates" />
      <p className="max-w-3xl text-fog">
        Flat patterns generated from the geometry and your measurements. They print at true 1:1 scale on A4 with 1 cm overlaps, crop marks and page
        labels (A1, A2, B1…). Page 1 has a 10 cm calibration square.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href={`/${character}/print`} className="inline-flex rounded-full min-h-11 items-center bg-blood px-5 font-heading text-lg text-bandage hover:bg-blood-bright">
          Open print view ({totalPages} pages)
        </Link>
        <p className="text-sm text-sick">Check your printer scale: print at 100% / “Actual size”, never “Fit to page”.</p>
      </div>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pieces.map((p) => {
          const t = tilePiece(p.bbox);
          const pages = contentTiles(p.outline, t).length;
          return (
            <li key={p.id} className="panel overflow-hidden">
              <PieceThumb piece={p} unit={unit} />
              <div className="p-4">
                <h3 className="font-heading text-lg text-bandage">{p.name}</h3>
                <p className="mt-1 text-sm text-fog">{p.instructions}</p>
                <p className="mt-2 text-xs text-fog-dim">
                  {fmtLen(p.bbox.maxX - p.bbox.minX, unit, 0)} × {fmtLen(p.bbox.maxY - p.bbox.minY, unit, 0)} · {pages} page
                  {pages > 1 ? "s" : ""} ({t.rows} × {t.cols} grid)
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
