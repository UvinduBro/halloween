"use client";

import { useStore } from "@/lib/store";
import { useHydrated, useNow } from "@/lib/hooks";
import type { CharacterId, TimerPreset } from "@/data/types";

function fmtDuration(ms: number) {
  if (ms <= 0) return "done";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m ${String(sec).padStart(2, "0")}s`;
}

async function askNotify() {
  try {
    if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission();
  } catch {
    /* ignore */
  }
}

export function TimerButton({ preset, character }: { preset: TimerPreset; character: CharacterId }) {
  const addTimer = useStore((s) => s.addTimer);
  return (
    <button
      type="button"
      onClick={() => {
        void askNotify();
        addTimer({ label: preset.label, character, durationMs: preset.minutes * 60_000 });
      }}
      className="min-h-11 border border-sick/40 px-3 text-xs text-sick transition hover:bg-sick/10"
    >
      ⏱ Start timer · {preset.minutes >= 60 ? `${preset.minutes / 60} h` : `${preset.minutes} min`}
    </button>
  );
}

export function DryingTimers({ presets, character }: { presets: TimerPreset[]; character: CharacterId }) {
  const timers = useStore((s) => s.timers).filter((t) => t.character === character);
  const removeTimer = useStore((s) => s.removeTimer);
  const now = useNow(1000);
  const hydrated = useHydrated();
  const perm = hydrated && "Notification" in window ? Notification.permission : "unsupported";

  return (
    <div>
      <h3 className="font-heading text-xl text-bandage">Drying timers</h3>
      <p className="mt-1 text-sm text-fog-dim">
        Timers keep running if you close the tab; you get a browser notification when one ends while the site is open.
        {perm === "denied" && " Notifications are blocked in this browser."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((p) => (
          <TimerButton key={p.id} preset={p} character={character} />
        ))}
      </div>
      {timers.length > 0 && (
        <ul className="mt-4 space-y-2" aria-live="polite">
          {timers.map((t) => {
            const left = now === null ? t.durationMs : t.endsAt - now;
            const pct = Math.min(100, Math.max(0, 100 - (left / t.durationMs) * 100));
            return (
              <li key={t.id} className="border border-fog/10 bg-ash p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-bandage">{t.label}</span>
                  <span className={`font-mono text-sm ${left <= 0 ? "text-sick" : "text-fog"}`}>{fmtDuration(left)}</span>
                </div>
                <div className="mt-2 h-1.5 bg-fog/10" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`${t.label} progress`}>
                  <div className="h-full bg-rust-bright" style={{ width: `${pct}%` }} />
                </div>
                <button type="button" onClick={() => removeTimer(t.id)} className="mt-2 min-h-11 text-xs text-fog-dim underline hover:text-bandage">
                  {left <= 0 ? "Clear" : "Cancel"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
