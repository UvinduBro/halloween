"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { audio } from "@/lib/audio";

/** Fires a browser notification (and a static crackle if sound is on) when a drying timer ends. */
export function TimerWatcher() {
  const timers = useStore((s) => s.timers);
  const markTimerNotified = useStore((s) => s.markTimerNotified);

  useEffect(() => {
    const pending = timers.filter((t) => !t.notified);
    if (!pending.length) return;
    const check = () => {
      const now = Date.now();
      for (const t of pending) {
        if (t.endsAt <= now) {
          markTimerNotified(t.id);
          try {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("It is dry. It is ready.", {
                body: `${t.label} (${t.character === "uvi" ? "Uvi" : "Ruvi"}) has finished.`,
                tag: t.id,
              });
            }
          } catch {
            /* some mobile browsers only allow notifications from a service worker */
          }
          if (useStore.getState().audio) audio.staticBurst(0.4);
        }
      }
    };
    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, [timers, markTimerNotified]);

  return null;
}
