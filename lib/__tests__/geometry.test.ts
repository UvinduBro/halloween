import { describe, expect, it } from "vitest";
import { helmetSpec, helmetVertices } from "@/data/uvi";
import {
  angleFromVertical,
  distance,
  offsetPolygon,
  polygonArea2D,
  sectionPolygon,
  triangleAngles,
  unfoldTriangle,
  type Vec2,
  type Vec3,
} from "@/lib/geometry";
import { buildHelmet, helmetScale, uviVars } from "@/lib/uvi";
import { uviDefaults } from "@/data/uvi";

const v = helmetVertices;
const within = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe("helmet edge lengths (section 5.1)", () => {
  for (const { a, b, len } of helmetSpec.edgeChecks) {
    it(`${a}–${b} = ${len} cm (±0.1)`, () => {
      within(distance(v[a], v[b]), len, 0.1);
    });
  }
  it("is mirror-symmetric", () => {
    within(distance(v.T, v.FR), distance(v.T, v.FL), 1e-9);
    within(distance(v.T, v.MR), distance(v.T, v.ML), 1e-9);
    within(distance(v.K, v.MR), distance(v.K, v.ML), 1e-9);
  });
});

describe("helmet overall size", () => {
  const h = buildHelmet(1);
  it("is 88 tall, 52 wide, 50 deep", () => {
    within(h.size.height, 88, 0.01);
    within(h.size.width, 52, 0.01);
    within(h.size.depth, 50, 0.01);
  });
  it("centre face leans back 20°, ridge leans 16°", () => {
    within(h.leans.centre, 20, 0.5);
    within(h.leans.ridge, 16, 0.5);
    within(angleFromVertical(v.K, v.T), 15.7, 0.1);
  });
  it("dihedral angles: centre–side 130°, side–back 89°, back–back 120°", () => {
    within(h.dihedrals.centreSide, 130, 1);
    within(h.dihedrals.sideBack, 89, 1);
    within(h.dihedrals.backBack, 120, 1);
  });
  it("leaves head clearance of about 2.5–3 cm", () => {
    // measured from the inside of the 2-layer laminated wall
    expect(h.clearance).toBeGreaterThanOrEqual(2.5);
    expect(h.clearance).toBeLessThanOrEqual(3);
  });
});

describe("face angles (cut list 5.2)", () => {
  it("centre front: 83° bottom, 13° tip", () => {
    const [a, , t] = triangleAngles(v.FL, v.FR, v.T);
    within(a, 83, 0.5);
    within(t, 13, 0.5);
  });
  it("side panel: 41° front, 112° shoulder, 26° tip", () => {
    const [front, shoulder, tip] = triangleAngles(v.FL, v.ML, v.T);
    within(front, 41, 0.5);
    within(shoulder, 112, 0.5);
    within(tip, 26, 0.5);
  });
  it("back panel: 78° ridge, 75° shoulder, 26° tip", () => {
    const [ridge, shoulder, tip] = triangleAngles(v.K, v.ML, v.T);
    within(ridge, 78, 0.6);
    within(shoulder, 75, 0.6);
    within(tip, 26, 0.6);
  });
});

describe("unfolding", () => {
  it("puts the first edge on the x axis and the third vertex above it", () => {
    const [a, b, c] = unfoldTriangle(v.FL, v.ML, v.T);
    expect(a).toEqual([0, 0]);
    within(b[1], 0, 1e-9);
    within(b[0], 45.4, 0.1);
    expect(c[1]).toBeGreaterThan(0);
  });
  it("side tip mark: 70.8 along, 62.3 up", () => {
    const [, , c] = unfoldTriangle(v.FL, v.ML, v.T);
    within(c[0], 70.8, 0.15);
    within(c[1], 62.3, 0.15);
  });
  it("back tip mark: 13.6 along, 65.1 up", () => {
    const [, , c] = unfoldTriangle(v.K, v.ML, v.T);
    within(c[0], 13.6, 0.15);
    within(c[1], 65.1, 0.15);
  });
  it("preserves all edge lengths", () => {
    const tri: Vec3[] = [v.K, v.ML, v.T];
    const flat = unfoldTriangle(tri[0], tri[1], tri[2]);
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      within(Math.hypot(flat[i][0] - flat[j][0], flat[i][1] - flat[j][1]), distance(tri[i], tri[j]), 1e-9);
    }
  });
});

describe("formers (plane sections)", () => {
  const h = buildHelmet(1);
  const [crown, top] = h.formers;
  it("crown former at z = 32 is a pentagon: front 8.5, span 28.5, side 13.5 behind, back 21.9 behind", () => {
    expect(crown.section).toHaveLength(5);
    within(crown.frontEdge, 8.5, 0.1);
    within(crown.span, 28.5, 0.1);
    within(crown.sideBehind, 13.5, 0.1);
    within(crown.depth, 21.9, 0.1);
  });
  it("top former at z = 50: front 4.0, span 13.4, side 6.3 behind, back 10.3 behind", () => {
    within(top.frontEdge, 4.0, 0.1);
    within(top.span, 13.4, 0.1);
    within(top.sideBehind, 6.3, 0.1);
    within(top.depth, 10.3, 0.1);
  });
  it("sectionPolygon lies on the plane", () => {
    const sec = sectionPolygon(
      h.faces.map((f) => f.pts),
      40,
    );
    for (const p of sec) within(p[2], 40, 1e-9);
  });
  it("cut outline is 1 cm smaller all round", () => {
    const a1 = Math.abs(polygonArea2D(crown.section.map(([x, y]) => [x, -y] as Vec2)));
    const a2 = Math.abs(polygonArea2D(crown.cut2D));
    expect(a2).toBeLessThan(a1);
  });
});

describe("vision window", () => {
  const vars = uviVars(uviDefaults);
  it("starts 34 cm up, 15 tall, 10 → 6.5 wide", () => {
    within(vars.winStart, 34, 0.2);
    within(vars.winHeight, 15, 0.2);
    within(vars.winBottomW, 10, 0.2);
    within(vars.winTopW, 6.5, 0.2);
  });
});

describe("scaling", () => {
  it("scale factor is shoulder width ÷ 44", () => {
    expect(helmetScale(44)).toBe(1);
    within(helmetScale(48.4), 1.1, 1e-9);
  });
  it("scales every edge linearly", () => {
    const a = buildHelmet(1);
    const b = buildHelmet(1.1);
    for (const key of Object.keys(a.edges)) within(b.edges[key], a.edges[key] * 1.1, 1e-9);
  });
  it("tip height is shoulder height + 66 cm (≈ 213 cm by default)", () => {
    const vars = uviVars(uviDefaults);
    within(vars.tipHeight, 213, 0.01);
  });
});

describe("offsetPolygon", () => {
  it("offsets a square outward by 1", () => {
    const sq: Vec2[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const o = offsetPolygon(sq, 1);
    within(Math.abs(polygonArea2D(o)), 144, 1e-9);
    const i = offsetPolygon(sq, -1);
    within(Math.abs(polygonArea2D(i)), 64, 1e-9);
  });
});
