"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMotionAllowed } from "@/lib/hooks";
import { CUT_EVENT } from "@/lib/transition";
import { audio } from "@/lib/audio";
import { useStore } from "@/lib/store";

/** Full-screen static/blink cut, under 300 ms, only when motion is allowed. */
export function StaticCut() {
  const motion = useMotionAllowed();
  const audioOn = useStore((s) => s.audio);
  const [key, setKey] = useState(0);
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    const play = () => {
      if (!motion) return;
      setKey((k) => k + 1);
      if (audioOn) audio.cut();
    };
    window.addEventListener(CUT_EVENT, play);
    return () => window.removeEventListener(CUT_EVENT, play);
  }, [motion, audioOn]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (motion) window.dispatchEvent(new Event(CUT_EVENT));
  }, [pathname, motion]);

  if (!key) return null;
  return <div key={key} className="static-cut" aria-hidden="true" onAnimationEnd={() => setKey(0)} />;
}
