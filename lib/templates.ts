import { capSpec, dressSpec, scalpelSpec, type RuviMeasurements } from "@/data/ruvi";
import { helmetSpec, knifeSpec, type UviMeasurements } from "@/data/uvi";
import {
  bbox2D,
  dist2,
  faceFrame,
  offsetPolygon,
  planeZSegment,
  polyPath,
  toFace2D,
  unionBBox,
  type BBox,
  type Vec2,
} from "./geometry";
import { backAllowances, dressPattern, frontAllowances, maskDims } from "./ruvi";
import { buildHelmet, helmetScale } from "./uvi";

export type PathKind = "cut" | "stitch" | "fold" | "glue" | "window" | "mark" | "hole" | "guide";

export interface TemplatePath {
  d: string;
  kind: PathKind;
}

export interface TemplateLabel {
  x: number;
  y: number;
  text: string;
  size?: number;
  rotate?: number;
  /** Length in cm — rendered in the active unit by the viewer. */
  lengthCm?: number;
  anchor?: "start" | "middle" | "end";
}

export interface TemplatePiece {
  id: string;
  name: string;
  character: "uvi" | "ruvi";
  instructions: string;
  paths: TemplatePath[];
  labels: TemplateLabel[];
  bbox: BBox;
  /** Outer outline, used to skip blank tiles. */
  outline: Vec2[];
}

/** Flat coordinates are y-up; SVG is y-down. */
const fy = (pts: readonly Vec2[]): Vec2[] => pts.map(([x, y]) => [x, -y]);

const circlePath = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;

function edgeLabels(pts: readonly Vec2[], skip: number[] = [], inwardShift = 1.6): TemplateLabel[] {
  const n = pts.length;
  // centroid for inward direction
  const cx = pts.reduce((s, p) => s + p[0], 0) / n;
  const cy = pts.reduce((s, p) => s + p[1], 0) / n;
  const out: TemplateLabel[] = [];
  for (let i = 0; i < n; i++) {
    if (skip.includes(i)) continue;
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const len = dist2(a, b);
    if (len < 4) continue;
    let mx = (a[0] + b[0]) / 2;
    let my = (a[1] + b[1]) / 2;
    const dx = cx - mx;
    const dy = cy - my;
    const dl = Math.hypot(dx, dy) || 1;
    mx += (dx / dl) * inwardShift;
    my += (dy / dl) * inwardShift;
    let ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    if (ang > 90) ang -= 180;
    if (ang < -90) ang += 180;
    out.push({ x: mx, y: my, text: "", lengthCm: len, rotate: ang, size: 1.1 });
  }
  return out;
}

function finish(piece: Omit<TemplatePiece, "bbox" | "outline">, outline: Vec2[]): TemplatePiece {
  return { ...piece, bbox: bbox2D(outline), outline };
}

/* ------------------------------------------------------------------ */
/* UVI                                                                 */
/* ------------------------------------------------------------------ */

