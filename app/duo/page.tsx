import type { Metadata } from "next";
import { DuoMode } from "@/components/ui/DuoMode";

export const metadata: Metadata = { title: "Duo mode", description: "Uvi's and Ruvi's 3D builds side by side with linked cameras." };

export default function DuoPage() {
  return <DuoMode />;
}
