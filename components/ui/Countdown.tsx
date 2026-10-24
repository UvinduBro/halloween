"use client";

import { site } from "@/data/site";
import { useNow } from "@/lib/hooks";

const TARGET = new Date(site.target).getTime();

export function Countdown({ compact = false }: { compact?: boolean }) {
  const now = useNow(1000);
  const left = now === null ? null : Math.max(0, TARGET - now);
  const parts =
    left === null
      ? null
      : {
          days: Math.floor(left / 86_400_000),
          hours: Math.floor((left % 86_400_000) / 3_600_000),
          minutes: Math.floor((left % 3_600_000) / 60_000),
        };
  const over = left === 0;
  const label = parts
    ? `${parts.days} days, ${parts.hours} hours and ${parts.minutes} minutes until Halloween night, 31 October, 19:00 Colombo time`
    : "Countdown to Halloween night, 31 October, 19:00 Colombo time";

  if (over) {
    return <p className="font-heading text-2xl text-blood-bright">It has begun.</p>;
  }

  return (
    <div role="timer" aria-label={label} className={compact ? "flex items-baseline gap-3" : "flex items-end justify-center gap-4 sm:gap-8"}>
      {(["days", "hours", "minutes"] as const).map((k) => (
        <div key={k} className="text-center" aria-hidden="true">
          <div className={`font-heading tabular-nums text-bandage ${compact ? "text-2xl" : "text-4xl sm:text-6xl"}`}>
            {parts ? String(parts[k]).padStart(2, "0") : "--"}
          </div>
          <div className="text-[0.65rem] uppercase tracking-[0.3em] text-fog-dim">{k}</div>
        </div>
      ))}
      {!compact && <span className="sr-only">{label}</span>}
    </div>
  );
}