export function uviTemplates(m: UviMeasurements): TemplatePiece[] {
  const k = helmetScale(m.shoulderWidth);
  const h = buildHelmet(k);
  const pieces: TemplatePiece[] = [];

  const faceInfo: Record<string, { name: string; instructions: string }> = {
    centre: { name: "Helmet · Centre front", instructions: "Cut 1 piece × 2 layers. Laminate with corrugation crossed." },
    sideL: {
      name: "Helmet · Side panel",
      instructions: "Cut 2 mirrored pieces × 2 layers each. Flip the template for the second side.",
    },
    backL: {
      name: "Helmet · Back panel",
      instructions: "Cut 2 mirrored pieces × 2 layers each. Vent holes near the top.",
    },
  };

  for (const id of ["centre", "sideL", "backL"] as const) {
    const f = h.faces.find((x) => x.id === id)!;
    const tri = fy(f.flat);
    const paths: TemplatePath[] = [{ d: polyPath(tri), kind: "cut" }];
    const labels: TemplateLabel[] = [...edgeLabels(tri)];
    for (const g of f.glueLines) {
      const seg = fy(g.seg);
      paths.push({ d: polyPath(seg, false), kind: "glue" });
      const z = Math.round(g.z / k);
      labels.push({
        x: (seg[0][0] + seg[1][0]) / 2,
        y: (seg[0][1] + seg[1][1]) / 2 - 0.6,
        text: z === 32 ? "crown former glue line" : "top former glue line",
        size: 0.9,
      });
    }
    if (f.window) {
      const w = fy(f.window);
      paths.push({ d: polyPath(w), kind: "window" });
      labels.push({ x: (w[0][0] + w[1][0]) / 2, y: (w[0][1] + w[2][1]) / 2, text: "WINDOW", size: 1 });
      // peripheral window note not needed on centre
    }
    if (id === "sideL") {
      // Optional 4 × 6 cm peripheral window, just behind the front edge at eye level (z ≈ 18 cm)
      const frame = faceFrame(f.ordered[0], f.ordered[1], f.ordered[2]);
      const seg = planeZSegment(f.pts, 18 * k);
      if (seg) {
        const a = toFace2D(frame, seg[0]);
        const b = toFace2D(frame, seg[1]);
        // The front end lies on the front edge FL→T, i.e. the line from the origin to the tip.
        const tip = f.flat[2];
        const offLine = (p: Vec2) => Math.abs(p[0] * tip[1] - p[1] * tip[0]);
        const [front, rear] = offLine(a) < offLine(b) ? [a, b] : [b, a];
        // Walk 3 cm from the front edge towards the rear end, then lay a 6 × 4 cm window
        const dx = rear[0] - front[0];
        const dy = rear[1] - front[1];
        const dl = Math.hypot(dx, dy) || 1;
        const ux = dx / dl;
        const uy = dy / dl;
        const at = (s: number, t: number): Vec2 => [front[0] + ux * s - uy * t, front[1] + uy * s + ux * t];
        const rect: Vec2[] = [at(3 * k, -2 * k), at(9 * k, -2 * k), at(9 * k, 2 * k), at(3 * k, 2 * k)];
        const r = fy(rect);
        paths.push({ d: polyPath(r), kind: "window" });
        labels.push({ x: (r[0][0] + r[1][0]) / 2, y: r[2][1] - 0.6, text: "optional peripheral window", size: 0.7 });
      }
    }
    if (id === "backL") {
      // vent holes near the top
      const tip = tri[2];
      const base0 = tri[0];
      const base1 = tri[1];
      for (let i = 0; i < 4; i++) {
        const t = 0.18 + i * 0.05;
        const cx = tip[0] + ((base0[0] + base1[0]) / 2 - tip[0]) * t;
        const cy = tip[1] + ((base0[1] + base1[1]) / 2 - tip[1]) * t;
        paths.push({ d: circlePath(cx, cy, (helmetSpec.vents.diameter * k) / 2), kind: "hole" });
      }
      labels.push({ x: tri[2][0] + 3, y: tri[2][1] + 14, text: "vents Ø1.5", size: 0.8, anchor: "start" });
    }
    const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
    const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
    labels.push({ x: cx, y: cy + 6, text: faceInfo[id].name.replace("Helmet · ", "").toUpperCase(), size: 1.6 });
    labels.push({ x: cx, y: cy + 8, text: "corrugation ↕ layer 1 · ↔ layer 2", size: 0.8 });
    labels.push({ x: (tri[0][0] + tri[1][0]) / 2, y: tri[0][1] - 0.6, text: "BOTTOM", size: 0.9 });
    pieces.push(finish({ id: `helmet-${id}`, character: "uvi", paths, labels, ...faceInfo[id] }, tri));
  }

  for (const former of h.formers) {
    const cut = former.cut2D;
    const section = former.section.map(([x, y]) => [x, -y] as Vec2);
    const paths: TemplatePath[] = [
      { d: polyPath(cut), kind: "cut" },
      { d: polyPath(section), kind: "guide" },
    ];
    const cx = cut.reduce((s, p) => s + p[0], 0) / cut.length;
    const cy = cut.reduce((s, p) => s + p[1], 0) / cut.length;
    if (former.hole > 0) paths.push({ d: circlePath(cx, cy, former.hole / 2), kind: "hole" });
    const frontY = Math.min(...cut.map((p) => p[1]));
    pieces.push(
      finish(
        {
          id: `former-${former.id}`,
          character: "uvi",
          name: `Helmet · ${former.name}`,
          instructions: `Cut 1 × 2 layers. Solid line is the cut (1 cm inside the shell); dashed line is the shell at z = ${Math.round(former.z / k)} cm. ${former.note}`,
          paths,
          labels: [
            ...edgeLabels(cut, [], 1.4),
            { x: cx, y: frontY - 1.2, text: "FRONT ▲", size: 1 },
            { x: cx, y: cy + (former.hole > 0 ? former.hole / 2 + 1.6 : 0), text: former.name.toUpperCase(), size: 1.1 },
          ],
        },
        section,
      ),
    );
  }

  // Knife blade (template for all 3 layers)
  const blade = fy(knifeSpec.polygon);
  const slotY = 10 - knifeSpec.slot.w / 2; // centred on the 20 cm handle end
  const slot: Vec2[] = [
    [0, slotY],
    [knifeSpec.slot.l, slotY],
    [knifeSpec.slot.l, slotY + knifeSpec.slot.w],
    [0, slotY + knifeSpec.slot.w],
  ];
  const bevelLine: Vec2[] = [
    [0, 20 - knifeSpec.bevel],
    [120 - knifeSpec.bevel * 0.6, 30 - knifeSpec.bevel],
  ];
  pieces.push(
    finish(
      {
        id: "knife-blade",
        character: "uvi",
        name: "Great Knife · Blade layer",
        instructions:
          "Cut 3 layers. Cut the dashed slot in the MIDDLE layer only. Sand the bevel from the cutting edge to the dotted line.",
        paths: [
          { d: polyPath(blade), kind: "cut" },
          { d: polyPath(slot), kind: "window" },
          { d: polyPath(bevelLine, false), kind: "fold" },
          { d: circlePath(116, 27, 1.2), kind: "mark" },
        ],
        labels: [
          ...edgeLabels(blade),
          { x: 50, y: 10, text: "GREAT KNIFE · BLADE", size: 1.8 },
          { x: 7.5, y: slotY - 0.8, text: "slot (middle only)", size: 0.8 },
          { x: 60, y: 24, text: "bevel line", size: 0.8 },
          { x: 112, y: 25, text: "drag pad", size: 0.7, anchor: "end" },
          { x: 2, y: 10, text: "← pipe", size: 0.8, anchor: "start" },
        ],
      },
      blade,
    ),
  );

  return pieces;
}

