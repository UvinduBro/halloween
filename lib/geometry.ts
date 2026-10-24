/**
 * Pure geometry helpers. Units are centimetres. 3D space: x right, y forward, z up.
 */

export type Vec3 = readonly [number, number, number];
export type Vec2 = readonly [number, number];

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
export const distance = (a: Vec3, b: Vec3) => length(sub(a, b));
export const normalize = (a: Vec3): Vec3 => {
  const l = length(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => add(a, mul(sub(b, a), t));
export const centroid3 = (pts: readonly Vec3[]): Vec3 =>
  mul(pts.reduce<Vec3>((s, p) => add(s, p), [0, 0, 0]), 1 / pts.length);

export const sub2 = (a: Vec2, b: Vec2): Vec2 => [a[0] - b[0], a[1] - b[1]];
export const add2 = (a: Vec2, b: Vec2): Vec2 => [a[0] + b[0], a[1] + b[1]];
export const len2 = (a: Vec2) => Math.hypot(a[0], a[1]);
export const dist2 = (a: Vec2, b: Vec2) => len2(sub2(a, b));

export const RAD = 180 / Math.PI;

/** Angle in degrees at vertex `at` between the rays to `p` and `q`. */
export function angleAt(at: Vec3, p: Vec3, q: Vec3): number {
  const u = normalize(sub(p, at));
  const v = normalize(sub(q, at));
  return Math.acos(Math.min(1, Math.max(-1, dot(u, v)))) * RAD;
}

/** Interior angles of triangle (a, b, c) in degrees, in vertex order. */
export function triangleAngles(a: Vec3, b: Vec3, c: Vec3): [number, number, number] {
  return [angleAt(a, b, c), angleAt(b, c, a), angleAt(c, a, b)];
}

export function faceNormal(a: Vec3, b: Vec3, c: Vec3): Vec3 {
  return normalize(cross(sub(b, a), sub(c, a)));
}

/** Angle (degrees) of the segment p→q away from vertical (the z axis). */
export function angleFromVertical(p: Vec3, q: Vec3): number {
  const d = sub(q, p);
  return Math.atan2(Math.hypot(d[0], d[1]), Math.abs(d[2])) * RAD;
}

export interface Frame {
  origin: Vec3;
  ex: Vec3;
  ey: Vec3;
  ez: Vec3;
}

/** Local 2D frame on the plane of triangle (a, b, c): a at origin, b on +x, c on the +y side. */
export function faceFrame(a: Vec3, b: Vec3, c: Vec3): Frame {
  const ex = normalize(sub(b, a));
  const ez = normalize(cross(sub(b, a), sub(c, a)));
  const ey = cross(ez, ex);
  return { origin: a, ex, ey, ez };
}

export function toFace2D(f: Frame, p: Vec3): Vec2 {
  const d = sub(p, f.origin);
  return [dot(d, f.ex), dot(d, f.ey)];
}

export function fromFace2D(f: Frame, q: Vec2): Vec3 {
  return add(f.origin, add(mul(f.ex, q[0]), mul(f.ey, q[1])));
}

/**
 * Unfold a 3D triangle onto the plane: the first edge (a→b) sits on the x axis,
 * the third vertex goes above it (positive y).
 */
export function unfoldTriangle(a: Vec3, b: Vec3, c: Vec3): [Vec2, Vec2, Vec2] {
  const f = faceFrame(a, b, c);
  return [toFace2D(f, a), toFace2D(f, b), toFace2D(f, c)];
}

/** Points where the edges of a polygon (3D) cross the horizontal plane z = h. */
export function planeZCrossings(poly: readonly Vec3[], h: number): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const dp = p[2] - h;
    const dq = q[2] - h;
    if (dp === 0) out.push(p);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) out.push(lerp3(p, q, dp / (dp - dq)));
  }
  return out;
}

/** Segment where a face crosses z = h, or null if it does not. */
export function planeZSegment(face: readonly Vec3[], h: number): [Vec3, Vec3] | null {
  const pts = dedupe(planeZCrossings(face, h));
  return pts.length >= 2 ? [pts[0], pts[1]] : null;
}

function dedupe(pts: Vec3[], eps = 1e-6): Vec3[] {
  const out: Vec3[] = [];
  for (const p of pts) if (!out.some((q) => distance(p, q) < eps)) out.push(p);
  return out;
}

