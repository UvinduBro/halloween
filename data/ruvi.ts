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

/* ------------------------------------------------------------------ */
/* Meta                                                                */
/* ------------------------------------------------------------------ */

export const ruviMeta: CharacterMeta = {
  id: "ruvi",
  name: "RUVI",
  wearer: "Ruvi",
  build: "Swollen, bandage-headed nurse",
  tagline: "Do not look away",
  overview: [
    "A swollen plaster head wrapped in gauze, a stained kimono-sleeve nurse dress, a stiff cap and a lead pipe held low.",
    "The mask is moulded on a balloon, never on a face. Every number below follows Ruvi's measurements in the Measure tab: change one and the mask, the pattern and the templates all follow.",
    "The balloon is inflated to {$balloonCirc|0} round; the finished shell is {$shellW} wide, {$shellH} tall and {$shellD} deep.",
  ],
  accent: "#9FA87A",
};

/* ------------------------------------------------------------------ */
/* 6.1 Measurements                                                    */
/* ------------------------------------------------------------------ */

export interface RuviMeasurements {
  headCirc: number;
  headLength: number;
  headWidth: number;
  chinToCrown: number;
  chinToEyes: number;
  neck: number;
  shoulders: number;
  bust: number;
  waist: number;
  hips: number;
  dressLength: number;
  upperArm: number;
}

export const ruviDefaults: RuviMeasurements = {
  headCirc: 56,
  headLength: 20,
  headWidth: 15,
  chinToCrown: 22,
  chinToEyes: 12,
  neck: 34,
  shoulders: 38,
  bust: 86,
  waist: 70,
  hips: 94,
  dressLength: 85,
  upperArm: 30,
};

export const ruviMeasureFields: MeasureField<keyof RuviMeasurements>[] = [
  {
    key: "headCirc",
    label: "Head circumference",
    min: 50,
    max: 64,
    step: 0.5,
    figure: "head-circ",
    how: "Tape level around the forehead, just above the eyebrows and ears, over the fullest part of the back of the head.",
  },
  {
    key: "headLength",
    label: "Head length",
    min: 16,
    max: 24,
    step: 0.5,
    figure: "head-length",
    how: "Side view: from the forehead to the furthest point at the back of the head. Use two books and measure between them.",
  },
  {
    key: "headWidth",
    label: "Head width",
    min: 12,
    max: 19,
    step: 0.5,
    figure: "head-width",
    how: "Front view: the widest point above the ears, between two books held flat against the sides.",
  },
  {
    key: "chinToCrown",
    label: "Chin to crown",
    min: 18,
    max: 27,
    step: 0.5,
    figure: "chin-crown",
    how: "Stand against a wall. Book flat on top of the head; measure from the underside of the chin up to it.",
  },
  {
    key: "chinToEyes",
    label: "Chin to eyes",
    min: 9,
    max: 15,
    step: 0.5,
    figure: "chin-eyes",
    how: "From the underside of the chin straight up to the pupils, looking ahead. This places the eye windows.",
  },
  {
    key: "neck",
    label: "Neck",
    min: 28,
    max: 44,
    step: 0.5,
    figure: "neck",
    how: "Around the base of the neck, one finger under the tape.",
  },
  {
    key: "shoulders",
    label: "Shoulders",
    min: 32,
    max: 48,
    step: 0.5,
    figure: "shoulder-width",
    how: "Across the back from shoulder point to shoulder point.",
  },
  {
    key: "bust",
    label: "Bust",
    min: 70,
    max: 130,
    step: 0.5,
    figure: "bust",
    how: "Around the fullest part of the chest, tape level across the back.",
  },
  {
    key: "waist",
    label: "Waist",
    min: 55,
    max: 120,
    step: 0.5,
    figure: "waist",
    how: "Around the natural waist, the narrowest part of the torso.",
  },
  {
    key: "hips",
    label: "Hips",
    min: 75,
    max: 140,
    step: 0.5,
    figure: "hips",
    how: "Around the fullest part of the hips and seat, feet together.",
  },
  {
    key: "dressLength",
    label: "Dress length",
    min: 70,
    max: 115,
    step: 0.5,
    figure: "dress-length",
    how: "From the top of the shoulder, next to the neck, down to mid-thigh.",
  },
  {
    key: "upperArm",
    label: "Upper arm",
    min: 22,
    max: 44,
    step: 0.5,
    figure: "upper-arm",
    how: "Around the fullest part of the upper arm, relaxed.",
  },
];

