import type { Metadata } from "next";
import { CharacterHub } from "@/components/ui/CharacterHub";

export const metadata: Metadata = {
  title: "UVI — pyramid helmet build",
  description: "Pyramid-helmet executioner build guide: helmet geometry, cut list, great knife, skirt, paint, safety and schedule.",
};

export default function UviPage() {
  return <CharacterHub character="uvi" />;
}