/* ------------------------------------------------------------------ */
/* RUVI                                                                */
/* ------------------------------------------------------------------ */

export function ruviTemplates(m: RuviMeasurements): TemplatePiece[] {
  const pieces: TemplatePiece[] = [];
  const p = dressPattern(m);

  const levelMarks = (outline: Vec2[], x0: number) => {
    const paths: TemplatePath[] = [];
    const labels: TemplateLabel[] = [];
    for (const [name, y] of Object.entries(p.levels)) {
      paths.push({ d: polyPath([[x0, y], [x0 + 6, y]], false), kind: "mark" });
      labels.push({ x: x0 + 6.5, y: y + 0.3, text: name, size: 0.8, anchor: "start" });
    }
    void outline;
    return { paths, labels };
  };

  // Back (on fold)
  {
    const stitch = fy(p.back);
    const cut = offsetPolygon(stitch, backAllowances(stitch.length));
    const marks = levelMarks(stitch, 1);
    pieces.push(
      finish(
        {
          id: "dress-back",
          character: "ruvi",
          name: "Dress · Back (on fold)",
          instructions: `Place the straight edge on the fold. Cut 1. Solid = cut line (includes ${dressSpec.seamAllowance} cm seams, ${dressSpec.hem} cm hem); dashed = stitch line.`,
          paths: [
            { d: polyPath(cut), kind: "cut" },
            { d: polyPath(stitch), kind: "stitch" },
            { d: polyPath([[0, 2], [0, p.L]], false), kind: "fold" },
            ...marks.paths,
          ],
          labels: [
            ...edgeLabels(stitch, [stitch.length - 1], 2),
            ...marks.labels,
            { x: 1.2, y: p.L / 2, text: "PLACE ON FOLD", size: 1.1, rotate: -90 },
            { x: p.half.hips / 2 + 1, y: p.L * 0.55, text: "DRESS BACK", size: 1.6 },
            { x: p.half.hips / 2 + 1, y: p.L * 0.55 + 2, text: "grain ↕", size: 0.9 },
          ],
        },
        cut,
      ),
    );
  }

  // Front (cut 2 mirrored)
  {
    const stitch = fy(p.front);
    const cut = offsetPolygon(stitch, frontAllowances(stitch.length));
    const marks = levelMarks(stitch, 1);
    const buttons = fy(p.buttons);
    pieces.push(
      finish(
        {
          id: "dress-front",
          character: "ruvi",
          name: "Dress · Front",
          instructions: `Cut 2 mirrored. The ${dressSpec.buttonOverlap} cm strip left of centre front is the button overlap. Mark the 7 buttons on the centre line.`,
          paths: [
            { d: polyPath(cut), kind: "cut" },
            { d: polyPath(stitch), kind: "stitch" },
            { d: polyPath([[0, dressSpec.frontNeck.d], [0, p.L]], false), kind: "fold" },
            ...buttons.map(([x, y]) => ({ d: circlePath(x, y, 0.6), kind: "mark" as const })),
            ...marks.paths,
          ],
          labels: [
            ...edgeLabels(stitch, [], 2),
            ...marks.labels,
            { x: 0.8, y: dressSpec.frontNeck.d + 1, text: "centre front", size: 0.8, anchor: "start" },
            { x: p.half.hips / 2 + 2, y: p.L * 0.55, text: "DRESS FRONT", size: 1.6 },
            { x: p.half.hips / 2 + 2, y: p.L * 0.55 + 2, text: "cut 2 mirrored · grain ↕", size: 0.9 },
          ],
        },
        cut,
      ),
    );
  }

  // Cap fabric and stiffener
  {
    const { w, h } = capSpec.fabric;
    const rect: Vec2[] = [
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ];
    pieces.push(
      finish(
        {
          id: "cap-fabric",
          character: "ruvi",
          name: "Cap · Fabric band",
          instructions: "Cut 2 fabric layers + interfacing. Fold the cuff up along the dashed line; join the short ends 6 cm up.",
          paths: [
            { d: polyPath(rect), kind: "cut" },
            { d: polyPath([[0, h - capSpec.cuff], [w, h - capSpec.cuff]], false), kind: "fold" },
            { d: polyPath([[0, h - capSpec.joinHeight], [1.5, h - capSpec.joinHeight]], false), kind: "mark" },
            { d: polyPath([[w, h - capSpec.joinHeight], [w - 1.5, h - capSpec.joinHeight]], false), kind: "mark" },
            { d: polyPath([[w / 2, 0], [w / 2, 3]], false), kind: "mark" },
          ],
          labels: [
            ...edgeLabels(rect),
            { x: w / 2, y: h / 2 - 1, text: "CAP BAND", size: 1.4 },
            { x: w / 2, y: h - capSpec.cuff + 1.6, text: "cuff fold", size: 0.8 },
            { x: 2, y: h - capSpec.joinHeight - 0.4, text: "join to here", size: 0.7, anchor: "start" },
            { x: w / 2, y: 3.8, text: "back pleat", size: 0.7 },
          ],
        },
        rect,
      ),
    );
    const sw = capSpec.stiffener.w;
    const sh = capSpec.stiffener.h;
    const srect: Vec2[] = [
      [0, 0],
      [sw, 0],
      [sw, sh],
      [0, sh],
    ];
    pieces.push(
      finish(
        {
          id: "cap-stiffener",
          character: "ruvi",
          name: "Cap · Card stiffener",
          instructions: "Cut 1 from thin card. Slides inside the band.",
          paths: [{ d: polyPath(srect), kind: "cut" }],
          labels: [...edgeLabels(srect), { x: sw / 2, y: sh / 2, text: "STIFFENER", size: 1.2 }],
        },
        srect,
      ),
    );
  }

  // Mask opening guide
  {
    const md = maskDims(m);
    const w = md.shell.w;
    const top = md.eye.up + md.eye.h / 2 + 4;
    const outline: Vec2[] = [
      [-w / 2, 0],
      [w / 2, 0],
      [w / 2, -top],
      [-w / 2, -top],
    ];
    const rectAt = (cx: number, cyUp: number, rw: number, rh: number): Vec2[] => [
      [cx - rw / 2, -(cyUp - rh / 2)],
      [cx + rw / 2, -(cyUp - rh / 2)],
      [cx + rw / 2, -(cyUp + rh / 2)],
      [cx - rw / 2, -(cyUp + rh / 2)],
    ];
    const eyeL = rectAt(-md.eye.spacing / 2, md.eye.up, md.eye.w, md.eye.h);
    const eyeR = rectAt(md.eye.spacing / 2, md.eye.up, md.eye.w, md.eye.h);
    const vent = rectAt(0, (md.vent.from + md.vent.to) / 2, md.vent.w, md.vent.to - md.vent.from);
    pieces.push(
      finish(
        {
          id: "mask-guide",
          character: "ruvi",
          name: "Mask · Opening guide",
          instructions:
            "Cut out on the solid outline and the three windows. Hold it against the front of the shell with the bottom edge on the marked bottom line and the centre line matched, then trace the openings.",
          paths: [
            { d: polyPath(outline), kind: "guide" },
            { d: polyPath(eyeL), kind: "window" },
            { d: polyPath(eyeR), kind: "window" },
            { d: polyPath(vent), kind: "window" },
            { d: polyPath([[0, 0], [0, -top]], false), kind: "fold" },
          ],
          labels: [
            { x: 0, y: -top + 1.4, text: "MASK FRONT · OPENINGS", size: 1 },
            { x: 0, y: -0.6, text: "bottom edge (3 cm below chin)", size: 0.7 },
            { x: -md.eye.spacing / 2, y: -(md.eye.up + md.eye.h / 2) - 0.5, text: "eye", size: 0.7 },
            { x: md.eye.spacing / 2, y: -(md.eye.up + md.eye.h / 2) - 0.5, text: "eye", size: 0.7 },
            { x: md.vent.w / 2 + 0.4, y: -(md.vent.from + md.vent.to) / 2, text: "vent (chiffon only)", size: 0.7, anchor: "start" },
          ],
        },
        outline,
      ),
    );
  }

  // Scalpel
  {
    const { handle, blade } = scalpelSpec;
    const outline: Vec2[] = [
      [0, 0],
      [handle, 0.2],
      [handle, 0.4],
      [handle + blade * 0.3, 0],
      [handle + blade, 0.9],
      [handle + blade * 0.2, 1.4],
      [handle, 1.2],
      [0, 1.4],
    ];
    pieces.push(
      finish(
        {
          id: "scalpel",
          character: "ruvi",
          name: "Prop · Scalpel (optional)",
          instructions: "Cut from 5 mm foam or 3 card layers. Keep every edge blunt.",
          paths: [{ d: polyPath(outline), kind: "cut" }],
          labels: [{ x: handle / 2, y: 3, text: "SCALPEL · blunt", size: 0.9 }],
        },
        outline,
      ),
    );
  }

  return pieces;
}

export function templatesFor(character: "uvi" | "ruvi", uvi: UviMeasurements, ruvi: RuviMeasurements) {
  return character === "uvi" ? uviTemplates(uvi) : ruviTemplates(ruvi);
}

export function piecesBBox(pieces: TemplatePiece[]): BBox {
  return unionBBox(pieces.map((p) => p.bbox));
}

export { helmetScale };
