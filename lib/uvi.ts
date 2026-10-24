import {
  helmetFaces,
  helmetSpec,
  helmetVertices,
  knifeSpec,
  skirtSpec,
  type HelmetFaceId,
  type HelmetVertex,
  type UviMeasurements,
} from "@/data/uvi";
import {
  add,
  angleFromVertical,
  centroid3,
  dihedralAngle,
  distance,
  faceFrame,
  fromFace2D,
  insideDistance,
  mul,
  offsetPolygon,
  planeZSegment,
  scaleVertices,
  sectionPolygon,
  toFace2D,
  triangleAngles,
  unfoldTriangle,
  xAtY,
  type Vec2,
  type Vec3,
} from "./geometry";

export function helmetScale(shoulderWidth: number) {
  return shoulderWidth / helmetSpec.baseShoulderWidth;
}

export interface HelmetFaceBuilt {
  id: HelmetFaceId;
  name: string;
  pts: [Vec3, Vec3, Vec3];
  /** Template triangle (bottom edge on x axis, tip above). */
  flat: [Vec2, Vec2, Vec2];
  /** Template-order 3D points. */
  ordered: [Vec3, Vec3, Vec3];
  angles: [number, number, number];
  glueLines: { z: number; seg: [Vec2, Vec2] }[];
  /** Vision window polygon in template coordinates (centre face only). */
  window?: Vec2[];
  window3D?: Vec3[];
  outward: Vec3;
}

export interface FormerBuilt {
  id: string;
  name: string;
  z: number;
  section: Vec3[];
  /** Cut outline, 1 cm inside the section, as top-down 2D (x right, front at top). */
  cut2D: Vec2[];
  hole: number;
  note: string;
  frontEdge: number;
  span: number;
  sideBehind: number;
  depth: number;
}

export interface HelmetBuilt {
  k: number;
  v: Record<HelmetVertex, Vec3>;
  faces: HelmetFaceBuilt[];
  formers: FormerBuilt[];
  inside: Vec3;
  edges: Record<string, number>;
  dihedrals: { centreSide: number; sideBack: number; backBack: number };
  leans: { centre: number; ridge: number };
  head: { centre: Vec3; semi: Vec3 };
  clearance: number;
  size: { height: number; width: number; depth: number };
}

const edgeKey = (a: HelmetVertex, b: HelmetVertex) => `${a}${b}`;

export function buildHelmet(k = 1): HelmetBuilt {
  const v = scaleVertices(helmetVertices, k);
  const allPts = Object.values(v) as Vec3[];
  const inside = centroid3(allPts);

  const faceList = helmetFaces.map((f) => f.verts.map((n) => v[n]) as [Vec3, Vec3, Vec3]);

  const faces: HelmetFaceBuilt[] = helmetFaces.map((f, i) => {
    const pts = faceList[i];
    const ordered = f.templateOrder.map((n) => v[n]) as [Vec3, Vec3, Vec3];
    const frame = faceFrame(ordered[0], ordered[1], ordered[2]);
    const flat = unfoldTriangle(ordered[0], ordered[1], ordered[2]);
    const glueLines = helmetSpec.formers
      .map((former) => {
        const seg = planeZSegment(pts, former.z * k);
        return seg ? { z: former.z * k, seg: [toFace2D(frame, seg[0]), toFace2D(frame, seg[1])] as [Vec2, Vec2] } : null;
      })
      .filter((x): x is { z: number; seg: [Vec2, Vec2] } => x !== null);

    // outward normal
    const c = centroid3(pts);
    const n = frame.ez;
    const outward = insideDistance(pts, add(c, n), inside) < 0 ? n : mul(n, -1);

    const built: HelmetFaceBuilt = {
      id: f.id,
      name: f.name,
      pts,
      flat,
      ordered,
      angles: triangleAngles(ordered[0], ordered[1], ordered[2]),
      glueLines,
      outward,
    };

    if (f.id === "centre") {
      const { zFrom, zTo, inset } = helmetSpec.window;
      // slant height on the template for a given z
      const zBase = ordered[0][2];
      const tip3 = ordered[2];
      const s = (z: number) => ((z - zBase) / (tip3[2] - zBase)) * flat[2][1];
      const insetTri = offsetPolygon(flat, [0, -inset * k, -inset * k]);
      const y1 = s(zFrom * k);
      const y2 = s(zTo * k);
      // inset triangle: [p0 (left base), p1 (right base), p2 (tip)] — long edges p1→p2 (right) and p2→p0 (left)
      const [p0, p1, p2] = insetTri;
      const win: Vec2[] = [
        [xAtY(p0, p2, y1), y1],
        [xAtY(p1, p2, y1), y1],
        [xAtY(p1, p2, y2), y2],
        [xAtY(p0, p2, y2), y2],
      ];
      built.window = win;
      built.window3D = win.map((q) => fromFace2D(frame, q));
    }
    return built;
  });

  const faceById = (id: HelmetFaceId) => faceList[helmetFaces.findIndex((f) => f.id === id)];

  const formers: FormerBuilt[] = helmetSpec.formers.map((f) => {
    const section = sectionPolygon(faceList, f.z * k);
    // Top-down 2D: x right, front (+y) at the top of the drawing → svg y = -y
    const flat2D: Vec2[] = section.map((p) => [p[0], -p[1]]);
    const cut2D = offsetPolygon(flat2D, -helmetSpec.formerInset);
    // Named measurements from the section: front edge = the two points with the largest y
    const byY = [...section].sort((a, b) => b[1] - a[1]);
    const front = [byY[0], byY[1]];
    const sides = [byY[2], byY[3]];
    const back = byY[4];
    const frontY = front[0][1];
    return {
      id: f.id,
      name: f.name,
      z: f.z * k,
      section,
      cut2D,
      hole: f.hole * k,
      note: f.note,
      frontEdge: distance(front[0], front[1]),
      span: Math.abs(sides[0][0] - sides[1][0]),
      sideBehind: frontY - (sides[0][1] + sides[1][1]) / 2,
      depth: frontY - back[1],
    };
  });

  const e = (a: HelmetVertex, b: HelmetVertex) => distance(v[a], v[b]);
  const edges: Record<string, number> = {};
  for (const [a, b] of [
    ["T", "FL"],
    ["T", "FR"],
    ["FL", "FR"],
    ["T", "ML"],
    ["T", "MR"],
    ["ML", "FL"],
    ["MR", "FR"],
    ["T", "K"],
    ["K", "ML"],
    ["K", "MR"],
  ] as [HelmetVertex, HelmetVertex][])
    edges[edgeKey(a, b)] = e(a, b);

  const head = {
    centre: mul(helmetSpec.head.centre, k) as Vec3,
    semi: mul(helmetSpec.head.semi, k) as Vec3,
  };

  return {
    k,
    v,
    faces,
    formers,
    inside,
    edges,
    dihedrals: {
      centreSide: dihedralAngle(faceById("centre"), faceById("sideL"), inside),
      sideBack: dihedralAngle(faceById("sideL"), faceById("backL"), inside),
      backBack: dihedralAngle(faceById("backL"), faceById("backR"), inside),
    },
    leans: {
      centre: angleFromVertical(mul(add(v.FL, v.FR), 0.5), v.T),
      ridge: angleFromVertical(v.K, v.T),
    },
    head,
    // Vertices describe the outer skin; the laminated wall (2 layers) sits inside it.
    clearance: headClearance(faceList, head.centre, head.semi, inside) - 2 * helmetSpec.panelThickness,
    size: {
      height: v.T[2] - v.FL[2],
      width: v.MR[0] - v.ML[0],
      depth: v.FL[1] - v.K[1],
    },
  };
}

