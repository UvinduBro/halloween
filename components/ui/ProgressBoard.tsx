"use client";

import Link from "next/link";
import { schedule, scheduleTaskId } from "@/data/schedule";
import { ruviShopping, ruviSteps, weatheringSteps } from "@/data/ruvi";
import { paintSteps, uviShopping, uviSteps } from "@/data/uvi";
import type { CharacterId, StepGroup } from "@/data/types";
import { useNow } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { colomboDate } from "./ScheduleList";
import { Countdown } from "./Countdown";
import { SectionHeading } from "./Section";
import { shopCheckId, ShoppingList } from "./ShoppingList";
import { stepCheckId } from "./StepList";
import { VarsProvider } from "./Vars";

const groups: Record<CharacterId, StepGroup[]> = { uvi: [...uviSteps, paintSteps], ruvi: [...ruviSteps, weatheringSteps] };
const shopping = { uvi: uviShopping, ruvi: ruviShopping };

function Bar({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-fog">{label}</span>
        <span className="tabular-nums text-fog-dim">
          {done}/{total}
        </span>
      </div>
      <div className="mt-1 h-2 bg-fog/10" role="progressbar" aria-label={`${label}: ${pct}%`} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-rust-bright transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ProgressBoard() {
  const checks = useStore((s) => s.checks);
  const toggle = useStore((s) => s.toggleCheck);
  const now = useNow(60_000);
  const today = now === null ? null : colomboDate(now);

  const stats = (who: CharacterId) => {
    const sched = schedule.flatMap((d) => d[who].map((_, i) => scheduleTaskId(d, who, i)));
    const steps = groups[who].flatMap((g) => g.steps.map((s) => stepCheckId(who, g.id, s.id)));
    const shop = shopping[who].map(shopCheckId);
    const c = (ids: string[]) => ids.filter((id) => checks[id]).length;
    return { sched: [c(sched), sched.length], steps: [c(steps), steps.length], shop: [c(shop), shop.length] };
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <SectionHeading kicker="Eight nights left" title="Progress" />
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Countdown compact />
        <p className="text-sm text-fog-dim">Ticks are saved in this browser and shared with the build pages.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(["uvi", "ruvi"] as CharacterId[]).map((who) => {
          const s = stats(who);
          return (
            <div key={who} className="space-y-3 border border-fog/10 bg-ash-2/80 p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-heading text-3xl text-bandage">{who.toUpperCase()}</h2>
                <Link href={`/${who}#build`} className="text-sm text-fog-dim underline hover:text-bandage">
                  Build steps →
                </Link>
              </div>
              <Bar label="Schedule" done={s.sched[0]} total={s.sched[1]} />
              <Bar label="Build steps" done={s.steps[0]} total={s.steps[1]} />
              <Bar label="Shopping" done={s.shop[0]} total={s.shop[1]} />
            </div>
          );
        })}
      </div>

      <h2 className="mb-4 mt-12 font-heading text-3xl text-bandage">Schedule</h2>
      <div className="overflow-hidden border border-fog/10">
        <div className="hidden grid-cols-[9rem_1fr_1fr] border-b border-fog/20 bg-ash-2 text-xs uppercase tracking-widest text-fog-dim md:grid" aria-hidden="true">
          <div className="p-3">Day</div>
          <div className="p-3">Uvi</div>
          <div className="p-3">Ruvi</div>
        </div>
        {schedule.map((day) => {
          const isToday = today === day.date;
          return (
            <section
              key={day.id}
              aria-label={day.label}
              className={`grid grid-cols-2 border-b border-fog/10 md:grid-cols-[9rem_1fr_1fr] ${isToday ? "bg-blood/15" : ""}`}
            >
              <h3 className="col-span-2 p-3 font-heading text-lg text-bandage md:col-span-1">
                {day.label}
                {isToday && <span className="ml-2 block text-xs uppercase tracking-widest text-blood-bright">today</span>}
              </h3>
              {(["uvi", "ruvi"] as CharacterId[]).map((who) => (
                <ul key={who} className="p-3 pt-0 md:pt-3" aria-label={`${who === "uvi" ? "Uvi" : "Ruvi"}, ${day.label}`}>
                  <li className="mb-1 text-xs uppercase tracking-widest text-sick md:hidden">{who}</li>
                  {day[who].map((t, i) => {
                    const id = scheduleTaskId(day, who, i);
                    return (
                      <li key={id}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-2.5">
                          <input type="checkbox" className="size-5 shrink-0 accent-[#9FA87A]" checked={!!checks[id]} onChange={() => toggle(id)} />
                          <span className={checks[id] ? "text-fog-dim line-through" : "text-fog"}>{t}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ))}
            </section>
          );
        })}
      </div>

      <h2 className="mb-4 mt-12 font-heading text-3xl text-bandage">Shopping lists</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <VarsProvider character="uvi">
          <div className="border border-fog/10 bg-ash-2/80 p-5">
            <ShoppingList items={uviShopping} title="Uvi" />
          </div>
        </VarsProvider>
        <VarsProvider character="ruvi">
          <div className="border border-fog/10 bg-ash-2/80 p-5">
            <ShoppingList items={ruviShopping} title="Ruvi" />
          </div>
        </VarsProvider>
      </div>
    </div>
  );
}
