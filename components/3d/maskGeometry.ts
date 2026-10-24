import * as THREE from "three";
import type { MaskDims } from "@/lib/ruvi";
import type { Vec3 } from "@/lib/geometry";

/**
 * Mask shell coordinates (cm): origin at the shell centre, x right, y forward (face), z up.
 * The head ellipsoid is concentric with the shell.
 */

export function maskCut(d: MaskDims) {
  const [, b, c] = d.shellSemi;
  // front: 3 cm below the chin; back: up at the nape
  const front = Math.max(-(d.headSemi[2] + d.bottomBelowChin), -0.97 * c);
  const back = -d.headSemi[2] * 0.5;
  const zAt = (y: number) => back + ((y + b) / (2 * b)) * (front - back);
  return { front, back, zAt, splitY: -0.12 * b };
}

/** Point on the ellipsoid surface in direction (x, z) on the front (y > 0). */
export function frontSurface(semi: Vec3, x: number, z: number, out = 0): Vec3 {
  const [a, b, c] = semi;
  const t = 1 - (x * x) / (a * a) - (z * z) / (c * c);
  const y = b * Math.sqrt(Math.max(0, t));
  const n = new THREE.Vector3(x / (a * a), y / (b * b), z / (c * c)).normalize();
  return [x + n.x * out, y + n.y * out, z + n.z * out];
}

export interface Openings {
  eyes: { cx: number; z: number; w: number; h: number }[];
  vent: { cx: number; z: number; w: number; h: number };
}

export function maskOpenings(d: MaskDims): Openings {
  const { front } = maskCut(d);
  return {
    eyes: [-1, 1].map((s) => ({ cx: (s * d.eye.spacing) / 2, z: front + d.eye.up, w: d.eye.w, h: d.eye.h })),
    vent: { cx: 0, z: front + (d.vent.from + d.vent.to) / 2, w: d.vent.w, h: d.vent.to - d.vent.from },
  };
}

function inRect(x: number, z: number, r: { cx: number; z: number; w: number; h: number }, pad = 0) {
  return Math.abs(x - r.cx) <= r.w / 2 + pad && Math.abs(z - r.z) <= r.h / 2 + pad;
}

export function inOpening(p: Vec3, o: Openings, pad = 0) {
  if (p[1] <= 0) return false;
  return o.eyes.some((e) => inRect(p[0], p[2], e, pad)) || inRect(p[0], p[2], o.vent, pad);
}

export interface ShellOptions {
  semi: Vec3;
  part: "front" | "back" | "whole";
  lumps: boolean;
  openings: boolean;
  /** Extra outward offset (cm), e.g. for the tissue skin. */
  inflate?: number;
  cutBottom?: boolean;
  res?: [number, number];
}

