import type { Metadata } from "next";
import { PrintSheets } from "@/components/ui/PrintSheets";

export const metadata: Metadata = {
  title: "RUVI — 1:1 print templates",
  description: "Print-ready A4 templates at true 1:1 scale with overlaps, crop marks, page labels and a calibration square.",
};

export default function RuviPrintPage() {
  return <PrintSheets character="ruvi" />;
}
