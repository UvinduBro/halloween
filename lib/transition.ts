"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useMotionAllowed } from "./hooks";

export const CUT_EVENT = "uvi-ruvi:static-cut";

/** Play the static/blink cut overlay (no-op when motion is not allowed; the overlay checks). */
export function triggerCut() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CUT_EVENT));
}

/** Navigate with a short static cut (under 300 ms) when motion is allowed. */
export function useCutNavigate() {
  const router = useRouter();
  const motion = useMotionAllowed();
  return useCallback(
    (href: string) => {
      if (!motion) {
        router.push(href);
        return;
      }
      triggerCut();
      setTimeout(() => router.push(href), 130);
    },
    [router, motion],
  );
}
