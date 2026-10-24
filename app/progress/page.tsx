import type { Metadata } from "next";
import { ProgressBoard } from "@/components/ui/ProgressBoard";

export const metadata: Metadata = { title: "Progress", description: "Shared checklist board for both builds: schedule, build steps and shopping lists." };

export default function ProgressPage() {
  return <ProgressBoard />;
}
