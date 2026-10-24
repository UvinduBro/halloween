"use client";

import Link from "next/link";
import { ruviMeta, ruviSteps, weatheringSteps } from "@/data/ruvi";
import { paintSteps, uviMeta, uviSteps } from "@/data/uvi";
import type { CharacterId, StepGroup } from "@/data/types";
import type { PosterArt as Art } from "@/lib/assets";
import { useStore } from "@/lib/store";
import { DeferredPosterArt as PosterArt } from "../DeferredPosterArt";
import { stepCheckId } from "../StepList";

const META = { uvi: uviMeta, ruvi: ruviMeta };
const GROUPS: Record<CharacterId, StepGroup[]> = { uvi: [...uviSteps, paintSteps], ruvi: [...ruviSteps, weatheringSteps] };

export function useBuildProgress(id: CharacterId) {
  const checks = useStore((s) => s.checks);
  const ids = GROUPS[id].flatMap((g) => g.steps.map((st) => stepCheckId(id, g.id, st.id)));
  const done = ids.filter((x) => checks[x]).length;
  return { done, total: ids.length, pct: Math.round((done / ids.length) * 100) };
}

function EpisodeCard({ id, art }: { id: CharacterId; art: Art | null }) {
  const m = META[id];
  const p = useBuildProgress(id);
  return (
    <article
      className="panel group relative grid overflow-hidden sm:grid-cols-[42%_1fr]"
      style={{ ["--accent" as string]: m.accent }}
      aria-labelledby={`ep-${id}`}
    >
      <div className="relative h-72 overflow-hidden bg-gradient-to-b from-ash-3 to-ash sm:h-full">
        <div
          className="absolute inset-0 opacity-40"
          style={{ background: `radial-gradient(60% 50% at 50% 40%, ${m.accent}55, transparent 70%)` }}
          aria-hidden="true"
        />
        <PosterArt
          art={art}
          alt={`${m.name} character art, front view`}
          frameVw={[40, 14]}
          className="absolute bottom-0 left-1/2 h-[112%] -translate-x-1/2 transition duration-700 group-hover:scale-[1.04]"
        />
        <span className="font-display absolute left-4 top-3 text-6xl text-bandage/10" aria-hidden="true">
          {m.episode.number}
        </span>
      </div>
      <div className="flex flex-col p-6">
        <p className="font-heading text-xs uppercase tracking-[0.35em]" style={{ color: m.accent }}>
          Episode {m.episode.number} · {m.episode.genre}
        </p>
        <h3 id={`ep-${id}`} className="font-display mt-2 text-6xl text-bandage">
          {m.name}
        </h3>
        <p className="font-display title-outline mt-2 text-3xl">{m.episode.subtitle}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="chip">2026</span>
          <span className="chip chip-accent">{m.episode.rating}</span>
          <span className="chip">{m.episode.runtime}</span>
          <span className="chip">Worn by {m.wearer}</span>
        </div>
        <p className="mt-4 text-fog">{m.episode.logline}</p>
        <div className="mt-5" aria-label={`${m.name} build progress ${p.pct}%`}>
          <div className="flex justify-between text-xs uppercase tracking-widest text-fog-dim">
            <span>Built</span>
            <span className="tabular-nums">
              {p.done}/{p.total} steps
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-fog/10">
            <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: m.accent }} />
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-3 pt-6">
          <Link href={`/${id}`} className="btn-play">
            <span aria-hidden="true">▶</span> Play
          </Link>
          <Link href={`/${id}#3d`} className="btn-ghost">
            Watch the turntable
          </Link>
        </div>
      </div>
    </article>
  );
}

export function EpisodeCards({ posters }: { posters: Record<CharacterId, Art | null> }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <EpisodeCard id="uvi" art={posters.uvi} />
      <EpisodeCard id="ruvi" art={posters.ruvi} />
    </div>
  );
}
