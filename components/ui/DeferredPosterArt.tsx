"use client";

import { useEffect, useState } from "react";
import { PosterArt } from "./PosterArt";

/**
 * PosterArt that only starts loading after the page has finished loading (and the browser is idle),
 * so decorative key art never competes with first paint. Its box is sized by the parent, so nothing shifts.
 */
export function DeferredPosterArt(props: React.ComponentProps<typeof PosterArt>) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const go = () => (w.requestIdleCallback ? w.requestIdleCallback(() => setReady(true), { timeout: 1500 }) : setTimeout(() => setReady(true), 200));
    if (document.readyState === "complete") {
      go();
      return;
    }
    window.addEventListener("load", go, { once: true });
    return () => window.removeEventListener("load", go);
  }, []);
  if (!ready) return <div className={props.className} aria-hidden="true" />;
  return <PosterArt {...props} />;
}
