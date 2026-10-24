"use client";

import dynamic from "next/dynamic";
import type { BuildViewerProps } from "./BuildViewer";
export { VIEW_LABELS, type ViewKind } from "./views";

export function ViewerSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`relative w-full animate-pulse border border-fog/10 bg-ash-2 ${compact ? "h-full min-h-56" : "h-[58vh] min-h-[340px] sm:h-[520px]"}`}
      role="status"
      aria-label="Loading 3D view"
    >
      <span className="absolute inset-0 flex items-center justify-center font-heading text-fog-dim">Something is taking shape…</span>
    </div>
  );
}

const BuildViewer = dynamic(() => import("./BuildViewer"), {
  ssr: false,
  loading: () => <ViewerSkeleton />,
});

const CompactViewer = dynamic(() => import("./BuildViewer"), {
  ssr: false,
  loading: () => <ViewerSkeleton compact />,
});

export function LazyViewer(props: BuildViewerProps) {
  return props.compact ? <CompactViewer {...props} /> : <BuildViewer {...props} />;
}
