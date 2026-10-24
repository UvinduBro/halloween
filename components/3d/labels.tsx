"use client";

import { useFrame } from "@react-three/fiber";
import { createContext, useContext, useEffect, useId, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";

/**
 * 3D-anchored labels rendered in one DOM overlay above the canvas.
 * Labels register an anchor object; a projector inside the canvas moves the DOM nodes each frame.
 */

export type LabelTone = "default" | "sick" | "heading" | "muted";

interface LabelItem {
  obj: THREE.Object3D;
  text: string;
  tone: LabelTone;
  always: boolean;
}

export class LabelRegistry {
  items = new Map<string, LabelItem>();
  els = new Map<string, HTMLSpanElement>();
  private listeners = new Set<() => void>();
  version = 0;

  set(id: string, item: LabelItem) {
    this.items.set(id, item);
    this.emit();
  }
  delete(id: string) {
    this.items.delete(id);
    this.emit();
  }
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getVersion = () => this.version;
  private emit() {
    this.version++;
    // defer so registering during a commit never re-renders the overlay mid-render
    queueMicrotask(() => this.listeners.forEach((l) => l()));
  }
}

export const LabelContext = createContext<LabelRegistry | null>(null);

export function Label3D({
  position,
  text,
  tone = "default",
  always = false,
}: {
  position: readonly [number, number, number];
  text: string;
  tone?: LabelTone;
  always?: boolean;
}) {
  const registry = useContext(LabelContext);
  const ref = useRef<THREE.Group>(null);
  const id = useId();
  useEffect(() => {
    if (!registry || !ref.current) return;
    registry.set(id, { obj: ref.current, text, tone, always });
  }, [registry, id, text, tone, always]);
  useEffect(() => {
    if (!registry) return;
    return () => registry.delete(id);
  }, [registry, id]);
  return <group ref={ref} position={position as [number, number, number]} />;
}

const v = new THREE.Vector3();

export function LabelProjector() {
  const registry = useContext(LabelContext);
  useFrame(({ camera, size }) => {
    if (!registry) return;
    for (const [id, item] of registry.items) {
      const el = registry.els.get(id);
      if (!el) continue;
      let visible = !!item.obj.parent;
      for (let o: THREE.Object3D | null = item.obj; o && visible; o = o.parent) visible = o.visible;
      if (!visible) {
        el.style.opacity = "0";
        continue;
      }
      item.obj.updateWorldMatrix(true, false);
      v.setFromMatrixPosition(item.obj.matrixWorld).project(camera);
      if (v.z > 1 || v.z < -1) {
        el.style.opacity = "0";
        continue;
      }
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      el.style.opacity = "1";
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }
  });
  return null;
}

const toneClass: Record<LabelTone, string> = {
  default: "border border-sick/50 bg-ash/90 px-1.5 py-0.5 text-[11px] text-bandage",
  sick: "border border-sick/60 bg-ash/90 px-1.5 py-0.5 text-[11px] text-sick",
  heading: "bg-ash/90 px-1.5 py-0.5 font-heading text-sm text-bandage",
  muted: "bg-ash/80 px-1.5 py-0.5 text-[11px] text-fog",
};

export function LabelOverlay({ registry, show }: { registry: LabelRegistry; show: boolean }) {
  useSyncExternalStore(registry.subscribe, registry.getVersion, registry.getVersion);
  const entries = [...registry.items.entries()];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {entries.map(([id, item]) =>
        show || item.always ? (
          <span
            key={id}
            ref={(el) => {
              if (el) registry.els.set(id, el);
              else registry.els.delete(id);
            }}
            className={`absolute left-0 top-0 whitespace-nowrap opacity-0 ${toneClass[item.tone]}`}
          >
            {item.text}
          </span>
        ) : null,
      )}
    </div>
  );
}
