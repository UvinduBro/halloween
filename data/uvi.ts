import type {
  AssemblyStep,
  CharacterMeta,
  InfoSection,
  MeasureField,
  ShopItem,
  SourceLink,
  StepGroup,
  TimerPreset,
} from "./types";
import type { Vec3 } from "@/lib/geometry";

/* ------------------------------------------------------------------ */
/* Meta                                                                */
/* ------------------------------------------------------------------ */

export const uviMeta: CharacterMeta = {
  id: "uvi",
  name: "UVI",
  wearer: "Uvi",
  build: "Pyramid-helmet executioner",
  tagline: "The weight you carry",
  overview: [
    "A towering, rust-stained pyramid helmet, a {150} cardboard great knife and a torn, dragging skirt. The helmet sits on a hard hat, so the weight rides on the head and shoulders and not on the neck.",
    "Everything is cardboard, PVA, papier-mâché and paint. No special tools. Expect about a week of evenings; the schedule below fits the build into the 8 days before Halloween.",
    "The tip ends up about {$tipHeight|0} off the ground. Doors, ceiling fans and stairs are now your enemies.",
  ],
  accent: "#8B4A23",
};

/* ------------------------------------------------------------------ */
/* Measurements (fit lab)                                              */
/* ------------------------------------------------------------------ */

export interface UviMeasurements {
  shoulderWidth: number;
  shoulderHeight: number;
  waist: number;
  waistToFloor: number;
  hatToShoulder: number;
}

export const uviDefaults: UviMeasurements = {
  shoulderWidth: 44,
  shoulderHeight: 147,
  waist: 80,
  waistToFloor: 105,
  hatToShoulder: 32,
};

export const uviMeasureFields: MeasureField<keyof UviMeasurements>[] = [
  {
    key: "shoulderWidth",
    label: "Shoulder width",
    min: 34,
    max: 60,
    step: 0.5,
    figure: "shoulder-width",
    how: "Across the back, from the bony point of one shoulder to the other. This scales the whole helmet.",
  },
  {
    key: "shoulderHeight",
    label: "Shoulder height",
    min: 120,
    max: 180,
    step: 0.5,
    figure: "shoulder-height",
    how: "Floor to the top of the shoulder, standing in the boots you will wear.",
  },
  {
    key: "waist",
    label: "Waist",
    min: 55,
    max: 140,
    step: 0.5,
    figure: "waist",
    how: "Around the waist where the skirt's drawstring will sit, over a T-shirt.",
  },
  {
    key: "waistToFloor",
    label: "Waist to floor",
    min: 70,
    max: 130,
    step: 0.5,
    figure: "waist-floor",
    how: "From the drawstring line straight down to the floor, in boots.",
  },
  {
    key: "hatToShoulder",
    label: "Hard hat top to shoulder",
    min: 24,
    max: 40,
    step: 0.5,
    figure: "hat-shoulder",
    how: "Wearing the hard hat, from its top straight down to the top of the shoulder. Usually about {32}.",
  },
];

/* ------------------------------------------------------------------ */
/* 5.1 Helmet geometry (cm; x right, y forward, z up; z = 0 = shoulder top) */
/* ------------------------------------------------------------------ */

export type HelmetVertex = "T" | "FL" | "FR" | "ML" | "MR" | "K";

export const helmetVertices: Record<HelmetVertex, Vec3> = {
  T: [0, -2, 66],
  FL: [-11, 30, -22],
  FR: [11, 30, -22],
  ML: [-26, -4, 4],
  MR: [26, -4, 4],
  K: [0, -20, 2],
};

export type HelmetFaceId = "centre" | "sideL" | "sideR" | "backL" | "backR";

export interface HelmetFace {
  id: HelmetFaceId;
  name: string;
  verts: [HelmetVertex, HelmetVertex, HelmetVertex];
  /** Order used to unfold the flat template: bottom edge first, tip last. */
  templateOrder: [HelmetVertex, HelmetVertex, HelmetVertex];
}

