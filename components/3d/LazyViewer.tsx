"use client";

import dynamic from "next/dynamic";
import type { BuildViewerProps } from "./BuildViewer";
import { useInteracted } from "@/lib/interaction";
export { VIEW_LABELS, type ViewKind } from "./views";

export function ViewerSkeleton({ compact = false, waiting = false }: { compact?: boolean; waiting?: boolean }) {
  return (
    <div
      className={`relative w-full border border-fog/10 bg-ash-2 ${compact ? "h-full min-h-56" : "h-[58vh] min-h-[340px] sm:h-[520px]"}`}
      role="status"
      aria-label="Loading 3D view"
    >
      <span className="absolute inset-0 animate-pulse bg-fog/5" aria-hidden="true" />
      <span className="absolute inset-0 flex items-center justify-center px-4 text-center font-heading text-fog-dim">
        {waiting ? "Move, tap or scroll to wake the model…" : "Something is taking shape…"}
      </span>
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
  const interacted = useInteracted();
  if (!interacted) return <ViewerSkeleton compact={props.compact} waiting />;
  return props.compact ? <CompactViewer {...props} /> : <BuildViewer {...props} />;
}
