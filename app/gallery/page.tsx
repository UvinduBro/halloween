import type { Metadata } from "next";
import { Gallery } from "@/components/ui/Gallery";

export const metadata: Metadata = { title: "Gallery", description: "Your own costume photos, stored only in your browser." };

export default function GalleryPage() {
  return <Gallery />;
}