/* ------------------------------------------------------------------ */
/* 6.2 Mask                                                            */
/* ------------------------------------------------------------------ */

export const maskSpec = {
  baseHeadCirc: 56,
  balloonExtra: 16,
  /** Shell outer size for a 56 cm head; scale by head circ ÷ 56. */
  shell: { w: 23, h: 27, d: 25 },
  bottomBelowChin: 3,
  velcroTab: 4,
  eye: { w: 4, h: 2.5, centreUp: 14.5, spacing: 6.2 },
  vent: { w: 4, from: 4.5, to: 10.5 },
  /** Reference chin-to-eyes and head width the opening numbers were set for. */
  ref: { chinToEyes: 12, headWidth: 15 },
  lumps: [
    // dir: unit-ish direction from shell centre (x right, y forward, z up); size across, height
    { id: "forehead-left", name: "Forehead, left", dir: [-0.35, 0.75, 0.55], size: 8, height: 2.5 },
    { id: "temple-right", name: "Right temple", dir: [0.85, 0.3, 0.35], size: 6, height: 2 },
    { id: "jaw-left", name: "Left jaw", dir: [-0.8, 0.35, -0.45], size: 5, height: 1.5 },
    { id: "cheek-right", name: "Right cheek", dir: [0.7, 0.62, -0.25], size: 4.5, height: 1.2 },
    { id: "back", name: "Back of head", dir: [0.15, -0.95, 0.2], size: 10, height: 3 },
    { id: "top", name: "Top", dir: [-0.1, 0.05, 1], size: 7, height: 2.2 },
  ] as { id: string; name: string; dir: [number, number, number]; size: number; height: number }[],
  lumpRange: { size: "4–10", height: "1–3" },
  wallLayers: [
    "Her head",
    "Foam pad {1–1.5}",
    "Gap of about {1}",
    "Shell (plaster or papier-mâché)",
    "Lump + tissue skin",
    "Gauze",
  ],
};

