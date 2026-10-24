import { capSpec, dressSpec, maskSpec, pipeSpec, type RuviMeasurements } from "@/data/ruvi";
import { type Vec2, type Vec3 } from "./geometry";

export function maskDims(m: RuviMeasurements) {
  const k = m.headCirc / maskSpec.baseHeadCirc;
  const shell = { w: maskSpec.shell.w * k, h: maskSpec.shell.h * k, d: maskSpec.shell.d * k };
  const eyeShift = m.chinToEyes - maskSpec.ref.chinToEyes;
  const eyeUp = maskSpec.eye.centreUp + eyeShift;
  const eyeSpacing = maskSpec.eye.spacing * (m.headWidth / maskSpec.ref.headWidth);
  const ventFrom = maskSpec.vent.from;
  const ventTo = maskSpec.vent.to + eyeShift * 0.5;
  // Head ellipsoid semi-axes (x width, y length, z height)
  const headSemi: Vec3 = [m.headWidth / 2, m.headLength / 2, m.chinToCrown / 2];
  const shellSemi: Vec3 = [shell.w / 2, shell.d / 2, shell.h / 2];
  const gaps: Vec3 = [shellSemi[0] - headSemi[0], shellSemi[1] - headSemi[1], shellSemi[2] - headSemi[2]];
  return {
    k,
    balloonCirc: m.headCirc + maskSpec.balloonExtra,
    shell,
    shellSemi,
    headSemi,
    gaps,
    minGap: Math.min(...gaps),
    eye: { w: maskSpec.eye.w, h: maskSpec.eye.h, up: eyeUp, spacing: eyeSpacing },
    vent: { w: maskSpec.vent.w, from: ventFrom, to: ventTo },
    bottomBelowChin: maskSpec.bottomBelowChin,
    lumps: maskSpec.lumps.map((l) => ({ ...l, size: l.size * k, height: l.height * k })),
  };
}

export type MaskDims = ReturnType<typeof maskDims>;

export function dressPattern(m: RuviMeasurements) {
  const s = dressSpec;
  const half = {
    bust: m.bust / 4 + s.ease.bust,
    waist: m.waist / 4 + s.ease.waist,
    hips: m.hips / 4 + s.ease.hips,
    hem: m.hips / 4 + s.ease.hem,
    sleeveOpening: m.upperArm / 2,
    shoulderPoint: m.shoulders / 2,
  };
  const L = m.dressLength;
  const sleeveEnd = half.shoulderPoint + s.sleeveExtension;
  const sleeveTop = -(s.shoulderSlope + s.sleeveDrop);

  const body = (neckDepth: number, neckW: number): Vec2[] => [
    [0, -neckDepth],
    [neckW, 0],
    [half.shoulderPoint, -s.shoulderSlope],
    [sleeveEnd, sleeveTop],
    [sleeveEnd, sleeveTop - half.sleeveOpening],
    [half.bust + 1, -(s.levels.underarm - 4.5)],
    [half.bust, -s.levels.underarm],
    [half.waist, -s.levels.waist],
    [half.hips, -s.levels.hips],
    [half.hem, -L],
    [0, -L],
  ];

  /** Back half, fold along x = 0 (y up = towards the shoulder; y negative downwards). */
  const back = body(s.backNeck.d, s.backNeck.w);
  /** Front: same body, V-neck, plus a button overlap extension past centre front (x < 0). */
  const frontBody = body(s.frontNeck.d, s.frontNeck.w);
  const front: Vec2[] = [[-s.buttonOverlap, -s.frontNeck.d], ...frontBody.slice(1, -1), [-s.buttonOverlap, -L]];

  const buttonTop = s.frontNeck.d + 2;
  const buttonBottom = s.levels.hips + 2;
  const buttons: Vec2[] = Array.from({ length: s.buttons }, (_, i) => [
    0,
    -(buttonTop + (i * (buttonBottom - buttonTop)) / (s.buttons - 1)),
  ]);

  return { half, L, back, front, buttons, levels: s.levels, sleeveEnd };
}

export type DressPattern = ReturnType<typeof dressPattern>;

/** Seam allowance per edge for the back piece: fold edge (last) gets none, hem gets the hem allowance. */
export function backAllowances(n: number) {
  const a = Array<number>(n).fill(dressSpec.seamAllowance);
  a[n - 2] = dressSpec.hem; // hem edge: hem corner → fold bottom
  a[n - 1] = 0; // fold edge
  return a;
}

export function frontAllowances(n: number) {
  const a = Array<number>(n).fill(dressSpec.seamAllowance);
  a[n - 2] = dressSpec.hem;
  a[n - 1] = 0; // centre-front overlap edge is a folded facing; no allowance
  return a;
}

export function ruviVars(m: RuviMeasurements) {
  const mask = maskDims(m);
  const dress = dressPattern(m);
  return {
    ...m,
    k: mask.k,
    balloonCirc: mask.balloonCirc,
    shellW: mask.shell.w,
    shellH: mask.shell.h,
    shellD: mask.shell.d,
    eyeUp: mask.eye.up,
    eyeSpacing: mask.eye.spacing,
    ventFrom: mask.vent.from,
    ventTo: mask.vent.to,
    minGap: mask.minGap,
    halfBust: dress.half.bust,
    halfWaist: dress.half.waist,
    halfHips: dress.half.hips,
    halfHem: dress.half.hem,
    sleeveOpening: dress.half.sleeveOpening,
    shoulderPoint: dress.half.shoulderPoint,
    capCirc: capSpec.ringCirc,
    pipeLength: pipeSpec.length,
  };
}

export type RuviVars = ReturnType<typeof ruviVars>;
