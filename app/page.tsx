import fs from "node:fs";
import path from "node:path";
import { Landing } from "@/components/ui/Landing";
import type { CharacterId } from "@/data/types";
import type { HeroAsset } from "@/lib/heroState";

/**
 * Hero priority: .glb model > 4 separate frames > character sheet > procedural original figure.
 * Checked at build time against /public.
 */
function detect(id: CharacterId): HeroAsset {
  const pub = path.join(process.cwd(), "public");
  const has = (p: string) => fs.existsSync(path.join(pub, p));
  if (has(`models/${id}.glb`)) return { kind: "glb", url: `/models/${id}.glb` };
  const frames = [1, 2, 3, 4].map((i) => [`characters/${id}-${i}.webp`, `characters/${id}-${i}.png`].find(has));
  if (frames.every(Boolean)) return { kind: "frames", urls: frames.map((f) => `/${f}`) };
  const sheet = [`characters/${id}-sheet.webp`, `characters/${id}-sheet.png`].find(has);
  if (sheet) return { kind: "sheet", url: `/${sheet}` };
  return { kind: "procedural" };
}

export default function Home() {
  const assets = { uvi: detect("uvi"), ruvi: detect("ruvi") };
  return <Landing assets={assets} />;
}
