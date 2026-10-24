"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { CharacterId } from "@/data/types";
import { heroPointer, useHero } from "@/lib/heroState";

export interface FigureProps {
  id: CharacterId;
  position: [number, number, number];
  motion: boolean;
  mobile: boolean;
  flashlight: boolean;
  lightColor: string;
  rim: string;
  onSelect: (id: CharacterId) => void;
}

/** Shared idle/tracking/hover/select behaviour for any hero figure. */
export function useFigureBehaviour(id: CharacterId, motion: boolean) {
  const hovered = useHero((s) => s.hovered[id]);
  const selected = useHero((s) => s.selected);
  const state = useRef({
    yaw: 0,
    pitch: 0,
    flare: 0,
    step: 0,
    twitchAt: id === "uvi" ? 4.5 : 8,
    twitch: 0,
    twitchDir: 1,
  });

  /** Called every frame; returns values the figure applies to its transforms. */
  const update = (t: number, dt: number) => {
    const s = state.current;
    const isSel = selected === id;
    // head tracking with lag and clamped angles
    const targetYaw = isSel ? 0 : THREE.MathUtils.clamp(heroPointer.x * 0.6, -0.6, 0.6);
    const targetPitch = isSel ? 0 : THREE.MathUtils.clamp(-heroPointer.y * 0.25, -0.25, 0.25);
    const lag = motion ? 1 - Math.exp(-dt * 2.2) : 1;
    s.yaw += (targetYaw - s.yaw) * lag;
    s.pitch += (targetPitch - s.pitch) * lag;
    // hover flare
    const flareTarget = hovered || isSel ? 1 : 0;
    s.flare += (flareTarget - s.flare) * (1 - Math.exp(-dt * 6));
    // step forward when selected
    s.step += ((isSel ? 1 : 0) - s.step) * (1 - Math.exp(-dt * 3));
    // occasional unnatural head twitch every 6–12 s
    if (motion && t > s.twitchAt) {
      s.twitch = 1;
      s.twitchDir = Math.random() > 0.5 ? 1 : -1;
      s.twitchAt = t + 6 + Math.random() * 6;
    }
    s.twitch = Math.max(0, s.twitch - dt * 7);
    const twitch = motion ? Math.sin(s.twitch * Math.PI) * 0.35 * s.twitchDir : 0;
    const breath = motion ? Math.sin(t * 1.4) : 0;
    return { yaw: s.yaw + twitch * 0.5, pitch: s.pitch, roll: twitch, flare: s.flare, step: s.step, breath, selected: isSel };
  };

  return { update, hovered, selected };
}

export function usePointerHandlers(id: CharacterId, onSelect: (id: CharacterId) => void) {
  const setHover = useHero((s) => s.setHover);
  return useMemo(
    () => ({
      onPointerOver: (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        setHover(id, true);
        document.body.style.cursor = "pointer";
      },
      onPointerOut: () => {
        setHover(id, false);
        document.body.style.cursor = "";
      },
      onClick: (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        onSelect(id);
      },
    }),
    [id, onSelect, setHover],
  );
}

/** Light intensity multiplier: flicker, hover flare and the duo moment (both lights sync and dim). */
export function useLightFlicker(motion: boolean, seed = 0) {
  return (t: number, flare: number) => {
    const duo = performance.now() < useHero.getState().duoUntil;
    if (duo) {
      // synced, slowly dimming pulse for both figures
      const k = 0.35 + 0.15 * Math.sin(t * 9);
      return k;
    }
    if (!motion) return 1 + flare * 0.8;
    const f = 0.85 + 0.1 * Math.sin(t * 13 + seed) + 0.08 * Math.sin(t * 31 + seed * 2) + (Math.sin(t * 0.7 + seed) > 0.97 ? -0.5 : 0);
    return f + flare * 1.2;
  };
}

export function useTime() {
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
  });
  return t;
}
