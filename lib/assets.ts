import fs from "node:fs";
import path from "node:path";
import type { CharacterId } from "@/data/types";
import type { HeroAsset } from "./heroState";

/** Server-only: which hero assets exist in /public (checked at build time). */
const pub = path.join(process.cwd(), "public");
const has = (p: string) => fs.existsSync(path.join(pub, p));

/** Priority: .glb model > 4 separate frames > character sheet > procedural original figure. */
export function detectHeroAsset(id: CharacterId): HeroAsset {
  if (has(`models/${id}.glb`)) return { kind: "glb", url: `/models/${id}.glb` };
  const frames = [1, 2, 3, 4].map((i) => [`characters/${id}-${i}.webp`, `characters/${id}-${i}.png`].find(has));
  if (frames.every(Boolean)) return { kind: "frames", urls: frames.map((f) => `/${f}`) };
  const sheet = [`characters/${id}-sheet.webp`, `characters/${id}-sheet.png`].find(has);
  if (sheet) return { kind: "sheet", url: `/${sheet}` };
  return { kind: "procedural" };
}

export interface PosterArt {
  src: string;
  /** Frames across the image (4 for a sheet, 1 for a single frame). */
  frames: number;
  /** Which frame to show (0-based). */
  frame: number;
  width: number;
  height: number;
}

/** Key art for poster headers and episode cards: the front ¾ frame of the sheet (or frame 1). */
export function posterArt(id: CharacterId, frame = 0): PosterArt | null {
  const a = detectHeroAsset(id);
  // Prefer the per-frame slices made by scripts/slice-frames.mjs (a quarter of the bytes).
  const sliced = `characters/generated/${id}-frame-${frame + 1}.webp`;
  if (a.kind === "sheet" && has(sliced)) return { src: `/${sliced}`, frames: 1, frame: 0, width: 384, height: 1024 };
  if (a.kind === "frames") return { src: a.urls[frame] ?? a.urls[0], frames: 1, frame: 0, width: 384, height: 1024 };
  if (a.kind === "sheet") return { src: a.url, frames: 4, frame, width: 1536, height: 1024 };
  return null;
}
