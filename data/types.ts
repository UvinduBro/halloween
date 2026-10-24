/**
 * Shared types for build data. Text fields may contain unit tokens
 * (see lib/units.ts → renderText): {32} cm, {2.5–3} range, {$var} derived, {mm:25}, {m2:3} …
 */

export type CharacterId = "uvi" | "ruvi";

export interface BuildStep {
  id: string;
  title: string;
  text: string;
  tip?: string;
  /** Drying timer preset id offered next to this step. */
  timer?: string;
  /** Which 3D view the mini viewer shows in step mode. */
  view?: string;
  /** Assembly step index for that view (0-based). */
  assembly?: number;
}

export interface StepGroup {
  id: string;
  title: string;
  kicker: string;
  intro?: string;
  steps: BuildStep[];
}

export interface InfoSection {
  id: string;
  title: string;
  kicker?: string;
  items: string[];
}

export interface ShopItem {
  id: string;
  group: string;
  text: string;
}

export interface SourceLink {
  url: string;
  title: string;
  note: string;
}

export interface TimerPreset {
  id: string;
  label: string;
  minutes: number;
}

export type MeasureFigure =
  | "shoulder-width"
  | "shoulder-height"
  | "waist"
  | "waist-floor"
  | "hat-shoulder"
  | "head-circ"
  | "head-length"
  | "head-width"
  | "chin-crown"
  | "chin-eyes"
  | "neck"
  | "bust"
  | "hips"
  | "dress-length"
  | "upper-arm";

export interface MeasureField<K extends string> {
  key: K;
  label: string;
  min: number;
  max: number;
  step: number;
  how: string;
  figure: MeasureFigure;
}

export interface AssemblyStep {
  title: string;
  text: string;
  /** Piece ids that become visible at this step. */
  pieces: string[];
}

export interface CharacterMeta {
  id: CharacterId;
  name: string;
  wearer: string;
  build: string;
  tagline: string;
  overview: string[];
  accent: string;
}
