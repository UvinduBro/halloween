"use client";

import { useState } from "react";
import { LazyViewer } from "@/components/3d/LazyViewer";
import { VIEW_LABELS, type ViewKind } from "@/components/3d/views";
import { SectionHeading } from "./Section";

const SIDES: { id: "uvi" | "ruvi"; views: ViewKind[] }[] = [
  { id: "uvi", views: ["helmet", "knife"] },
  { id: "ruvi", views: ["mask", "dress", "cap", "pipe"] },
];

export function DuoMode() {
  const [views, setViews] = useState<Record<"uvi" | "ruvi", ViewKind>>({ uvi: "helmet", ruvi: "mask" });
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <SectionHeading kicker="Side by side, always" title="Duo mode" />
      <p className="mb-6 max-w-2xl text-fog">Both builds at once. The cameras are linked: turn one and the other follows.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {SIDES.map((side) => (
          <div key={side.id} className="panel p-3">
            <div className="mb-2 flex flex-wrap items-center gap-1">
              <h2 className="mr-2 font-heading text-2xl text-bandage">{side.id.toUpperCase()}</h2>
              {side.views.map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={views[side.id] === v}
                  onClick={() => setViews((s) => ({ ...s, [side.id]: v }))}
                  className={`min-h-11 border px-3 text-sm ${views[side.id] === v ? "border-sick bg-sick/15 text-bandage" : "border-fog/20 text-fog-dim hover:text-bandage"}`}
                >
                  {VIEW_LABELS[v]}
                </button>
              ))}
            </div>
            <div className="h-[48vh] min-h-80">
              <LazyViewer
                key={views[side.id]}
                view={views[side.id]}
                compact
                linkGroup="duo"
                linkId={side.id}
                defaults={{ labels: true, finished: true }}
                initialPreset="threeQuarter"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
