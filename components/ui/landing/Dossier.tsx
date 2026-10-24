"use client";

import { useMemo } from "react";
import { cast, site } from "@/data/site";
import { ruviMeta, ruviShopping, ruviSteps, weatheringSteps } from "@/data/ruvi";
import { paintSteps, uviMeta, uviShopping, uviSteps } from "@/data/uvi";
import type { CharacterId } from "@/data/types";
import type { PosterArt as Art } from "@/lib/assets";
import { useNow } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { templatesFor } from "@/lib/templates";
import { contentTiles, tilePiece } from "@/lib/tiling";
import { fmtM2 } from "@/lib/units";
import { DeferredPosterArt as PosterArt } from "../DeferredPosterArt";
import { SectionHeading } from "../Section";
import { RT } from "../Vars";

const TARGET = new Date(site.target).getTime();
const ACCENT: Record<string, string> = { uvi: uviMeta.accent, ruvi: ruviMeta.accent, handler: "#a33a32" };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-fog/10 py-3">
      <dt className="text-xs uppercase tracking-[0.25em] text-fog-dim">{label}</dt>
      <dd className="font-display text-3xl text-bandage tabular-nums sm:text-4xl">{value}</dd>
    </div>
  );
}

export function Dossier({ posters }: { posters: Record<CharacterId, Art | null> }) {
  const uvi = useStore((s) => s.uvi);
  const ruvi = useStore((s) => s.ruvi);
  const unit = useStore((s) => s.unit);
  const now = useNow(60_000);
  const pages = useMemo(
    () =>
      (["uvi", "ruvi"] as const).reduce(
        (n, c) => n + 1 + templatesFor(c, uvi, ruvi).reduce((k, p) => k + contentTiles(p.outline, tilePiece(p.bbox)).length, 0),
        0,
      ),
    [uvi, ruvi],
  );
  const steps = [...uviSteps, paintSteps, ...ruviSteps, weatheringSteps].reduce((n, g) => n + g.steps.length, 0);
  const nights = now === null ? "—" : String(Math.max(0, Math.ceil((TARGET - now) / 86_400_000)));

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.35fr]">
      <section aria-labelledby="plan-title">
        <SectionHeading kicker="By the numbers" title="The plan" id="plan-title" />
        <dl className="panel smoke px-6 py-3">
          <Stat label="Nights left" value={nights} />
          <Stat label="Build steps" value={String(steps)} />
          <Stat label="Template pages" value={String(pages)} />
          <Stat label="Things to buy" value={String(uviShopping.length + ruviShopping.length)} />
          <Stat label="Cardboard" value={fmtM2(3, unit)} />
          <div className="flex items-baseline justify-between gap-4 pt-4">
            <dt className="font-heading text-sm uppercase tracking-[0.3em] text-blood-text">Total</dt>
            <dd className="font-display text-4xl text-blood-text sm:text-5xl">2 monsters</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="cast-title">
        <SectionHeading kicker="Character development" title="The cast" id="cast-title" />
        <ul className="grid gap-4 sm:grid-cols-3">
          {cast.map((c) => {
            const art = c.id === "handler" ? null : posters[c.id];
            return (
              <li key={c.id} className="panel group overflow-hidden" style={{ ["--accent" as string]: ACCENT[c.id] }}>
                <div className="relative h-56 overflow-hidden bg-gradient-to-b from-ash-3 to-ash">
                  <div className="absolute inset-0" style={{ background: `radial-gradient(70% 60% at 50% 35%, ${ACCENT[c.id]}40, transparent 70%)` }} aria-hidden="true" />
                  {c.id === "handler" ? (
                    <svg viewBox="0 0 100 120" className="absolute inset-x-0 bottom-0 mx-auto h-48 text-fog/40" aria-hidden="true">
                      <circle cx="50" cy="32" r="14" fill="currentColor" />
                      <path d="M24 120 Q26 62 50 56 Q74 62 76 120 Z" fill="currentColor" />
                      <path d="M72 70 l14 -10 l4 6 l-14 10 z" fill="#e9b949" opacity="0.7" />
                    </svg>
                  ) : (
                    <PosterArt
                      art={art}
                      alt={`${c.name} as ${c.role}`}
                      frameVw={[30, 10]}
                      className="absolute bottom-0 left-1/2 h-[118%] -translate-x-1/2 grayscale transition duration-500 group-hover:grayscale-0"
                    />
                  )}
                </div>
                <div className="p-4">
                  <p className="font-heading text-[11px] uppercase tracking-[0.3em]" style={{ color: ACCENT[c.id] === "#a33a32" ? "#e0685d" : ACCENT[c.id] }}>
                    {c.role}
                  </p>
                  <h3 className="font-display mt-1 text-3xl text-bandage">{c.name}</h3>
                  <RT as="p" className="mt-2 text-sm text-fog" text={c.bio} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
