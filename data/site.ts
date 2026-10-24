import type { CharacterId } from "./types";

export const site = {
  name: "UVI & RUVI",
  description: "A horror-themed, interactive build guide for two Halloween cosplays: a pyramid-helmet executioner and a swollen, bandage-headed nurse.",
  timezone: "Asia/Colombo",
  /** Halloween target: 31 Oct 2026, 19:00 Asia/Colombo (UTC+05:30). */
  target: "2026-10-31T19:00:00+05:30",
  disclaimer: "Fan-made cosplay build guide. Not affiliated with or endorsed by any game publisher.",
  wallText: "WE WILL BE WAITING · 31.10",
};

export interface HeroFigureConfig {
  id: CharacterId;
  name: string;
  /** Original procedural design shown when no sheet/model is supplied. */
  originalTitle: string;
  /** Background key strength for opaque character sheets (0 = off, 1 = strong). */
  keyStrength: number;
  /** Rim light colour (additive edge glow). */
  rim: string;
  /** Light colour for this side of the scene. */
  light: string;
  /** Optional credit line under the figure, e.g. the artist of the character sheet. */
  credit: string;
}

export const heroFigures: Record<CharacterId, HeroFigureConfig> = {
  uvi: {
    id: "uvi",
    name: "UVI",
    originalTitle: "The Lantern Warden",
    keyStrength: 0.55,
    rim: "#b0442a",
    light: "#ff8a3d",
    credit: "",
  },
  ruvi: {
    id: "ruvi",
    name: "RUVI",
    originalTitle: "The Moth Widow",
    keyStrength: 0.55,
    rim: "#d9dcc0",
    light: "#f3e2b0",
    credit: "",
  },
};

/** Turntable frame order inside each sheet (left to right). */
export const sheetFrames = ["front ¾", "side right", "side left", "back"] as const;
/** Auto-turn order: front → side → back → other side. */
export const autoTurnOrder = [0, 1, 3, 2];

export interface CastMember {
  id: CharacterId | "handler";
  name: string;
  role: string;
  bio: string;
}

/** "The cast" cards on the landing dossier. Bios may use unit tokens. */
export const cast: CastMember[] = [
  {
    id: "uvi",
    name: "Uvi",
    role: "The Executioner",
    bio: "Carries {88} of laminated cardboard on a hard hat and sees the world through a {10} slot. Never runs. Drags the blade.",
  },
  {
    id: "ruvi",
    name: "Ruvi",
    role: "The Night Nurse",
    bio: "Wears a plaster head two sizes too big and a dress that was white once. Breathes through chiffon. Twitches when you blink.",
  },
  {
    id: "handler",
    name: "The Handler",
    role: "Keeps them alive",
    bio: "Walks beside the helmet, calls out doorways, fans and stairs, and carries the water, the glue and the zip ties.",
  },
];