export const helmetFaces: HelmetFace[] = [
  { id: "centre", name: "Centre front", verts: ["T", "FL", "FR"], templateOrder: ["FL", "FR", "T"] },
  { id: "sideL", name: "Side panel (left)", verts: ["T", "ML", "FL"], templateOrder: ["FL", "ML", "T"] },
  { id: "sideR", name: "Side panel (right)", verts: ["T", "FR", "MR"], templateOrder: ["FR", "MR", "T"] },
  { id: "backL", name: "Back panel (left)", verts: ["T", "K", "ML"], templateOrder: ["K", "ML", "T"] },
  { id: "backR", name: "Back panel (right)", verts: ["T", "MR", "K"], templateOrder: ["K", "MR", "T"] },
];

export const helmetSpec = {
  /** The reference shoulder width the vertices were drawn for. */
  baseShoulderWidth: 44,
  overall: { height: 88, aboveShoulders: 66, downChest: 22, width: 52, depth: 50 },
  centreLean: 20,
  ridgeLean: 16,
  dihedrals: { centreSide: 130, sideBack: 89, backBack: 120 },
  panelThickness: 0.6,
  clearance: "2.5–3",
  head: { centre: [0, 1, 15] as Vec3, semi: [8, 10.5, 13] as Vec3 },
  formers: [
    { id: "crown", name: "Crown former", z: 32, note: "8 cm air hole. Hard hat glues underneath.", hole: 8 },
    { id: "top", name: "Top former", z: 50, note: "Stops the panels bowing.", hole: 0 },
  ],
  formerInset: 1,
  window: { zFrom: 10, zTo: 24, inset: 2 },
  seamStripWidth: 5,
  bottomStripWidth: 4,
  vents: { count: "6–8", diameter: 1.5 },
  /** Published edge lengths (cm) the geometry must reproduce. */
  edgeChecks: [
    { a: "T", b: "FL", len: 94.3 },
    { a: "FL", b: "FR", len: 22.0 },
    { a: "T", b: "ML", len: 67.3 },
    { a: "ML", b: "FL", len: 45.4 },
    { a: "T", b: "K", len: 66.5 },
    { a: "K", b: "ML", len: 30.6 },
  ] as { a: HelmetVertex; b: HelmetVertex; len: number }[],
};

/* ------------------------------------------------------------------ */
/* 5.2 Cut list                                                        */
/* ------------------------------------------------------------------ */

export interface CutRow {
  piece: string;
  qty: string;
  edges: string;
  notes: string;
}

/** Cut list with derived numbers as tokens so it follows the fit lab. */
export const helmetCutList: CutRow[] = [
  {
    piece: "Centre front",
    qty: "1 (×2 layers)",
    edges: "{$FLFR} bottom, {$TFL} each side",
    notes:
      "Angles 83° bottom, 13° tip. Window starts {$winStart} up, {$winHeight} tall, {$winBottomW} → {$winTopW} wide.",
  },
  {
    piece: "Side panel",
    qty: "2 mirrored (×2 layers)",
    edges: "{$MLFL} bottom, {$TML} back, {$TFL} front",
    notes:
      "Angles 41° front, 112° shoulder, 26° tip. Tip mark: extend the bottom line to {$sideTipX}, then go {$sideTipY} straight up.",
  },
  {
    piece: "Back panel",
    qty: "2 mirrored (×2 layers)",
    edges: "{$KML} bottom, {$TML} outer, {$TK} ridge",
    notes:
      "Angles 78° ridge, 75° shoulder, 26° tip. Tip mark {$backTipX} along, {$backTipY} up. 6–8 vent holes of {1.5} near the top.",
  },
  {
    piece: "Crown former",
    qty: "1 (×2 layers)",
    edges:
      "Pentagon: front edge {$crownFront}, side corners {$crownSpan} apart and {$crownSideBack} behind the front edge, back point {$crownDepth} behind it",
    notes: "{8} air hole. Hard hat glues underneath.",
  },
  {
    piece: "Top former",
    qty: "1 (×2 layers)",
    edges:
      "Pentagon: front edge {$topFront}, side corners {$topSpan} apart and {$topSideBack} behind, back point {$topDepth} behind",
    notes: "Stops the panels bowing.",
  },
  {
    piece: "Seam strips",
    qty: "~12",
    edges: "{5} wide, cut to seam length",
    notes: "Inside reinforcement. Split long seams into strips of up to {50} so they follow the angle.",
  },
];

