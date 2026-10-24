"use client";

import type { CharacterId, StepGroup, TimerPreset } from "@/data/types";

export function StepMode(props: { character: CharacterId; group: StepGroup; start: number; timers: TimerPreset[]; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] bg-ash p-6">
      <button type="button" onClick={props.onClose}>Close</button>
      <p>{props.group.steps[props.start].title}</p>
    </div>
  );
}
