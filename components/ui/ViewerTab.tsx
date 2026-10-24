"use client";

import { useState } from "react";
import Link from "next/link";
import type { CharacterId } from "@/data/types";
import { LazyViewer } from "@/components/3d/LazyViewer";
import { VIEW_LABELS, type ViewKind } from "@/components/3d/views";
import { SectionHeading } from "./Section";

const VIEWS: Record<CharacterId, ViewKind[]> = {
  uvi: ["helmet", "knife"],
  ruvi: ["mask", "fit", "dress", "cap", "pipe"],
};

const BLURBS: Record<ViewKind, string> = {
  helmet: "Built from the exact vertices of the cut list. Switch to Side to check the 20° lean of the centre face.",
  knife: "Three laminated layers and a PVC pipe. Explode it to see the slot in the middle layer.",
  mask: "From balloon to rot: scrub through the five stages. The split animates open at stage 2.",
  fit: "Her head inside the shell, with green foam pads and the 2–3 cm gap.",
  dress: "Lofted from the pattern half widths: bust, waist, hips and hem follow the Measure tab.",
  cap: "A 36 cm ring with a 4 cm cuff, 9 cm tall at the front.",
  pipe: "60 cm of pipe, a 45° elbow, a 10 cm stub and a 12 cm grip, plus the optional scalpel.",
};

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
      <p className="mb-4 max-w-3xl text-fog">{BLURBS[view]}</p>
      <LazyViewer key={view} view={view} initialPreset={view === "knife" || view === "pipe" ? "front" : "threeQuarter"} />
      <p className="mt-4 text-sm text-fog-dim">
        Want both side by side? <Link href="/duo" className="underline hover:text-bandage">Duo mode</Link> links the two cameras.
      </p>
    </div>
  );
}