/** Minimum distance from the head ellipsoid (above the shoulder line) to the shell planes. */
export function headClearance(faces: Vec3[][], c: Vec3, semi: Vec3, inside: Vec3): number {
  let min = Infinity;
  const N = 36;
  for (let i = 0; i <= N; i++) {
    const theta = (i / N) * Math.PI;
    for (let j = 0; j < N * 2; j++) {
      const phi = (j / (N * 2)) * Math.PI * 2;
      const p: Vec3 = [
        c[0] + semi[0] * Math.sin(theta) * Math.cos(phi),
        c[1] + semi[1] * Math.sin(theta) * Math.sin(phi),
        c[2] + semi[2] * Math.cos(theta),
      ];
      for (const f of faces) min = Math.min(min, insideDistance(f, p, inside));
    }
  }
  return min;
}

/** All derived numbers for text tokens, cut list and templates. */
export function uviVars(m: UviMeasurements) {
  const k = helmetScale(m.shoulderWidth);
  const h = buildHelmet(k);
  const centre = h.faces.find((f) => f.id === "centre")!;
  const side = h.faces.find((f) => f.id === "sideL")!;
  const back = h.faces.find((f) => f.id === "backL")!;
  const win = centre.window!;
  const crown = h.formers[0];
  const top = h.formers[1];
  return {
    k,
    ...m,
    TFL: h.edges.TFL,
    FLFR: h.edges.FLFR,
    TML: h.edges.TML,
    MLFL: h.edges.MLFL,
    TK: h.edges.TK,
    KML: h.edges.KML,
    sideTipX: side.flat[2][0],
    sideTipY: side.flat[2][1],
    backTipX: back.flat[2][0],
    backTipY: back.flat[2][1],
    centreTipY: centre.flat[2][1],
    winStart: win[0][1],
    winHeight: win[2][1] - win[0][1],
    winBottomW: win[1][0] - win[0][0],
    winTopW: win[2][0] - win[3][0],
    crownFront: crown.frontEdge,
    crownSpan: crown.span,
    crownSideBack: crown.sideBehind,
    crownDepth: crown.depth,
    topFront: top.frontEdge,
    topSpan: top.span,
    topSideBack: top.sideBehind,
    topDepth: top.depth,
    helmetHeight: h.size.height,
    helmetWidth: h.size.width,
    helmetDepth: h.size.depth,
    tipHeight: m.shoulderHeight + h.v.T[2],
    clearance: h.clearance,
    skirtWidth: skirtSpec.widthFactor * m.waist,
    skirtLength: m.waistToFloor + skirtSpec.drag + skirtSpec.casingAllowance,
    skirtCasing: skirtSpec.casing,
    knifeOverall: knifeSpec.overall,
  };
}

export type UviVars = ReturnType<typeof uviVars>;