export function shellGeometry(d: MaskDims, o: ShellOptions) {
  const [a, b, c] = o.semi;
  const [nu, nv] = o.res ?? [96, 64];
  const cut = maskCut(d);
  const openings = maskOpenings(d);
  const lumpList = d.lumps.map((l) => {
    const dir = new THREE.Vector3(...l.dir).normalize();
    // project the direction onto the ellipsoid
    const r = 1 / Math.sqrt((dir.x * dir.x) / (a * a) + (dir.y * dir.y) / (b * b) + (dir.z * dir.z) / (c * c));
    return { p: dir.multiplyScalar(r), sigma: l.size / 4, h: l.height };
  });

  const pos: number[] = [];
  const keepVertex: boolean[] = [];
  const tmp = new THREE.Vector3();
  const nrm = new THREE.Vector3();
  for (let j = 0; j <= nv; j++) {
    const v = (j / nv) * Math.PI;
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * Math.PI * 2;
      tmp.set(a * Math.sin(v) * Math.cos(u), b * Math.sin(v) * Math.sin(u), c * Math.cos(v));
      nrm.set(tmp.x / (a * a), tmp.y / (b * b), tmp.z / (c * c)).normalize();
      let disp = o.inflate ?? 0;
      if (o.lumps) {
        for (const l of lumpList) {
          const d2 = tmp.distanceToSquared(l.p);
          disp += l.h * Math.exp(-d2 / (2 * l.sigma * l.sigma));
        }
      }
      tmp.addScaledVector(nrm, disp);
      pos.push(tmp.x, tmp.y, tmp.z);
      keepVertex.push(true);
    }
  }
  const idx: number[] = [];
  const row = nu + 1;
  const P = (k: number): Vec3 => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]];
  for (let j = 0; j < nv; j++) {
    for (let i = 0; i < nu; i++) {
      const k0 = j * row + i;
      const k1 = k0 + 1;
      const k2 = k0 + row;
      const k3 = k2 + 1;
      for (const tri of [
        [k0, k2, k1],
        [k1, k2, k3],
      ]) {
        const ps = tri.map(P);
        const cx = (ps[0][0] + ps[1][0] + ps[2][0]) / 3;
        const cy = (ps[0][1] + ps[1][1] + ps[2][1]) / 3;
        const cz = (ps[0][2] + ps[1][2] + ps[2][2]) / 3;
        if (o.cutBottom !== false && cz < cut.zAt(cy)) continue;
        if (o.part === "front" && cy < cut.splitY) continue;
        if (o.part === "back" && cy >= cut.splitY) continue;
        if (o.openings && inOpening([cx, cy, cz], openings)) continue;
        idx.push(...tri);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Ellipse ribbon round the shell in the plane with normal `n`, skipping the bottom and openings. */
export function ribbonGeometry(d: MaskDims, semi: Vec3, n: Vec3, width: number, out: number, phase = 0) {
  const [a, b, c] = semi;
  const N = new THREE.Vector3(...n).normalize();
  const e1 = new THREE.Vector3(0, 0, 1).cross(N);
  if (e1.lengthSq() < 1e-6) e1.set(1, 0, 0);
  e1.normalize();
  const e2 = N.clone().cross(e1).normalize();
  const cut = maskCut(d);
  const openings = maskOpenings(d);
  const pos: number[] = [];
  const steps = 160;
  let prev: THREE.Vector3[] | null = null;
  for (let s = 0; s <= steps; s++) {
    const t = (s / steps) * Math.PI * 2;
    const dir = e1.clone().multiplyScalar(Math.cos(t)).addScaledVector(e2, Math.sin(t));
    const r = 1 / Math.sqrt((dir.x * dir.x) / (a * a) + (dir.y * dir.y) / (b * b) + (dir.z * dir.z) / (c * c));
    const p = dir.multiplyScalar(r);
    const nrm = new THREE.Vector3(p.x / (a * a), p.y / (b * b), p.z / (c * c)).normalize();
    const wob = 1 + 0.15 * Math.sin(t * 5 + phase);
    p.addScaledVector(nrm, out);
    const p1 = p.clone().addScaledVector(N, (width * wob) / 2);
    const p2 = p.clone().addScaledVector(N, (-width * wob) / 2);
    const ok =
      p.z > cut.zAt(p.y) + 0.8 && !inOpening([p.x, p.y, p.z], openings, 0.8) && !inOpening([p1.x, p1.y, p1.z], openings, 0.5) && !inOpening([p2.x, p2.y, p2.z], openings, 0.5);
    if (ok && prev) pos.push(...prev[0].toArray(), ...prev[1].toArray(), ...p1.toArray(), ...prev[1].toArray(), ...p2.toArray(), ...p1.toArray());
    prev = ok ? [p1, p2] : null;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Polyline along the ellipsoid where the bottom edge is cut. */
export function bottomEdgeLine(d: MaskDims, semi: Vec3, out = 0.3): Vec3[] {
  const [a, b, c] = semi;
  const cut = maskCut(d);
  const pts: Vec3[] = [];
  for (let i = 0; i <= 120; i++) {
    const u = (i / 120) * Math.PI * 2;
    // find polar angle v where z = zAt(y) by bisection
    let lo = 0;
    let hi = Math.PI;
    for (let k = 0; k < 40; k++) {
      const v = (lo + hi) / 2;
      const y = b * Math.sin(v) * Math.sin(u);
      const z = c * Math.cos(v);
      if (z > cut.zAt(y)) lo = v;
      else hi = v;
    }
    const v = (lo + hi) / 2;
    const p = new THREE.Vector3(a * Math.sin(v) * Math.cos(u), b * Math.sin(v) * Math.sin(u), c * Math.cos(v));
    const n = new THREE.Vector3(p.x / (a * a), p.y / (b * b), p.z / (c * c)).normalize();
    p.addScaledVector(n, out);
    pts.push([p.x, p.y, p.z]);
  }
  return pts;
}

/** A vertical loop in the plane y = y0 (split line) or x = 0 (centre line), above the bottom cut. */
export function planeLoop(d: MaskDims, semi: Vec3, plane: "x" | "y", value: number, out = 0.3): Vec3[] {
  const [a, b, c] = semi;
  const cut = maskCut(d);
  const pts: Vec3[] = [];
  for (let i = 0; i <= 120; i++) {
    // start at the bottom so the kept (upper) arc is contiguous
    const t = -Math.PI / 2 + (i / 120) * Math.PI * 2;
    let p: THREE.Vector3;
    if (plane === "x") {
      const s = Math.sqrt(Math.max(0, 1 - (value * value) / (a * a)));
      p = new THREE.Vector3(value, b * s * Math.cos(t), c * s * Math.sin(t));
    } else {
      const s = Math.sqrt(Math.max(0, 1 - (value * value) / (b * b)));
      p = new THREE.Vector3(a * s * Math.cos(t), value, c * s * Math.sin(t));
    }
    if (p.z < cut.zAt(p.y)) continue;
    const n = new THREE.Vector3(p.x / (a * a), p.y / (b * b), p.z / (c * c)).normalize();
    p.addScaledVector(n, out);
    pts.push([p.x, p.y, p.z]);
  }
  return pts;
}

export function rectOnFront(semi: Vec3, r: { cx: number; z: number; w: number; h: number }, out = 0.35): Vec3[] {
  const pts: Vec3[] = [];
  const corners: [number, number][] = [
    [r.cx - r.w / 2, r.z - r.h / 2],
    [r.cx + r.w / 2, r.z - r.h / 2],
    [r.cx + r.w / 2, r.z + r.h / 2],
    [r.cx - r.w / 2, r.z + r.h / 2],
  ];
  for (let i = 0; i < 4; i++) {
    const [x1, z1] = corners[i];
    const [x2, z2] = corners[(i + 1) % 4];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8;
      pts.push(frontSurface(semi, x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, out));
    }
  }
  return pts;
}

/** Thin curved patch over an opening (chiffon). */
export function patchOnFront(semi: Vec3, r: { cx: number; z: number; w: number; h: number }, out: number) {
  const nx = 6;
  const nz = 6;
  const pos: number[] = [];
  const P = (i: number, j: number) =>
    frontSurface(semi, r.cx - r.w / 2 - 0.3 + ((r.w + 0.6) * i) / nx, r.z - r.h / 2 - 0.3 + ((r.h + 0.6) * j) / nz, out);
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const a = P(i, j);
      const b = P(i + 1, j);
      const c = P(i + 1, j + 1);
      const d = P(i, j + 1);
      pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