export const maskSteps: StepGroup = {
  id: "mask",
  title: "The swollen head",
  kicker: "Do not look away",
  intro:
    "Shell {$shellW} wide × {$shellH} tall × {$shellD} deep for a {$headCirc|0} head. Made from 4–5 layers of plaster bandage, or 6 layers of papier-mâché, over a balloon.",
  steps: [
    {
      id: "m1",
      title: "Size the balloon",
      text: "Inflate until the circumference reads {$balloonCirc|0} (head circumference + {16}).",
      view: "mask",
      assembly: 0,
    },
    {
      id: "m2",
      title: "Mark the lines",
      text: "Mark the bottom edge ({3} below the chin at the front, rising to the nape at the back), the centre line, the eye windows and the vent.",
      view: "mask",
      assembly: 0,
    },
    {
      id: "m3",
      title: "Lay the shell",
      text: "Smear petroleum jelly on the balloon, then lay 4–5 layers of plaster bandage (or 6 of papier-mâché).",
      timer: "plaster-set",
      view: "mask",
      assembly: 1,
    },
    {
      id: "m4",
      title: "Pop and split",
      text: "Pop the balloon. Cut the shell into front and back halves along a line over the crown, just behind the ears.",
      view: "mask",
      assembly: 1,
    },
    {
      id: "m5",
      title: "First fitting",
      text: "Hold both halves on. There should be about {2–3} of space round the head for padding. The back overlaps the front.",
      view: "fit",
      assembly: 1,
    },
    {
      id: "m6",
      title: "Cut the openings",
      text: "Two eye windows {4} × {2.5}, centred {$eyeUp} up from the front bottom edge and {$eyeSpacing} apart. One nose-and-mouth vent {4} × {6}, from {$ventFrom} to {$ventTo} up.",
      tip: "Mark them with her head inside, then cut small and widen.",
      view: "mask",
      assembly: 1,
    },
    {
      id: "m7",
      title: "Lumps",
      text: "Add lumps {4–10} across and {1–3} high: forehead-left, right temple, left jaw, right cheek, back of head, top. Off-centre and asymmetric, clear of the openings. Papier-mâché over them.",
      timer: "pm-12",
      view: "mask",
      assembly: 2,
    },
    {
      id: "m8",
      title: "Tissue skin",
      text: "Tissue paper brushed on with PVA, wrinkled on purpose. It turns the lumps into skin.",
      timer: "pm-12",
      view: "mask",
      assembly: 3,
    },
    {
      id: "m9",
      title: "Chiffon windows",
      text: "Glue sheer chiffon over the eye windows and the vent, from the inside. Chiffon only over the vent.",
      view: "mask",
      assembly: 3,
    },
    {
      id: "m10",
      title: "Gauze bands",
      text: "Wrap gauze bands at uneven angles, tucking the ends inside. Keep them off the windows.",
      view: "mask",
      assembly: 3,
    },
    {
      id: "m11",
      title: "Velcro",
      text: "Glue {4} Velcro tabs where the back half overlaps the front.",
      view: "mask",
      assembly: 3,
    },
    {
      id: "m12",
      title: "Foam pads",
      text: "Glue {1–1.5} foam pads inside at the forehead, crown, temples and back, leaving about {1} of air.",
      view: "fit",
      assembly: 3,
    },
    {
      id: "m13",
      title: "Paint, weather, cap",
      text: "Paint and weather (see the Paint tab), then glue on the cap at the top front.",
      view: "mask",
      assembly: 4,
    },
  ],
};

export const maskAssembly: AssemblyStep[] = [
  { title: "Balloon", text: "Balloon with the bottom edge, centre line, eye windows and vent marked.", pieces: ["balloon"] },
  { title: "Plaster shell", text: "Shell split into front and back halves over the crown.", pieces: ["shell"] },
  { title: "Lumps", text: "Asymmetric lumps, clear of the openings.", pieces: ["lumps"] },
  { title: "Skin and gauze", text: "Tissue + PVA skin and gauze bands.", pieces: ["gauze"] },
  { title: "Painted", text: "Off-white, rot tones and seeping red-brown. Cap glued on.", pieces: ["paint", "cap"] },
];

export const maskFallback =
  "Quick fallback: a stretchy hood with stuffed fabric lumps sewn on, then wrapped in gauze. Ready in an evening.";

/* ------------------------------------------------------------------ */
/* 6.3 Dress                                                           */
/* ------------------------------------------------------------------ */

export const dressSpec = {
  levels: { underarm: 28, waist: 42, hips: 62 },
  ease: { bust: 2.5, waist: 3, hips: 2.5, hem: 4 },
  sleeveExtension: 15,
  shoulderSlope: 4,
  sleeveDrop: 3.5,
  backNeck: { w: 7.5, d: 2 },
  frontNeck: { w: 7.5, d: 10 },
  buttonOverlap: 2.5,
  buttons: 7,
  seamAllowance: 1.5,
  hem: 3,
};

