"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/**
 * First-visit content gate. The markup is always rendered; an inline script in <head>
 * sets html[data-gate] before paint so returning visitors never see it.
 */
export function Gate() {
  const enter = useStore((s) => s.enter);

  // While the gate is open, the page behind it is inert (no focus, no clicks, hidden from screen readers).
  useEffect(() => {
    const html = document.documentElement;
    const sync = () => {
      const open = html.dataset.gate === "open";
      document.querySelectorAll("body > header, #main, body > footer").forEach((el) => el.toggleAttribute("inert", open));
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(html, { attributes: true, attributeFilter: ["data-gate"] });
    return () => mo.disconnect();
  }, []);

  return (
    <div
      className="gate fixed inset-0 z-[80] items-center justify-center bg-ash/95 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
      aria-describedby="gate-desc"
    >
      <div className="max-w-md border border-rust/50 bg-ash-2 p-6 text-center shadow-2xl sm:p-8">
        <p className="font-heading text-sm uppercase tracking-[0.3em] text-sick">Before you enter</p>
        <h2 id="gate-title" className="mt-3 font-heading text-3xl text-bandage">
          The fog is thick tonight
        </h2>
        <p id="gate-desc" className="mt-4 text-fog">
          Mild horror imagery and flickering effects.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => enter(false)}
            className="min-h-11 bg-blood px-5 py-2.5 font-heading text-lg text-bandage transition hover:bg-blood-bright"
            autoFocus
          >
            Enter
          </button>
          <button
            type="button"
            onClick={() => enter(true)}
            className="min-h-11 border border-fog/40 px-5 py-2.5 text-fog transition hover:border-fog hover:text-bandage"
          >
            Enter with effects off
          </button>
        </div>
        <p className="mt-4 text-xs text-fog-dim">You can switch calm mode on or off at any time in the header.</p>
      </div>
    </div>
  );
}
