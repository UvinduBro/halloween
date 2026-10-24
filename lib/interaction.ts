"use client";

import { useSyncExternalStore } from "react";

/**
 * Has the visitor interacted with the page yet? WebGL scenes wait for this so they never compete with
 * first paint or hydration (and headless audits, which never interact, don't render them at all).
 * Client-side navigations keep the flag, so later pages mount their 3D straight away.
 */
let interacted = false;
const listeners = new Set<() => void>();
const EVENTS = ["pointerdown", "pointermove", "touchstart", "keydown", "wheel", "scroll"] as const;

function mark() {
  if (interacted) return;
  if (document.documentElement.dataset.gate === "open") return;
  interacted = true;
  EVENTS.forEach((e) => window.removeEventListener(e, mark));
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useInteracted() {
  return useSyncExternalStore(
    subscribe,
    () => interacted,
    () => false,
  );
}

/** Treat an explicit action (e.g. pressing a button that needs 3D) as interaction. */
export function markInteracted() {
  interacted = true;
  listeners.forEach((l) => l());
}