export const dressSteps: StepGroup = {
  id: "dress",
  title: "Nurse dress",
  kicker: "Starched, then ruined",
  intro:
    "A kimono-sleeve shift dress: a back cut on the fold plus two mirrored fronts. Seam allowance {1.5}; hem {3}, left raw.",
  steps: [
    {
      id: "d1",
      title: "Print or draft the pattern",
      text: "Half widths: bust {$halfBust}, waist {$halfWaist}, hips {$halfHips}, hem {$halfHem}. Measured down from the shoulder: underarm {28}, waist {42}, hips {62}, hem {$dressLength}.",
      view: "dress",
      assembly: 0,
    },
    {
      id: "d2",
      title: "Cut",
      text: "Cut the back on the fold and two mirrored fronts. The fronts get a {2.5} button overlap and a V-neck {7.5} wide and {10} deep.",
      view: "dress",
      assembly: 1,
    },
    {
      id: "d3",
      title: "Shoulders and sleeves",
      text: "Sew the shoulder and over-arm seams. The sleeve runs {15} past the shoulder point and opens {$sleeveOpening} wide.",
      view: "dress",
      assembly: 1,
    },
    {
      id: "d4",
      title: "Side seams",
      text: "Sew the underarm curve and side seams in one go. Clip the curve.",
      view: "dress",
      assembly: 1,
    },
    {
      id: "d5",
      title: "Buttons",
      text: "7 buttons down the front overlap. Neaten the neckline with a narrow facing or bias tape.",
      view: "dress",
      assembly: 2,
    },
    {
      id: "d6",
      title: "Hem",
      text: "Hem {3}, left raw to fray later.",
      view: "dress",
      assembly: 2,
    },
  ],
};

export const dressAssembly: AssemblyStep[] = [
  { title: "Back", text: "Back cut on the fold.", pieces: ["back"] },
  { title: "Fronts and sleeves", text: "Two mirrored fronts; kimono sleeves.", pieces: ["front", "sleeves"] },
  { title: "Buttons", text: "7 buttons on a 2.5 cm overlap.", pieces: ["buttons"] },
];

export const dressNoSew = "No-sew alternative: alter a bought white shirt dress. Shorten it, crop the sleeves and distress it.";

/* ------------------------------------------------------------------ */
/* 6.4 Cap, 6.5 Props                                                  */
/* ------------------------------------------------------------------ */

export const capSpec = {
  fabric: { w: 36, h: 14, layers: 2 },
  stiffener: { w: 34, h: 9 },
  cuff: 4,
  joinHeight: 6,
  ringCirc: 36,
  frontHeight: 9,
};

export const capSteps: StepGroup = {
  id: "cap",
  title: "Cap",
  kicker: "Pinned in place",
  steps: [
    {
      id: "c1",
      title: "Cut and stiffen",
      text: "Cut two fabric layers {36} × {14} and add interfacing. Slide in a {34} × {9} card stiffener.",
      view: "cap",
    },
    { id: "c2", title: "Cuff", text: "Fold up a {4} cuff.", view: "cap" },
    { id: "c3", title: "Ring", text: "Sew the short ends together {6} up, so the band becomes a ring.", view: "cap" },
    { id: "c4", title: "Pleat", text: "Pinch one pleat at the back.", view: "cap" },
    { id: "c5", title: "Mount", text: "Glue it to the top front of the mask.", view: "mask", assembly: 4 },
  ],
};

export const pipeSpec = {
  length: 60,
  diameterMm: 25,
  elbow: 45,
  stub: 10,
  grip: 12,
};

export const scalpelSpec = { handle: 11, blade: 4, foam: 0.5 };

export const propSteps: StepGroup = {
  id: "props",
  title: "Lead pipe and scalpel",
  kicker: "Held low",
  steps: [
    {
      id: "pr1",
      title: "Pipe",
      text: "{60} of {mm:25} PVC + a 45° elbow + a {10} stub. Glue the joints.",
      view: "pipe",
    },
    { id: "pr2", title: "Grip", text: "Wrap a {12} black cloth-tape grip.", view: "pipe" },
    {
      id: "pr3",
      title: "Paint",
      text: "Paint black, dry-brush grey and silver, and add rust at the elbow.",
      timer: "paint-1h",
      view: "pipe",
    },
    {
      id: "pr4",
      title: "Scalpel (optional)",
      text: "{11} handle + {4} blade, cut from {mm:5} foam or 3 card layers. Keep it blunt.",
      view: "pipe",
    },
  ],
};