export const helmetCutNotes = [
  "Cut every piece twice and laminate the two layers with PVA, corrugation crossed.",
  "Formers: cut {1} smaller all round, with the short edge facing the front.",
  "Templates are generated by unfolding each 3D face: the bottom edge sits on the x axis and the tip goes above it. Former glue lines are drawn where z = {32} and z = {50} cross each face.",
];

/* ------------------------------------------------------------------ */
/* 5.3 Helmet build steps                                              */
/* ------------------------------------------------------------------ */

export const helmetSteps: StepGroup = {
  id: "helmet",
  title: "Pyramid helmet",
  kicker: "The weight you carry",
  intro: "Five flat panels, two formers and a hard hat. Work slowly; every angle is measured for you.",
  steps: [
    {
      id: "h1",
      title: "Measure the hat",
      text: "Wear the hard hat and measure from its top down to your shoulder. Expect about {$hatToShoulder}. Enter it in the Measure tab.",
      view: "helmet",
      assembly: 0,
    },
    {
      id: "h2",
      title: "Strip the hard hat",
      text: "Saw off the hard hat's front peak, or use only its inner harness.",
      tip: "Sand the cut edge so it doesn't snag the padding.",
      view: "helmet",
      assembly: 0,
    },
    {
      id: "h3",
      title: "Optional paper model",
      text: "Print the templates at 25% and make a 1:4 paper model. It shows how the panels meet before you commit cardboard.",
      view: "helmet",
      assembly: 4,
    },
    {
      id: "h4",
      title: "Draw full-size templates",
      text: "Print the templates at 100% (check the {10} calibration square) or draw them from the cut list with a steel ruler.",
      view: "helmet",
      assembly: 1,
    },
    {
      id: "h5",
      title: "Cut and laminate",
      text: "Cut every piece twice and laminate with PVA, corrugation crossed. Press overnight under boxes or books.",
      timer: "pva-press",
      view: "helmet",
      assembly: 1,
    },
    {
      id: "h6",
      title: "Vision window",
      text: "Cut the vision window in the centre front: {$winStart} up from the bottom edge, {$winHeight} tall, {$winBottomW} wide at the bottom narrowing to {$winTopW}. Optional: {4} × {6} peripheral windows in the side panels.",
      view: "helmet",
      assembly: 1,
    },
    {
      id: "h7",
      title: "Sides to centre",
      text: "Tape the side panels to the centre front at about 130°.",
      view: "helmet",
      assembly: 2,
    },
    {
      id: "h8",
      title: "Backs together",
      text: "Tape the back panels together along the ridge at about 120°.",
      view: "helmet",
      assembly: 3,
    },
    {
      id: "h9",
      title: "Close the shell",
      text: "Join the sides to the backs. Check the 20° lean of the centre face and the V-shaped base, then hot glue every seam inside.",
      tip: "Use the Side camera in the 3D tab to compare the lean.",
      view: "helmet",
      assembly: 4,
    },
    {
      id: "h10",
      title: "Formers",
      text: "Glue in the crown former and the top former along the glue lines (z = {32} and z = {50}).",
      view: "helmet",
      assembly: 5,
    },
    {
      id: "h11",
      title: "Reinforce",
      text: "Glue {5} strips inside every seam, plus a {4} strip round the bottom edges.",
      view: "helmet",
      assembly: 6,
    },
    {
      id: "h12",
      title: "Mount the hard hat",
      text: "Mount the hard hat under the crown former, centred, with your forehead about {4} behind the centre face. Add zip ties or bolts.",
      view: "helmet",
      assembly: 7,
    },
    {
      id: "h13",
      title: "Mesh, paint inside, vents",
      text: "Add black mesh over the windows, paint the inside black, add vent holes and an optional USB fan.",
      view: "helmet",
      assembly: 8,
    },
    {
      id: "h14",
      title: "Padding",
      text: "Foam padding on the hat band and along the V-shaped bottom edges, where they meet chest and shoulders.",
      view: "helmet",
      assembly: 8,
    },
    {
      id: "h15",
      title: "Papier-mâché",
      text: "Two layers of papier-mâché (PVA 1:1 with water). Dry 12–24 h between layers.",
      timer: "pm-12",
      view: "helmet",
      assembly: 8,
    },
    {
      id: "h16",
      title: "Edges and rivets",
      text: "Edge strips of {2–3} along the bottom edges and the centre-face edges. Rivets from hot-glue dots or paper fasteners.",
      view: "helmet",
      assembly: 8,
    },
  ],
};

