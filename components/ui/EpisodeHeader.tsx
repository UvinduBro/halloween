"use client";

import Link from "next/link";
import type { CharacterMeta, StepGroup } from "@/data/types";
import type { PosterArt as Art } from "@/lib/assets";
import { useStore } from "@/lib/store";
import { PosterArt } from "./PosterArt";
import { DeferredPosterArt } from "./DeferredPosterArt";
import { stepCheckId } from "./StepList";
import { RT } from "./Vars";

/** Streaming-poster style header for a character hub. */
export function EpisodeHeader({
  meta,
  groups,
  poster,
  thumbs,
  onPlay,
}: {
  meta: CharacterMeta;
  groups: StepGroup[];
  poster: Art | null;
  thumbs: (Art | null)[];
  onPlay: (groupId: string, index: number) => void;
}) {
  const checks = useStore((s) => s.checks);
  const all = groups.flatMap((g) => g.steps.map((st, i) => ({ g, st, i, done: !!checks[stepCheckId(meta.id, g.id, st.id)] })));
  const done = all.filter((x) => x.done).length;
  const pct = Math.round((done / all.length) * 100);
  const next = all.filter((x) => !x.done).slice(0, 2);
  const resume = next[0] ?? all[0];

  return (
    <header
      className="relative mt-4 overflow-hidden rounded-[2rem] border border-fog/15 bg-ash"
      style={{ ["--accent" as string]: meta.accent }}
    >
      <div className="relative grid gap-8 p-6 sm:p-10 lg:min-h-[600px] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_minmax(320px,380px)]">
        <div className="flex flex-col justify-center">
          <p className="font-heading text-xs uppercase tracking-[0.4em]" style={{ color: meta.accent }}>
            Episode {meta.episode.number} · {meta.episode.genre}
          </p>
          <h1 className="font-display glitch mt-3 text-[clamp(5rem,15vw,10rem)] text-bandage">{meta.name}</h1>
          <p className="font-display title-outline mt-2 text-[clamp(2.2rem,5vw,3.6rem)] leading-[0.95]">{meta.episode.subtitle}</p>
          <p className="mt-4 text-sm uppercase tracking-[0.3em] text-fog-dim">Worn by {meta.wearer}</p>
          <div className="mt-6 h-1.5 max-w-sm overflow-hidden rounded-full bg-fog/10" role="progressbar" aria-label="Build progress" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-fog-dim">
            {pct}% built · {done}/{all.length} steps
          </p>
        </div>

        <div className="hidden lg:block" aria-hidden="true" />

        {/* key art: in the flow on phones, centre stage behind the columns on desktop */}
        <div
          className="pointer-events-none relative -mx-6 h-80 sm:-mx-10 lg:absolute lg:inset-y-0 lg:left-[33%] lg:mx-0 lg:h-auto lg:w-[36%]"
          aria-hidden="true"
        >
          <div className="absolute inset-0" style={{ background: `radial-gradient(45% 55% at 50% 45%, ${meta.accent}33, transparent 70%)` }} />
          <div className="poster-fade absolute inset-0 flex items-end justify-center">
            <PosterArt art={poster} alt="" frameVw={[70, 16]} priority className="h-[112%] translate-y-[4%] lg:h-[104%] lg:translate-y-[3%]" />
          </div>
        </div>

        <div className="flex flex-col justify-center lg:items-end">
          <div className="panel w-full max-w-md p-5 lg:max-w-none">
            <p className="font-heading text-lg uppercase tracking-[0.12em]" style={{ color: meta.accent }}>
              {meta.tagline}!
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="chip">2026</span>
              <span className="chip chip-accent">{meta.episode.rating}</span>
              <span className="chip">{meta.episode.runtime}</span>
              <span className="chip">{all.length} steps</span>
            </div>
            <p className="mt-3 text-fog">{meta.episode.logline}</p>
            <RT as="p" className="mt-2 text-sm text-fog-dim" text={meta.overview[0]} />
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" className="btn-play" onClick={() => onPlay(resume.g.id, resume.i)}>
                <span aria-hidden="true">▶</span> {done ? "Resume" : "Play"}
              </button>
              <Link href={`/${meta.id}/print`} className="btn-ghost">
                Templates
              </Link>
              <a href="#3d" className="btn-ghost">
                Turntable
              </a>
            </div>
            {next.length > 0 && (
              <>
                <p className="mt-6 text-xs uppercase tracking-[0.3em] text-fog-dim">What&apos;s next?</p>
                <ul className="mt-2 grid grid-cols-2 gap-3">
                  {next.map((x, k) => (
                    <li key={x.st.id}>
                      <button
                        type="button"
                        onClick={() => onPlay(x.g.id, x.i)}
                        className="group relative block h-32 w-full overflow-hidden rounded-xl border border-fog/15 bg-ash-3 text-left"
                      >
                        <DeferredPosterArt
                          art={thumbs[k] ?? null}
                          alt=""
                          frameVw={[30, 7]}
                          className="absolute left-1/2 top-0 h-[180%] -translate-x-1/2 opacity-70 grayscale transition duration-500 group-hover:scale-105 group-hover:grayscale-0"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ash via-ash/80 to-transparent px-2.5 pb-2 pt-8">
                          <span className="block text-[10px] uppercase tracking-widest" style={{ color: meta.accent }}>
                            {x.g.title} · {String(x.i + 1).padStart(2, "0")}
                          </span>
                          <span className="block font-heading text-sm leading-tight text-bandage">{x.st.title}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
