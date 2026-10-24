import type { BBox } from "./geometry";

/** A4 portrait in cm. */
export const PAGE = { w: 21, h: 29.7 };
export const OVERLAP = 1;

export interface Tile {
  row: number;
  col: number;
  label: string;
  /** Top-left of the page in piece coordinates (cm). */
  x: number;
  y: number;
}

export interface Tiling {
  rotate: boolean;
  rows: number;
  cols: number;
  tiles: Tile[];
  /** Bounding box actually tiled (rotated if `rotate`). */
  box: BBox;
}

export function rowLabel(row: number) {
  let s = "";
  let n = row;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

export function countPages(w: number, h: number, page = PAGE, overlap = OVERLAP) {
  const cols = Math.max(1, Math.ceil((w - overlap) / (page.w - overlap)));
  const rows = Math.max(1, Math.ceil((h - overlap) / (page.h - overlap)));
  return { cols, rows };
}

/** Rotate a bbox by 90° (x, y) → (-y, x). */
export function rotateBox(b: BBox): BBox {
  return { minX: -b.maxY, maxX: -b.minY, minY: b.minX, maxY: b.maxX };
}

/**
 * Tile a piece's bounding box across A4 pages at 1:1 with `overlap` cm shared between
 * neighbouring pages. Chooses the orientation that needs fewer pages.
 * A margin keeps lines away from the unprintable edge where possible.
 */
export function tilePiece(bbox: BBox, margin = 1.2, allowRotate = true): Tiling {
  const pad = (b: BBox): BBox => ({ minX: b.minX - margin, minY: b.minY - margin, maxX: b.maxX + margin, maxY: b.maxY + margin });
  const options = [{ rotate: false, box: pad(bbox) }];
  if (allowRotate) options.push({ rotate: true, box: pad(rotateBox(bbox)) });
  const scored = options.map((o) => {
    const w = o.box.maxX - o.box.minX;
    const h = o.box.maxY - o.box.minY;
    const { cols, rows } = countPages(w, h);
    return { ...o, w, h, cols, rows, pages: cols * rows };
  });
  scored.sort((a, b) => a.pages - b.pages);
  const best = scored[0];
  const stepX = PAGE.w - OVERLAP;
  const stepY = PAGE.h - OVERLAP;
  // centre the content within the covered area
  const coveredW = best.cols * stepX + OVERLAP;
  const coveredH = best.rows * stepY + OVERLAP;
  const x0 = best.box.minX - (coveredW - best.w) / 2;
  const y0 = best.box.minY - (coveredH - best.h) / 2;
  const tiles: Tile[] = [];
  for (let r = 0; r < best.rows; r++)
    for (let c = 0; c < best.cols; c++)
      tiles.push({ row: r, col: c, label: `${rowLabel(r)}${c + 1}`, x: x0 + c * stepX, y: y0 + r * stepY });
  return { rotate: best.rotate, rows: best.rows, cols: best.cols, tiles, box: best.box };
}
