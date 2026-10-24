export interface ScheduleDay {
  id: string;
  /** ISO date (Asia/Colombo calendar day). */
  date: string;
  label: string;
  uvi: string[];
  ruvi: string[];
}

export const schedule: ScheduleDay[] = [
  {
    id: "d24",
    date: "2026-10-24",
    label: "Sat 24 Oct",
    uvi: ["Collect boxes", "Buy materials", "Draw templates"],
    ruvi: ["Take measurements", "Buy materials"],
  },
  {
    id: "d25",
    date: "2026-10-25",
    label: "Sun 25 Oct",
    uvi: ["Cut and laminate helmet and knife"],
    ruvi: ["Shell on the balloon", "Cut the dress"],
  },
  {
    id: "d26",
    date: "2026-10-26",
    label: "Mon 26 Oct",
    uvi: ["Windows", "Assemble", "Formers", "Hard hat", "Try-on"],
    ruvi: ["Split shell", "Fitting", "Openings", "Sew dress"],
  },
  {
    id: "d27",
    date: "2026-10-27",
    label: "Tue 27 Oct",
    uvi: ["Reinforce", "Mesh", "Vents", "Padding", "Papier-mâché 1", "Skirt"],
    ruvi: ["Lumps", "Cap", "Pipe"],
  },
  {
    id: "d28",
    date: "2026-10-28",
    label: "Wed 28 Oct",
    uvi: ["Papier-mâché 2", "Edge strips", "Rivets", "Stain skirt"],
    ruvi: ["Tissue skin", "Window covers", "Tea-dye"],
  },
  {
    id: "d29",
    date: "2026-10-29",
    label: "Thu 29 Oct",
    uvi: ["Base coats", "Rust layers"],
    ruvi: ["Gauze", "Velcro", "Padding", "Paint pipe"],
  },
  {
    id: "d30",
    date: "2026-10-30",
    label: "Fri 30 Oct",
    uvi: ["Seal", "Full rehearsal"],
    ruvi: ["Paint mask", "Glue cap", "Distress dress", "Rehearsal"],
  },
  {
    id: "d31",
    date: "2026-10-31",
    label: "Sat 31 Oct",
    uvi: ["Touch-ups", "Repair kit", "Go"],
    ruvi: ["Touch-ups", "Fake blood last", "Go"],
  },
];

export function scheduleTaskId(day: ScheduleDay, who: "uvi" | "ruvi", i: number) {
  return `sched:${who}:${day.id}:${i}`;
}
