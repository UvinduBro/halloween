import type { Metadata } from "next";
import { CharacterHub } from "@/components/ui/CharacterHub";
import { posterArt } from "@/lib/assets";

export const metadata: Metadata = {
  title: "UVI — pyramid helmet build",
  description: "Pyramid-helmet executioner build guide: helmet geometry, cut list, great knife, skirt, paint, safety and schedule.",
};

export default function UviPage() {
  // key art: front ¾ for the poster, then side and back frames for the "What's next" thumbnails
  const posters = [posterArt("uvi", 0), posterArt("uvi", 1), posterArt("uvi", 3)];
  return <CharacterHub character="uvi" posters={posters} />;
}
