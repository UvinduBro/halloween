"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useStore } from "./store";
import { fmtLen, renderText, type TextVars } from "./units";
import { uviVars } from "./uvi";
import { ruviVars } from "./ruvi";

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** Motion (flicker, glitch, shake, transitions) is allowed only when neither reduced motion nor calm mode is on. */
export function useMotionAllowed() {
  const reduced = usePrefersReducedMotion();
  const calm = useStore((s) => s.calm);
  return !reduced && !calm;
}

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

export function useIsMobile(breakpoint = 768) {
  return useSyncExternalStore(
    subscribeResize,
    () => window.innerWidth < breakpoint || window.matchMedia("(pointer: coarse)").matches,
    () => true,
  );
}

const noopSubscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function useUviVars() {
  const m = useStore((s) => s.uvi);
  return useMemo(() => uviVars(m), [m]);
}

export function useRuviVars() {
  const m = useStore((s) => s.ruvi);
  return useMemo(() => ruviVars(m), [m]);
}

export function useCharacterVars(c: "uvi" | "ruvi"): TextVars {
  const u = useUviVars();
  const r = useRuviVars();
  return (c === "uvi" ? u : r) as unknown as TextVars;
}

export function useFmt() {
  const unit = useStore((s) => s.unit);
  return useCallback((cm: number, digits = 1) => fmtLen(cm, unit, digits), [unit]);
}

export function useRender(vars: TextVars = {}) {
  const unit = useStore((s) => s.unit);
  return useCallback((text: string) => renderText(text, unit, vars), [unit, vars]);
}

/** Current time, ticking every `ms`. Returns null until mounted (keeps SSR deterministic). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, ms);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [ms]);
  return now;
}