export const helmetAssembly: AssemblyStep[] = [
  { title: "Hard hat and head", text: "The hard hat is the foundation. Everything hangs from it.", pieces: ["hardhat"] },
  { title: "Centre front", text: "Laminated centre front with the vision window cut.", pieces: ["centre"] },
  { title: "Side panels", text: "Tape the sides to the centre front at about 130°.", pieces: ["sideL", "sideR"] },
  { title: "Back panels", text: "Tape the backs together along the ridge at about 120°.", pieces: ["backL", "backR"] },
  { title: "Close the shell", text: "Join sides to backs; check the 20° lean, hot glue inside.", pieces: [] },
  { title: "Formers", text: "Crown former at z = 32, top former at z = 50.", pieces: ["crown", "top"] },
  { title: "Seam strips", text: "5 cm strips inside every seam, 4 cm round the bottom edges.", pieces: ["strips"] },
  { title: "Mount the hat", text: "Hard hat under the crown former, forehead ~4 cm behind the centre face.", pieces: [] },
  { title: "Mesh and finish", text: "Black mesh over the window, papier-mâché, edges and rivets.", pieces: ["mesh"] },
];

/* ------------------------------------------------------------------ */
/* 5.4 Paint                                                           */
/* ------------------------------------------------------------------ */

export const paintSteps: StepGroup = {
  id: "paint",
  title: "Rust and ruin",
  kicker: "It has always been here",
  intro: "Same recipe for the helmet and the knife. Let each layer dry before the next.",
  steps: [
    { id: "p1", title: "Black base", text: "Black base, two coats.", timer: "paint-1h", view: "helmet", assembly: 8 },
    { id: "p2", title: "Rust", text: "Sponge on burnt sienna or rust, in uneven patches.", view: "helmet", assembly: 8 },
    { id: "p3", title: "Orange heart", text: "Dab orange into the centres of the rust patches.", view: "helmet", assembly: 8 },
    {
      id: "p4",
      title: "Dark wash",
      text: "Dark wash (paint 1:3 with water) into the seams, wiping it off the flat areas.",
      view: "helmet",
      assembly: 8,
    },
    { id: "p5", title: "Silver edges", text: "Silver dry-brush on edges and rivets.", view: "helmet", assembly: 8 },
    {
      id: "p6",
      title: "Seal",
      text: "Matte clear sealer. It also fights humidity, which matters in Colombo.",
      timer: "seal-2h",
      view: "helmet",
      assembly: 8,
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 5.5 Great Knife                                                     */
/* ------------------------------------------------------------------ */

export const knifeSpec = {
  overall: 150,
  blade: 120,
  grip: 30,
  /** Blade outline, cm. Spine on y = 0, handle end at x = 0. */
  polygon: [
    [0, 0],
    [100, 0],
    [120, -30],
    [0, -20],
  ] as [number, number][],
  layers: 3,
  layerThickness: 0.6,
  slot: { w: 3, l: 15 },
  pipe: { diameterMm: 25, length: 45, inside: 15 },
  bevel: 3,
};

export const knifeSteps: StepGroup = {
  id: "knife",
  title: "Great Knife",
  kicker: "Drag it behind you",
  intro: "{150} overall: a {120} blade and a {30} exposed grip.",
  steps: [
    {
      id: "k1",
      title: "Cut three layers",
      text: "Cut three blade layers from the template: spine {100} straight, {20} wide at the handle and {30} at the angled tip.",
      view: "knife",
      assembly: 0,
    },
    {
      id: "k2",
      title: "Slot the middle layer",
      text: "Cut a {3} × {15} slot in the middle layer at the handle end, centred on the blade's width.",
      view: "knife",
      assembly: 1,
    },
    {
      id: "k3",
      title: "Pipe and laminate",
      text: "Push {45} of {mm:25} PVC pipe into the slot so {15} sits inside the blade. Glue all three layers with PVA and press flat overnight.",
      timer: "pva-press",
      view: "knife",
      assembly: 2,
    },
    {
      id: "k4",
      title: "Bevel",
      text: "Sand a {3} bevel along the cutting edge.",
      view: "knife",
      assembly: 3,
    },
    {
      id: "k5",
      title: "Papier-mâché and grip",
      text: "Two layers of papier-mâché. Wrap the grip in fabric strips.",
      timer: "pm-12",
      view: "knife",
      assembly: 4,
    },
    {
      id: "k6",
      title: "Drag pad and paint",
      text: "Glue a felt drag pad under the tip corner. Paint as in the Paint tab.",
      view: "knife",
      assembly: 4,
    },
  ],
};

export const knifeAssembly: AssemblyStep[] = [
  { title: "Outer layer", text: "First outer blade layer.", pieces: ["layer1"] },
  { title: "Middle layer", text: "Middle layer with the 3 × 15 cm pipe slot.", pieces: ["layer2"] },
  { title: "Pipe", text: "45 cm of 25 mm PVC, 15 cm inside the blade.", pieces: ["pipe"] },
  { title: "Close it", text: "Third layer glued on; sand a 3 cm bevel.", pieces: ["layer3"] },
  { title: "Grip and pad", text: "Fabric-wrapped grip and felt drag pad.", pieces: ["grip", "pad"] },
];

/* ------------------------------------------------------------------ */
/* 5.6 Skirt, body, materials                                          */
/* ------------------------------------------------------------------ */

export const skirtSpec = { widthFactor: 2.5, drag: 5, casing: 4, casingAllowance: 5 };

export const skirtSteps: StepGroup = {
  id: "skirt",
  title: "Butcher's skirt",
  kicker: "Stained to the floor",
  intro: "Width {$skirtWidth|0} (2.5 × waist), length {$skirtLength|0} (waist to floor + {5} drag + {5} casing).",
  steps: [
    {
      id: "s1",
      title: "Cut",
      text: "Cut calico {$skirtWidth|0} wide × {$skirtLength|0} long.",
    },
    {
      id: "s2",
      title: "Casing",
      text: "Fold and sew a {4} drawstring casing along the top edge.",
    },
    {
      id: "s3",
      title: "Tea and coffee dye",
      text: "Soak in strong tea or coffee until it is a dirty beige. Dry in patches, not flat, so it stains unevenly.",
      timer: "dye-1h",
    },
    { id: "s4", title: "Rust stains", text: "Dab watered rust-brown paint where hands and the knife would rest." },
    { id: "s5", title: "Rip the hem", text: "Rip the hem in strips {5–15} deep. Fray the ends." },
    { id: "s6", title: "Rope belt", text: "Thread the rope through the casing and tie it with a rope belt." },
  ],
};

export const uviBody: InfoSection[] = [
  {
    id: "body",
    title: "Skin and boots",
    kicker: "Nothing living",
    items: [
      "Patchy grey-beige skin base on arms and chest. Sponge, don't brush.",
      "Brown and black grime in the creases of the elbows and knuckles.",
      "Eyeliner or liquid-latex scars. Patch-test latex 24 h before.",
      "Dark boots or sandals.",
      "Alternative: a skin-tone compression top, grimed with the same paints.",
    ],
  },
  {
    id: "movement",
    title: "Movement",
    kicker: "Slow is heavier",
    items: [
      "Walk slowly with long, deliberate steps; let the knife drag.",
      "Turn the whole body, not the head. The helmet sells the weight.",
      "Stand still for long beats. Stillness is the scariest thing he does.",
    ],
  },
];

export const uviSafety: string[] = [
  "Bring a handler.",
  "Duck under doors and ceiling fans. The tip is about {$tipHeight|0} up.",
  "Take stairs slowly.",
  "Heat breaks every 30–45 minutes.",
  "Check the venue's prop rules.",
  "Pack a repair kit: glue, tape, zip ties, paint.",
];

export const uviShopping: ShopItem[] = [
  { id: "u-boxes", group: "Helmet & knife", text: "4–5 big appliance boxes (about {m2:3})" },
  { id: "u-hardhat", group: "Helmet & knife", text: "Hard hat with ratchet" },
  { id: "u-glue", group: "Helmet & knife", text: "Hot glue gun + 40–50 sticks" },
  { id: "u-pva", group: "Helmet & knife", text: "{ml:500} PVA" },
  { id: "u-tape", group: "Helmet & knife", text: "3 rolls of masking tape" },
  { id: "u-paper", group: "Helmet & knife", text: "Newspaper" },
  { id: "u-cutter", group: "Helmet & knife", text: "Box cutter and {m:1} steel ruler" },
  { id: "u-mesh", group: "Helmet & knife", text: "{30} × {30} black mesh" },
  { id: "u-foam", group: "Helmet & knife", text: "Foam (padding)" },
  {
    id: "u-paints",
    group: "Paint",
    text: "Acrylic paints: black, burnt sienna, orange, dark red-brown, silver",
  },
  { id: "u-spray", group: "Paint", text: "Matte spray sealer" },
  { id: "u-pvc", group: "Helmet & knife", text: "{45} of {mm:25} PVC pipe + caps" },
  { id: "u-calico", group: "Skirt & body", text: "About {3} × {1.2} m calico ({$skirtWidth|0} × {$skirtLength|0} needed)" },
  { id: "u-tea", group: "Skirt & body", text: "Tea / coffee for dyeing" },
  { id: "u-rope", group: "Skirt & body", text: "{m:2.5} rope" },
  { id: "u-makeup", group: "Skirt & body", text: "Makeup (grey-beige base, brown/black grime)" },
  { id: "u-boots", group: "Skirt & body", text: "Dark boots" },
  { id: "u-felt", group: "Helmet & knife", text: "Felt scrap for the knife's drag pad" },
];

/* ------------------------------------------------------------------ */
/* Timers, sources                                                     */
/* ------------------------------------------------------------------ */

export const uviTimers: TimerPreset[] = [
  { id: "pva-press", label: "PVA lamination press (overnight)", minutes: 8 * 60 },
  { id: "pm-12", label: "Papier-mâché layer (12 h minimum)", minutes: 12 * 60 },
  { id: "pm-24", label: "Papier-mâché layer (24 h, humid day)", minutes: 24 * 60 },
  { id: "paint-1h", label: "Paint coat", minutes: 60 },
  { id: "seal-2h", label: "Sealer coat", minutes: 120 },
  { id: "dye-1h", label: "Tea / coffee dye soak", minutes: 60 },
];

export const uviSources: SourceLink[] = [
  {
    url: "https://www.deviantart.com/dark-felix/journal/Complete-Pyramid-Head-Helmet-Tutorial-242201625",
    title: "Complete Pyramid Head Helmet Tutorial (dark-felix)",
    note: "Classic cardboard helmet walkthrough with panel angles.",
  },
  {
    url: "https://cosplayideas.net/pyramid-head-cosplay/",
    title: "Pyramid Head cosplay (cosplayideas.net)",
    note: "Costume overview and materials ideas.",
  },
  {
    url: "https://igorkromin.net/index.php/2012/10/27/making-a-pyramid-head-costume/",
    title: "Making a Pyramid Head costume (Igor Kromin)",
    note: "Build log with the hard-hat mount approach.",
  },
  {
    url: "https://carboncostume.com/make-your-own-pyramid-head/",
    title: "Make your own Pyramid Head (Carbon Costume)",
    note: "Shopping list and outfit breakdown.",
  },
];

export const uviSteps: StepGroup[] = [helmetSteps, knifeSteps, skirtSteps];

/** Key numbers shown live in the fit lab (tokens resolve from lib/uvi.ts → uviVars). */
export const uviLiveNumbers: { label: string; text: string }[] = [
  { label: "Scale factor", text: "× {n:$k}" },
  { label: "Helmet", text: "{$helmetHeight} tall · {$helmetWidth} wide · {$helmetDepth} deep" },
  { label: "Tip off the ground", text: "{$tipHeight|0}" },
  { label: "Head clearance", text: "{$clearance} (inside the laminated wall)" },
  { label: "Centre front", text: "{$FLFR} bottom, {$TFL} sides" },
  { label: "Side panel", text: "{$MLFL} bottom, {$TML} back, {$TFL} front" },
  { label: "Back panel", text: "{$KML} bottom, {$TML} outer, {$TK} ridge" },
  { label: "Vision window", text: "{$winStart} up, {$winHeight} tall, {$winBottomW} → {$winTopW}" },
  { label: "Skirt", text: "{$skirtWidth|0} wide × {$skirtLength|0} long" },
];
