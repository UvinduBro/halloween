"use client";

import { createPortal } from "react-dom";
import { useHydrated } from "@/lib/hooks";

/** Renders children at the end of <body>, outside the page's stacking contexts (for overlays and dialogs). */
export function Portal({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  if (!hydrated) return null;
  return createPortal(children, document.body);
}
