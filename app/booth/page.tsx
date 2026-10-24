import type { Metadata } from "next";
import { PhotoBooth } from "@/components/ui/PhotoBooth";

export const metadata: Metadata = { title: "Scare test", description: "A local-only photo booth with grain, flicker and a red tint." };

export default function BoothPage() {
  return <PhotoBooth />;
}
