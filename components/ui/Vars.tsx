"use client";

import { createContext, useContext, useMemo } from "react";
import { useCharacterVars } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { renderText, type TextVars } from "@/lib/units";
import type { CharacterId } from "@/data/types";

const VarsContext = createContext<{ vars: TextVars; character: CharacterId | null }>({ vars: {}, character: null });

export function VarsProvider({ character, children }: { character: CharacterId; children: React.ReactNode }) {
  const vars = useCharacterVars(character);
  const value = useMemo(() => ({ vars, character }), [vars, character]);
  return <VarsContext.Provider value={value}>{children}</VarsContext.Provider>;
}

export function useVars() {
  return useContext(VarsContext);
}

/** Renders build text with unit tokens converted to the active unit and live fit-lab values. */
export function RT({ text, as: Tag = "span", className }: { text: string; as?: "span" | "p" | "li" | "div"; className?: string }) {
  const { vars } = useVars();
  const unit = useStore((s) => s.unit);
  return <Tag className={className}>{renderText(text, unit, vars)}</Tag>;
}

export function useRT() {
  const { vars } = useVars();
  const unit = useStore((s) => s.unit);
  return (text: string) => renderText(text, unit, vars);
}
