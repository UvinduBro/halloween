"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { audio } from "@/lib/audio";
import { TimerWatcher } from "./TimerWatcher";

/** Rehydrates persisted state after mount (avoids SSR mismatches) and keeps <html> flags in sync. */
export function Providers({ children }: { children: React.ReactNode }) {
  const calm = useStore((s) => s.calm);
  const gateSeen = useStore((s) => s.gateSeen);

  useEffect(() => {
    void useStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!useStore.persist.hasHydrated()) return;
    document.documentElement.dataset.calm = calm ? "1" : "0";
    document.documentElement.dataset.gate = gateSeen ? "closed" : "open";
  }, [calm, gateSeen]);

  useEffect(() => () => audio.stopAmbient(), []);

  return (
    <>
      {children}
      <TimerWatcher />
    </>
  );
}
