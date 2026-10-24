"use client";

import { useState } from "react";
import Link from "next/link";
import type { CharacterId } from "@/data/types";
import { LazyViewer } from "@/components/3d/LazyViewer";
import { VIEW_LABELS, type ViewKind } from "@/components/3d/views";
import { SectionHeading } from "./Section";
import { RT } from "./Vars";
import { uviViewBlurbs } from "@/data/uvi";
import { ruviViewBlurbs } from "@/data/ruvi";

const VIEWS: Record<CharacterId, ViewKind[]> = {
  uvi: ["helmet", "knife"],
  ruvi: ["mask", "fit", "dress", "cap", "pipe"],
};

const BLURBS: Record<string, string> = { ...uviViewBlurbs, ...ruviViewBlurbs };

export function ViewerTab({ character }: { character: CharacterId }) {
  const views = VIEWS[character];
  const [view, setView] = useState<ViewKind>(views[0]);
  return (
    <div>
      <SectionHeading kicker="Turn it over in your hands" title="3D build" />
      <div className="mb-3 flex flex-wrap gap-1" role="group" aria-label="Model">
        {views.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`min-h-11 border px-4 font-heading transition ${view === v ? "border-blood-bright bg-blood/30 text-bandage" : "border-fog/20 text-fog-dim hover:text-bandage"}`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>
      <RT as="p" className="mb-4 max-w-3xl text-fog" text={BLURBS[view]} />
      <LazyViewer key={view} view={view} initialPreset={view === "knife" || view === "pipe" ? "front" : "threeQuarter"} />
      <p className="mt-4 text-sm text-fog-dim">
        Want both side by side? <Link href="/duo" className="underline hover:text-bandage">Duo mode</Link> links the two cameras.
      </p>
    </div>
  );
}
