import type { Metadata } from "next";
import { CharacterHub } from "@/components/ui/CharacterHub";

export const metadata: Metadata = {
  title: "RUVI — swollen nurse build",
  description: "Bandage-headed nurse build guide: plaster mask, nurse dress pattern, cap, lead pipe, weathering, safety and schedule.",
};

export default function RuviPage() {
  return <CharacterHub character="ruvi" />;
}
