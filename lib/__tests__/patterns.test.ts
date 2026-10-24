import { describe, expect, it } from "vitest";
import { ruviDefaults } from "@/data/ruvi";
import { dressPattern, maskDims } from "@/lib/ruvi";
import { uviDefaults } from "@/data/uvi";
import { uviVars } from "@/lib/uvi";
import { countPages, rowLabel, tilePiece } from "@/lib/tiling";
import { ruviTemplates, uviTemplates } from "@/lib/templates";

describe("ruvi dress pattern (6.3)", () => {
  const p = dressPattern(ruviDefaults);
  it("matches the example back outline", () => {
    expect(p.back).toEqual([
      [0, -2],
      [7.5, 0],
      [19, -4],
      [34, -7.5],
      [34, -22.5],
      [25, -23.5],
      [24, -28],
      [20.5, -42],
      [26, -62],
      [27.5, -85],
      [0, -85],
    ]);
  });
  it("has 7 buttons and a 2.5 cm overlap on the front", () => {
    expect(p.buttons).toHaveLength(7);
    expect(Math.min(...p.front.map((q) => q[0]))).toBe(-2.5);
  });
});

describe("ruvi mask (6.2)", () => {
  it("defaults: balloon 72, shell 23 × 27 × 25", () => {
    const m = maskDims(ruviDefaults);
    expect(m.balloonCirc).toBe(72);
    expect(m.shell).toEqual({ w: 23, h: 27, d: 25 });
    expect(m.eye.up).toBe(14.5);
    expect(m.eye.spacing).toBeCloseTo(6.2);
    expect(m.vent).toEqual({ w: 4, from: 4.5, to: 10.5 });
  });
  it("scales the shell by head circumference ÷ 56", () => {
    const m = maskDims({ ...ruviDefaults, headCirc: 61.6 });
    expect(m.shell.w).toBeCloseTo(25.3);
  });
  it("leaves a 2–3 cm gap round the default head", () => {
    const m = maskDims(ruviDefaults);
    expect(m.minGap).toBeGreaterThanOrEqual(2);
    expect(m.minGap).toBeLessThanOrEqual(3);
  });
});

describe("uvi skirt (5.6)", () => {
  it("width = 2.5 × waist, length = waist-to-floor + 10", () => {
    const v = uviVars(uviDefaults);
    expect(v.skirtWidth).toBe(200);
    expect(v.skirtLength).toBe(115);
  });
});

describe("tiling", () => {
  it("labels rows A, B … Z, AA", () => {
    expect(rowLabel(0)).toBe("A");
    expect(rowLabel(25)).toBe("Z");
    expect(rowLabel(26)).toBe("AA");
  });
  it("fits a 20 × 28.7 piece on one page", () => {
    expect(countPages(20, 28.7)).toEqual({ cols: 1, rows: 1 });
    expect(countPages(39, 28.7)).toEqual({ cols: 2, rows: 1 });
  });
  it("tiles with 1 cm overlaps", () => {
    const t = tilePiece({ minX: 0, minY: 0, maxX: 50, maxY: 50 }, 0, false);
    expect(t.tiles[1].x - t.tiles[0].x).toBeCloseTo(20);
    expect(t.tiles[t.cols].y - t.tiles[0].y).toBeCloseTo(28.7);
  });
  it("generates templates for both characters", () => {
    expect(uviTemplates(uviDefaults).length).toBeGreaterThanOrEqual(6);
    expect(ruviTemplates(ruviDefaults).length).toBeGreaterThanOrEqual(5);
  });
});
