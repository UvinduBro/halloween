"use client";

import { schedule, scheduleTaskId } from "@/data/schedule";
import { site } from "@/data/site";
import { useStore } from "@/lib/store";
import { useNow } from "@/lib/hooks";

export function colomboDate(ms: number) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: site.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(ms);
}

/** One person's column of the shared schedule, as a checklist. */
export function ScheduleList({ who }: { who: "uvi" | "ruvi" }) {
  const checks = useStore((s) => s.checks);
  const toggle = useStore((s) => s.toggleCheck);
  const now = useNow(60_000);
  const today = now === null ? null : colomboDate(now);

  return (
    <ol className="space-y-3">
      {schedule.map((day) => {
        const tasks = day[who];
        const isToday = today === day.date;
        return (
          <li key={day.id} className={`border p-4 ${isToday ? "border-blood-bright bg-blood/15" : "border-fog/10 bg-ash-2/80"}`}>
            <h3 className="font-heading text-lg text-bandage">
              {day.label} {isToday && <span className="ml-2 text-xs uppercase tracking-widest text-blood-bright">today</span>}
            </h3>
            <ul className="mt-1">
              {tasks.map((t, i) => {
                const id = scheduleTaskId(day, who, i);
                const checked = !!checks[id];
                return (
                  <li key={id}>
                    <label className="flex min-h-11 cursor-pointer items-center gap-3">
                      <input type="checkbox" checked={checked} onChange={() => toggle(id)} className="size-5 accent-[#9FA87A]" />
                      <span className={checked ? "text-fog-dim line-through" : "text-fog"}>{t}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