/* ------------------------------------------------------------------ */
/* 6.6 Weathering                                                      */
/* ------------------------------------------------------------------ */

export const weatheringSteps: StepGroup = {
  id: "weathering",
  title: "Rot and stain",
  kicker: "Something seeps through",
  steps: [
    {
      id: "w1",
      title: "Tea dye",
      text: "Dress and cap: 8–10 tea bags, 1 h soak. Wring, and dry crumpled for uneven colour.",
      timer: "dye-1h",
    },
    { id: "w2", title: "Spot stains", text: "Press used tea bags on the fabric for darker spot stains." },
    { id: "w3", title: "Grime", text: "Rub bronzer or brown eyeshadow into seams, hem and cuffs." },
    { id: "w4", title: "Hem", text: "Tear and fray the hem." },
    {
      id: "w5",
      title: "Mask base",
      text: "Patchy off-white base. Leave brush marks.",
      timer: "paint-1h",
      view: "mask",
      assembly: 4,
    },
    {
      id: "w6",
      title: "Mask wash",
      text: "Grey-brown wash in the creases, wiped off the high points.",
      view: "mask",
      assembly: 4,
    },
    {
      id: "w7",
      title: "Rot tones",
      text: "Yellow-brown and grey-green rot tones, sponged lightly.",
      view: "mask",
      assembly: 4,
    },
    {
      id: "w8",
      title: "Seeping",
      text: "Dark red-brown seeping through in a few spots, mainly under the gauze.",
      view: "mask",
      assembly: 4,
    },
  ],
};

export const fakeBlood = {
  title: "Fake blood",
  items: [
    "1 cup glucose or golden syrup",
    "1 tbsp red food colouring",
    "A few drops of blue or green (to darken)",
    "1 tsp cocoa",
    "Thin with water to taste.",
  ],
  note: "Use dark red acrylic on anything worn against skin all night. Fake blood goes on last, on the day.",
};

/* ------------------------------------------------------------------ */
/* 6.7 Body, movement, safety, materials                               */
/* ------------------------------------------------------------------ */

export const ruviBody: InfoSection[] = [
  {
    id: "body",
    title: "Skin and legs",
    kicker: "Pale, patched, wrong",
    items: [
      "Pale, patchy skin.",
      "Grey veins and small bruises.",
      "Laddered nude tights.",
      "Beige flats or low block heels. No high heels: you can't see your feet.",
    ],
  },
  {
    id: "movement",
    title: "Movement",
    kicker: "Something is wrong with her",
    items: ["Head tilted.", "Occasional twitches.", "Slow, dragging steps.", "Pipe held low."],
  },
];

export const ruviSafety: string[] = [
  "Never mould anything on a face, and never put a bag over a head.",
  "The vent is chiffon only.",
  "Remove the mask if she's dizzy.",
  "Breaks every 30–45 minutes.",
  "Patch-test makeup and latex 24 h before.",
  "Remove the mask for stairs, roads and vehicles.",
  "Check the venue's prop rules.",
];

