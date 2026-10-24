export type ViewKind = "helmet" | "knife" | "mask" | "fit" | "dress" | "cap" | "pipe";

export const VIEW_LABELS: Record<ViewKind, string> = {
  helmet: "Helmet",
  knife: "Great Knife",
  mask: "Mask stages",
  fit: "Fit check",
  dress: "Dress",
  cap: "Cap",
  pipe: "Lead pipe",
};

export type Preset = "front" | "side" | "back" | "top" | "threeQuarter";
