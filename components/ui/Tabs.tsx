"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { triggerCut } from "@/lib/transition";

export interface TabDef {
  id: string;
  label: string;
  content: React.ReactNode;
}

/** Accessible, sticky, hash-synced tabs (WAI-ARIA tabs pattern with automatic activation). */
export function Tabs({ tabs, label }: { tabs: TabDef[]; label: string }) {
  const [active, setActive] = useState(tabs[0].id);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const base = useId();

  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (tabs.some((t) => t.id === h)) setActive(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [tabs]);

  const select = useCallback(
    (id: string, focus = false) => {
      if (id === active) return;
      triggerCut();
      setActive(id);
      history.replaceState(null, "", `#${id}`);
      if (focus) refs.current[id]?.focus();
      refs.current[id]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    },
    [active],
  );

  const onKey = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === active);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next >= 0) {
      e.preventDefault();
      select(tabs[next].id, true);
    }
  };

  return (
    <div>
      <div className="sticky top-[57px] z-40 -mx-4 border-b border-fog/10 bg-ash/90 px-4 backdrop-blur-md no-print">
        <div role="tablist" aria-label={label} className="scrollbar-none flex gap-1 overflow-x-auto" onKeyDown={onKey}>
          {tabs.map((t) => {
            const selected = t.id === active;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  refs.current[t.id] = el;
                }}
                role="tab"
                type="button"
                id={`${base}-tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`${base}-panel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(t.id)}
                className={`min-h-11 shrink-0 whitespace-nowrap border-b-2 px-3 text-sm transition ${
                  selected ? "border-blood-bright text-bandage" : "border-transparent text-fog-dim hover:text-bandage"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${base}-panel-${t.id}`}
          aria-labelledby={`${base}-tab-${t.id}`}
          hidden={t.id !== active}
          tabIndex={0}
          className="pt-8 focus-visible:outline-none"
        >
          {t.id === active && t.content}
        </div>
      ))}
    </div>
  );
}