export const ruviShopping: ShopItem[] = [
  { id: "r-balloons", group: "Mask", text: "2 balloons (about {90} round)" },
  { id: "r-plaster", group: "Mask", text: "4–5 rolls of plaster bandage" },
  { id: "r-paper", group: "Mask", text: "Newspaper" },
  { id: "r-pva", group: "Mask", text: "{ml:500} PVA" },
  { id: "r-tissue", group: "Mask", text: "Tissue paper" },
  { id: "r-stuffing", group: "Mask", text: "Stuffing (for lumps)" },
  { id: "r-gauze", group: "Mask", text: "6–8 gauze rolls" },
  { id: "r-chiffon", group: "Mask", text: "{30} × {30} chiffon" },
  { id: "r-foam", group: "Mask", text: "Foam" },
  { id: "r-velcro", group: "Mask", text: "{25} Velcro" },
  { id: "r-jelly", group: "Mask", text: "Petroleum jelly" },
  { id: "r-cotton", group: "Dress & cap", text: "{1.5} × {1.5} m white cotton" },
  { id: "r-buttons", group: "Dress & cap", text: "6–7 buttons" },
  { id: "r-card", group: "Dress & cap", text: "Card + interfacing" },
  { id: "r-pipe", group: "Pipe", text: "PVC pipe ({mm:25}) + 45° elbow" },
  { id: "r-tape", group: "Pipe", text: "Black cloth tape" },
  { id: "r-paints", group: "Finishing", text: "Paints (off-white, grey-brown, yellow-brown, grey-green, dark red-brown, black, silver)" },
  { id: "r-tea", group: "Finishing", text: "Tea (8–10 bags)" },
  { id: "r-bronzer", group: "Finishing", text: "Bronzer / brown eyeshadow" },
  { id: "r-blood", group: "Finishing", text: "Fake blood ingredients" },
  { id: "r-tights", group: "Finishing", text: "Nude tights" },
  { id: "r-flats", group: "Finishing", text: "Beige flats" },
];

export const ruviTimers: TimerPreset[] = [
  { id: "plaster-set", label: "Plaster bandage layer set", minutes: 30 },
  { id: "plaster-cure", label: "Plaster shell full cure", minutes: 24 * 60 },
  { id: "pm-12", label: "Papier-mâché / tissue layer (12 h)", minutes: 12 * 60 },
  { id: "paint-1h", label: "Paint coat", minutes: 60 },
  { id: "dye-1h", label: "Tea dye soak", minutes: 60 },
];

export const ruviSources: SourceLink[] = [
  {
    url: "https://constantineintokyo.com/2013/10/15/silent-hill-nurse-tutorial",
    title: "Nurse tutorial (Constantine in Tokyo)",
    note: "Plaster-over-balloon head and paint tips.",
  },
  {
    url: "https://www.therpf.com/forums/threads/silent-hill-nurse-costume.110673",
    title: "Nurse costume thread (The RPF)",
    note: "Forum build thread with fitting notes.",
  },
  {
    url: "https://www.cutoutandkeep.net/projects/silent-hill-nurse-costume-remake",
    title: "Nurse costume remake (Cut Out + Keep)",
    note: "Step-by-step with dress distressing.",
  },
  {
    url: "https://www.instructables.com/Silent-Hill-Nurse/",
    title: "Nurse costume (Instructables)",
    note: "Mask, dress and makeup instructable.",
  },
];

export const ruviSteps: StepGroup[] = [maskSteps, dressSteps, capSteps, propSteps];

/** Key numbers shown live in the fit lab (tokens resolve from lib/ruvi.ts → ruviVars). */
export const ruviLiveNumbers: { label: string; text: string }[] = [
  { label: "Balloon", text: "{$balloonCirc|0} round" },
  { label: "Shell", text: "{$shellW} wide × {$shellH} tall × {$shellD} deep" },
  { label: "Smallest gap round the head", text: "{$minGap}" },
  { label: "Eye windows", text: "{4} × {2.5}, {$eyeUp} up, {$eyeSpacing} apart" },
  { label: "Vent", text: "{4} × {6}, {$ventFrom} to {$ventTo} up" },
  { label: "Half widths", text: "bust {$halfBust} · waist {$halfWaist} · hips {$halfHips} · hem {$halfHem}" },
  { label: "Sleeve", text: "opening {$sleeveOpening}, shoulder point {$shoulderPoint}" },
  { label: "Dress length", text: "{$dressLength}" },
];
