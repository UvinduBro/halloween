"use client";

import { useMemo } from "react";
import type { CharacterId } from "@/data/types";
import { LazyViewer } from "@/components/3d/LazyViewer";
import { useStore } from "@/lib/store";
import { templatesFor } from "@/lib/templates";
import { PieceThumb } from "./PieceSvg";

/** Live 3D model and template preview that follow the measurement form. */
export function FitLab({ character }: { character: CharacterId }) {
  const uvi = useStore((s) => s.uvi);
  const ruvi = useStore((s) => s.ruvi);
  const unit = useStore((s) => s.unit);
  const piece = useMemo(() => {
    const pieces = templatesFor(character, uvi, ruvi);
    return pieces.find((p) => p.id === (character === "uvi" ? "helmet-sideL" : "dress-back")) ?? pieces[0];
  }, [character, uvi, ruvi]);

  return (
    <div className="panel overflow-hidden">
      <div className="h-80">
        <LazyViewer
          view={character === "uvi" ? "helmet" : "fit"}
          compact
          initialPreset={character === "uvi" ? "side" : "threeQuarter"}
          defaults={{ mannequin: true, labels: true }}
          title={character === "uvi" ? "Live helmet fit" : "Live mask fit"}
        />
      </div>
      <div className="border-t border-fog/10 p-3">
        <p className="mb-2 text-xs uppercase tracking-widest text-fog-dim">Live template · {piece.name}</p>
        <PieceThumb piece={piece} unit={unit} />
      </div>
    </div>
  );
}
