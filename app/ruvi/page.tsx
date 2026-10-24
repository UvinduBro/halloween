import type { Metadata } from "next";
import { CharacterHub } from "@/components/ui/CharacterHub";
import { posterArt } from "@/lib/assets";

export const metadata: Metadata = {
  title: "RUVI — swollen nurse build",
  description: "Bandage-headed nurse build guide: plaster mask, nurse dress pattern, cap, lead pipe, weathering, safety and schedule.",
};

export default function RuviPage() {
  // key art: front ¾ for the poster, then side and back frames for the "What's next" thumbnails
  const posters = [posterArt("ruvi", 0), posterArt("ruvi", 1), posterArt("ruvi", 3)];
  return <CharacterHub character="ruvi" posters={posters} />;
}
