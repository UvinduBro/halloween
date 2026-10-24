"use client";

import Link from "next/link";
import { schedule, scheduleTaskId } from "@/data/schedule";
import { uviMeta } from "@/data/uvi";
import { ruviMeta } from "@/data/ruvi";
import type { CharacterId } from "@/data/types";
import { useNow } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { colomboDate } from "../ScheduleList";

const ACCENT: Record<CharacterId, string> = { uvi: uviMeta.accent, ruvi: ruviMeta.accent };

/** "What's next?": the next schedule tasks that aren't done yet, for both of them. */
export function TonightRail() {
  const checks = useStore((s) => s.checks);
  const toggle = useStore((s) => s.toggleCheck);
  const now = useNow(60_000);
  const today = now === null ? schedule[0].date : colomboDate(now);
  const start = Math.max(0, schedule.findIndex((d) => d.date >= today));
  const items = schedule
    .slice(start)
    .flatMap((day) => (["uvi", "ruvi"] as CharacterId[]).flatMap((who) => day[who].map((t, i) => ({ day, who, t, id: scheduleTaskId(day, who, i) }))))
    .filter((x) => !checks[x.id])
    .slice(0, 8);

  if (!items.length) return <p className="font-heading text-xl text-fog-dim">Everything is done. Now, wait for the dark.</p>;

  return (
    <ul className="rail" aria-label="Next tasks">
      {items.map((x) => (
        <li key={x.id} className="panel flex min-h-36 flex-col p-4" style={{ ["--accent" as string]: ACCENT[x.who] }}>
          <div className="flex items-center justify-between gap-2">
            <span className="chip chip-accent">{x.who.toUpperCase()}</span>
            <span className="text-xs uppercase tracking-widest text-fog-dim">{x.day.date === today ? "Tonight" : x.day.label}</span>
          </div>
          <p className="mt-3 flex-1 font-heading text-lg text-bandage">{x.t}</p>
          <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-sm text-fog">
            <input type="checkbox" className="size-5 accent-[#9FA87A]" checked={false} onChange={() => toggle(x.id)} />
            Mark done
          </label>
        </li>
      ))}
      <li className="panel flex min-h-36 items-center justify-center p-4">
        <Link href="/progress" className="btn-ghost">
          Full schedule →
        </Link>
      </li>
    </ul>
  );
}
