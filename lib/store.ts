"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { uviDefaults, type UviMeasurements } from "@/data/uvi";
import { ruviDefaults, type RuviMeasurements } from "@/data/ruvi";

export type Unit = "cm" | "in";
export type CharacterId = "uvi" | "ruvi";

export interface Profile {
  id: string;
  name: string;
  character: CharacterId;
  values: UviMeasurements | RuviMeasurements;
  savedAt: string;
}

export interface DryTimer {
  id: string;
  label: string;
  character: CharacterId;
  endsAt: number;
  durationMs: number;
  notified: boolean;
}

interface State {
  unit: Unit;
  calm: boolean;
  audio: boolean;
  gateSeen: boolean;
  uvi: UviMeasurements;
  ruvi: RuviMeasurements;
  profiles: Profile[];
  checks: Record<string, boolean>;
  timers: DryTimer[];
  heroFlashlight: boolean;

  setUnit: (u: Unit) => void;
  setCalm: (c: boolean) => void;
  setAudio: (a: boolean) => void;
  enter: (effectsOff: boolean) => void;
  setUvi: (patch: Partial<UviMeasurements>) => void;
  setRuvi: (patch: Partial<RuviMeasurements>) => void;
  resetMeasurements: (c: CharacterId) => void;
  saveProfile: (c: CharacterId, name: string) => void;
  loadProfile: (id: string) => void;
  deleteProfile: (id: string) => void;
  toggleCheck: (id: string) => void;
  setChecks: (ids: string[], value: boolean) => void;
  addTimer: (t: Omit<DryTimer, "id" | "notified" | "endsAt">) => void;
  markTimerNotified: (id: string) => void;
  removeTimer: (id: string) => void;
  setHeroFlashlight: (on: boolean) => void;
}

export const STORE_KEY = "uvi-ruvi-store";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      unit: "cm",
      calm: false,
      audio: false,
      gateSeen: false,
      uvi: { ...uviDefaults },
      ruvi: { ...ruviDefaults },
      profiles: [],
      checks: {},
      timers: [],
      heroFlashlight: false,

      setUnit: (unit) => set({ unit }),
      setCalm: (calm) => {
        set({ calm });
        if (typeof document !== "undefined") document.documentElement.dataset.calm = calm ? "1" : "0";
      },
      setAudio: (audio) => set({ audio }),
      enter: (effectsOff) => {
        set({ gateSeen: true, calm: effectsOff ? true : get().calm });
        if (typeof document !== "undefined") {
          document.documentElement.dataset.gate = "closed";
          document.documentElement.dataset.calm = effectsOff || get().calm ? "1" : "0";
        }
      },
      setUvi: (patch) => set({ uvi: { ...get().uvi, ...patch } }),
      setRuvi: (patch) => set({ ruvi: { ...get().ruvi, ...patch } }),
      resetMeasurements: (c) =>
        c === "uvi" ? set({ uvi: { ...uviDefaults } }) : set({ ruvi: { ...ruviDefaults } }),
      saveProfile: (character, name) => {
        const values = character === "uvi" ? { ...get().uvi } : { ...get().ruvi };
        const existing = get().profiles.filter((p) => !(p.character === character && p.name === name));
        set({
          profiles: [...existing, { id: uid(), name, character, values, savedAt: new Date().toISOString() }],
        });
      },
      loadProfile: (id) => {
        const p = get().profiles.find((x) => x.id === id);
        if (!p) return;
        if (p.character === "uvi") set({ uvi: { ...uviDefaults, ...(p.values as UviMeasurements) } });
        else set({ ruvi: { ...ruviDefaults, ...(p.values as RuviMeasurements) } });
      },
      deleteProfile: (id) => set({ profiles: get().profiles.filter((p) => p.id !== id) }),
      toggleCheck: (id) => set({ checks: { ...get().checks, [id]: !get().checks[id] } }),
      setChecks: (ids, value) => {
        const next = { ...get().checks };
        for (const id of ids) next[id] = value;
        set({ checks: next });
      },
      addTimer: (t) =>
        set({
          timers: [...get().timers, { ...t, id: uid(), notified: false, endsAt: Date.now() + t.durationMs }],
        }),
      markTimerNotified: (id) =>
        set({ timers: get().timers.map((t) => (t.id === id ? { ...t, notified: true } : t)) }),
      removeTimer: (id) => set({ timers: get().timers.filter((t) => t.id !== id) }),
      setHeroFlashlight: (heroFlashlight) => set({ heroFlashlight }),
    }),
    {
      name: STORE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        unit: s.unit,
        calm: s.calm,
        audio: false,
        gateSeen: s.gateSeen,
        uvi: s.uvi,
        ruvi: s.ruvi,
        profiles: s.profiles,
        checks: s.checks,
        timers: s.timers,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        return {
          ...current,
          ...p,
          uvi: { ...uviDefaults, ...(p.uvi ?? {}) },
          ruvi: { ...ruviDefaults, ...(p.ruvi ?? {}) },
        };
      },
    },
  ),
);

/** Inline script run before paint: applies calm mode and the content gate without a flash. */
export const preHydrationScript = `(function(){try{var d=document.documentElement;var raw=localStorage.getItem(${JSON.stringify(
  STORE_KEY,
)});var s=raw?JSON.parse(raw).state:null;var calm=s&&s.calm;d.dataset.calm=calm?"1":"0";d.dataset.gate=s&&s.gateSeen?"closed":"open";}catch(e){document.documentElement.dataset.gate="open";}})();`;
