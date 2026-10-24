"use client";

import { useStore } from "@/lib/store";
import { audio } from "@/lib/audio";

const chip =
  "min-h-11 min-w-11 px-3 text-xs uppercase tracking-widest border transition focus-visible:outline-2 flex items-center justify-center gap-1.5";

export function UnitToggle({ className = "" }: { className?: string }) {
  const unit = useStore((s) => s.unit);
  const setUnit = useStore((s) => s.setUnit);
  return (
    <div role="group" aria-label="Units" className={`flex ${className}`}>
      {(["cm", "in"] as const).map((u) => (
        <button
          key={u}
          type="button"
          aria-pressed={unit === u}
          onClick={() => setUnit(u)}
          className={`${chip} ${unit === u ? "border-sick bg-sick/15 text-bandage" : "border-fog/20 text-fog-dim hover:text-bandage"}`}
        >
          {u}
        </button>
      ))}
    </div>
  );
}

export function CalmToggle() {
  const calm = useStore((s) => s.calm);
  const setCalm = useStore((s) => s.setCalm);
  return (
    <button
      type="button"
      aria-pressed={calm}
      onClick={() => setCalm(!calm)}
      className={`${chip} ${calm ? "border-sick bg-sick/15 text-bandage" : "border-fog/20 text-fog-dim hover:text-bandage"}`}
      title="Calm mode: no flicker, glitch, shake or moving fog"
    >
      <span aria-hidden="true">{calm ? "◐" : "◑"}</span>
      Calm
    </button>
  );
}

export function AudioToggle() {
  const on = useStore((s) => s.audio);
  const setAudio = useStore((s) => s.setAudio);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        const next = !on;
        setAudio(next);
        if (next) audio.startAmbient();
        else audio.stopAmbient();
      }}
      className={`${chip} ${on ? "border-blood-bright bg-blood/40 text-bandage" : "border-fog/20 text-fog-dim hover:text-bandage"}`}
      title="Synthesised ambient sound (off by default)"
    >
      <span aria-hidden="true">{on ? "♪" : "∅"}</span>
      Sound {on ? "on" : "off"}
    </button>
  );
}
