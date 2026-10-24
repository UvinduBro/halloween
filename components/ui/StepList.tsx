"use client";

import type { CharacterId, StepGroup, TimerPreset } from "@/data/types";
import { useStore } from "@/lib/store";
import { RT } from "./Vars";
import { TimerButton } from "./Timers";
import { SectionHeading } from "./Section";

export function stepCheckId(character: CharacterId, group: string, step: string) {
  return `step:${character}:${group}:${step}`;
}

export function StepList({
  group,
  character,
  timers,
  onStepMode,
}: {
  group: StepGroup;
  character: CharacterId;
  timers: TimerPreset[];
  onStepMode?: (groupId: string, index: number) => void;
}) {
  const checks = useStore((s) => s.checks);
  const toggle = useStore((s) => s.toggleCheck);
  const done = group.steps.filter((s) => checks[stepCheckId(character, group.id, s.id)]).length;

  return (
    <section aria-labelledby={`grp-${group.id}`} className="mb-12">
      <SectionHeading kicker={group.kicker} title={group.title} id={`grp-${group.id}`} />
      {group.intro && <RT as="p" className="mb-4 max-w-3xl text-fog" text={group.intro} />}
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-fog-dim">
        <span>
          {done} / {group.steps.length} done
        </span>
        {onStepMode && (
          <button
            type="button"
            onClick={() => onStepMode(group.id, Math.min(done, group.steps.length - 1))}
            className="min-h-11 border border-blood-bright/60 px-3 text-bandage hover:bg-blood/40"
          >
            ▶ Step-by-step mode
          </button>
        )}
      </div>
      <ol className="space-y-3">
        {group.steps.map((s, i) => {
          const id = stepCheckId(character, group.id, s.id);
          const checked = !!checks[id];
          const preset = s.timer ? timers.find((t) => t.id === s.timer) : undefined;
          return (
            <li key={s.id} className={`border bg-ash-2/80 p-4 transition ${checked ? "border-sick/30 opacity-70" : "border-fog/10"}`}>
              <div className="flex gap-3">
                <label className="flex min-h-11 min-w-11 cursor-pointer items-start justify-center pt-0.5">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(id)}
                    className="size-5 accent-[#9FA87A]"
                    aria-label={`Mark step ${i + 1}, ${s.title}, as done`}
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-lg text-bandage">
                    <span className="mr-2 text-blood-bright">{String(i + 1).padStart(2, "0")}</span>
                    {s.title}
                  </h3>
                  <RT as="p" className="mt-1 text-fog" text={s.text} />
                  {s.tip && <RT as="p" className="mt-2 text-sm text-sick" text={`Tip: ${s.tip}`} />}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {preset && <TimerButton preset={preset} character={character} />}
                    {onStepMode && (
                      <button type="button" onClick={() => onStepMode(group.id, i)} className="min-h-11 px-2 text-xs text-fog-dim underline hover:text-bandage">
                        Open full-screen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
