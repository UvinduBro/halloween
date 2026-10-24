"use client";

import { create } from "zustand";
import type { CharacterId } from "@/data/types";

export type HeroAsset =
  | { kind: "glb"; url: string }
  | { kind: "frames"; urls: string[] }
  | { kind: "sheet"; url: string }
  | { kind: "procedural" };

interface HeroState {
  hovered: Record<CharacterId, boolean>;
  lastHover: Record<CharacterId, number>;
  selected: CharacterId | null;
  /** Timestamp until which the duo moment (synced, dimmed lights) lasts. */
  duoUntil: number;
  setHover: (id: CharacterId, on: boolean) => void;
  select: (id: CharacterId | null) => void;
}

export const useHero = create<HeroState>()((set, get) => ({
  hovered: { uvi: false, ruvi: false },
  lastHover: { uvi: 0, ruvi: 0 },
  selected: null,
  duoUntil: 0,
  setHover: (id, on) => {
    const now = performance.now();
    const lastHover = { ...get().lastHover };
    let duoUntil = get().duoUntil;
    if (on) {
      lastHover[id] = now;
      const other: CharacterId = id === "uvi" ? "ruvi" : "uvi";
      if (now - lastHover[other] < 5000 && now > duoUntil + 3000) duoUntil = now + 2200;
    }
    set({ hovered: { ...get().hovered, [id]: on }, lastHover, duoUntil });
  },
  select: (selected) => set({ selected }),
}));

/** Pointer in normalised hero coordinates (-1..1), fed by mouse/touch or device tilt. Mutable, no re-renders. */
export const heroPointer = { x: 0, y: 0, px: -9999, py: -9999, active: false };
