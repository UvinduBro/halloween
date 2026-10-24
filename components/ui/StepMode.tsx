"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CharacterId, StepGroup, TimerPreset } from "@/data/types";
import { LazyViewer } from "@/components/3d/LazyViewer";
import type { ViewKind } from "@/components/3d/views";
import { useStore } from "@/lib/store";
import { triggerCut } from "@/lib/transition";
import { stepCheckId } from "./StepList";
import { TimerButton } from "./Timers";
import { RT } from "./Vars";

type WakeLockSentinelLike = { release: () => Promise<void>; released?: boolean };

function useWakeLock() {
  const [on, setOn] = useState(false);
  const [supported] = useState(() => typeof navigator !== "undefined" && "wakeLock" in navigator);
  const sentinel = useRef<WakeLockSentinelLike | null>(null);

  const acquire = useCallback(async () => {
    try {
      const wl = (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<WakeLockSentinelLike> } }).wakeLock;
      sentinel.current = await wl.request("screen");
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!on) {
      void sentinel.current?.release().catch(() => {});
      sentinel.current = null;
      return;
    }
    void acquire().then((ok) => {
      if (!ok) setOn(false);
    });
    // the lock is dropped when the tab is hidden; take it again when we come back
    const onVis = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void sentinel.current?.release().catch(() => {});
      sentinel.current = null;
    };
  }, [on, acquire]);

  return { on, setOn, supported };
}

/** Full-screen, one card per step: big text, a mini 3D view, swipe or arrow keys to move. */
export function StepMode({
  character,
  group,
  start,
  timers,
  onClose,
}: {
  character: CharacterId;
  group: StepGroup;
  start: number;
  timers: TimerPreset[];
  onClose: () => void;
}) {
  const [i, setI] = useState(start);
  const checks = useStore((s) => s.checks);
  const toggle = useStore((s) => s.toggleCheck);
  const wake = useWakeLock();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const step = group.steps[i];
  const id = stepCheckId(character, group.id, step.id);
  const preset = step.timer ? timers.find((t) => t.id === step.timer) : undefined;

  const go = useCallback(
    (d: number) => {
      const n = Math.min(group.steps.length - 1, Math.max(0, i + d));
      if (n === i) return;
      triggerCut();
      setI(n);
    },
    [group.steps.length, i],
  );

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Tab" && dialogRef.current) {
        // keep focus inside the dialog
        const f = dialogRef.current.querySelectorAll<HTMLElement>("button, input, a[href], [tabindex]:not([tabindex='-1'])");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stepmode-title"
      className="fixed inset-0 z-[70] flex flex-col bg-ash"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("canvas")) return;
        swipe.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const s = swipe.current;
        swipe.current = null;
        if (!s) return;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-fog/10 px-4 py-2">
        <p className="font-heading text-sm uppercase tracking-[0.3em] text-sick">
          {group.title} · {i + 1}/{group.steps.length}
        </p>
        <div className="flex items-center gap-2">
          {wake.supported && (
            <button
              type="button"
              aria-pressed={wake.on}
              onClick={() => wake.setOn(!wake.on)}
              className={`min-h-11 border px-3 text-xs uppercase tracking-widest ${wake.on ? "border-sick bg-sick/15 text-bandage" : "border-fog/20 text-fog-dim"}`}
            >
              {wake.on ? "Screen stays awake" : "Keep screen awake"}
            </button>
          )}
          <button ref={closeRef} type="button" onClick={onClose} className="min-h-11 min-w-11 border border-fog/20 px-3 text-sm hover:text-bandage">
            Close
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:flex-row md:p-8">
        <div className="flex flex-1 flex-col justify-center md:pr-6">
          <p className="font-heading text-6xl text-blood-bright" aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </p>
          <h2 id="stepmode-title" className="mt-2 font-heading text-4xl text-bandage sm:text-5xl">
            {step.title}
          </h2>
          <RT as="p" className="mt-4 text-2xl leading-relaxed text-fog sm:text-3xl" text={step.text} />
          {step.tip && <RT as="p" className="mt-4 text-xl text-sick" text={`Tip: ${step.tip}`} />}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 border border-fog/20 px-4 text-lg">
              <input type="checkbox" className="size-6 accent-[#9FA87A]" checked={!!checks[id]} onChange={() => toggle(id)} />
              Done
            </label>
            {preset && <TimerButton preset={preset} character={character} />}
          </div>
        </div>
        {step.view && (
          <div className="h-72 shrink-0 md:h-auto md:w-[45%]">
            <LazyViewer key={`${step.view}-${step.assembly}`} view={step.view as ViewKind} compact fixedStep={step.assembly} title={step.title} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-fog/10 p-3">
        <button type="button" onClick={() => go(-1)} disabled={i === 0} className="min-h-14 flex-1 border border-fog/20 text-lg disabled:opacity-30 sm:flex-none sm:px-8">
          ← Prev
        </button>
        <p className="hidden text-sm text-fog-dim sm:block">Swipe or use ← → keys</p>
        <button
          type="button"
          onClick={() => (i === group.steps.length - 1 ? onClose() : go(1))}
          className="min-h-14 flex-1 bg-blood text-lg text-bandage hover:bg-blood-bright sm:flex-none sm:px-8"
        >
          {i === group.steps.length - 1 ? "Finish" : "Next →"}
        </button>
      </div>
    </div>
  );
}
