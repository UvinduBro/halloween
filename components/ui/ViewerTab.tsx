"use client";

import type { CharacterId } from "@/data/types";

export function ViewerTab({ character }: { character: CharacterId }) {
  return <p className="text-fog-dim">Coming up for {character}.</p>;
}