/** Horizontal section of a closed shell (list of faces) at z = h: an ordered polygon. */
export function sectionPolygon(faces: readonly (readonly Vec3[])[], h: number): Vec3[] {
  const pts = dedupe(faces.flatMap((f) => planeZCrossings(f, h)));
  const c = centroid3(pts);
  return pts.sort((p, q) => Math.atan2(p[1] - c[1], p[0] - c[0]) - Math.atan2(q[1] - c[1], q[0] - c[0]));
}

/**
 * Interior dihedral angle (degrees) between two faces that share an edge,
 * measured on the side of `inside` (a point inside the shell).
 */
export function dihedralAngle(f1: readonly Vec3[], f2: readonly Vec3[], inside: Vec3): number {
  const outward = (f: readonly Vec3[]) => {
    const n = faceNormal(f[0], f[1], f[2]);
    return dot(n, sub(f[0], inside)) < 0 ? mul(n, -1) : n;
  };
  const n1 = outward(f1);
  const n2 = outward(f2);
  return 180 - Math.acos(Math.min(1, Math.max(-1, dot(n1, n2)))) * RAD;
}

/** Signed distance from point p to the plane of face f; positive on the `inside` side. */
export function insideDistance(f: readonly Vec3[], p: Vec3, inside: Vec3): number {
  let n = faceNormal(f[0], f[1], f[2]);
  if (dot(n, sub(inside, f[0])) < 0) n = mul(n, -1);
  return dot(n, sub(p, f[0]));
}

export function scaleVertices<K extends string>(v: Record<K, Vec3>, k: number): Record<K, Vec3> {
  const out = {} as Record<K, Vec3>;
  for (const key in v) out[key] = mul(v[key], k);
  return out;
}

/* ---------------- 2D polygon helpers ---------------- */

export function polygonArea2D(pts: readonly Vec2[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function bbox2D(pts: readonly Vec2[]): BBox {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

export function unionBBox(boxes: BBox[]): BBox {
  return {
    minX: Math.min(...boxes.map((b) => b.minX)),
    minY: Math.min(...boxes.map((b) => b.minY)),
    maxX: Math.max(...boxes.map((b) => b.maxX)),
    maxY: Math.max(...boxes.map((b) => b.maxY)),
  };
}

function lineIntersect(p1: Vec2, d1: Vec2, p2: Vec2, d2: Vec2): Vec2 | null {
  const den = d1[0] * d2[1] - d1[1] * d2[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den;
  return [p1[0] + d1[0] * t, p1[1] + d1[1] * t];
}

/**
 * Offset a simple polygon edge by edge. `dists[i]` is the outward offset for the edge
 * from point i to point i+1 (negative = inward). Corners are mitred.
 */
export function offsetPolygon(pts: readonly Vec2[], dists: number | readonly number[]): Vec2[] {
  const n = pts.length;
  const ccw = polygonArea2D(pts) > 0;
  const d = (i: number) => (typeof dists === "number" ? dists : dists[i]);
  const lines = pts.map((p, i) => {
    const q = pts[(i + 1) % n];
    const dir = sub2(q, p);
    const l = len2(dir) || 1;
    // Outward normal: right-hand side for CCW polygons.
    const nx = ccw ? dir[1] / l : -dir[1] / l;
    const ny = ccw ? -dir[0] / l : dir[0] / l;
    return { p: [p[0] + nx * d(i), p[1] + ny * d(i)] as Vec2, dir };
  });
  return pts.map((p, i) => {
    const prev = lines[(i - 1 + n) % n];
    const cur = lines[i];
    return lineIntersect(prev.p, prev.dir, cur.p, cur.dir) ?? cur.p;
  });
}

/** x where segment a→b reaches height y (linear interpolation). */
export function xAtY(a: Vec2, b: Vec2, y: number): number {
  if (b[1] === a[1]) return a[0];
  return a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
}

export function pointInPolygon(p: Vec2, poly: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function polyPath(pts: readonly Vec2[], close = true): string {
  return pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(3)} ${p[1].toFixed(3)}`).join(" ") + (close ? " Z" : "");
}

/** Rotate 2D points by angle (degrees) around the origin. */
export function rotate2D(pts: readonly Vec2[], deg: number): Vec2[] {
  const r = deg / RAD;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return pts.map(([x, y]) => [x * c - y * s, x * s + y * c]);
}

export const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
