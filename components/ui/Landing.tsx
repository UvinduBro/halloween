"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { heroFigures, site } from "@/data/site";
import { uviMeta } from "@/data/uvi";
import { ruviMeta } from "@/data/ruvi";
import type { CharacterId } from "@/data/types";
import { audio } from "@/lib/audio";
import { heroPointer, useHero, type HeroAsset } from "@/lib/heroState";
import { useIsMobile, useMotionAllowed } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { useCutNavigate } from "@/lib/transition";
import { Countdown } from "./Countdown";

function HeroSkeleton() {
  return (
    <div className="absolute inset-0 flex items-end justify-center gap-[18%] pb-[8%]" role="status" aria-label="Loading the figures in the fog">
      {[0, 1].map((i) => (
        <div key={i} className="h-[62%] w-[16%] max-w-32 animate-pulse rounded-t-full bg-gradient-to-b from-fog/10 to-transparent blur-sm" />
      ))}
    </div>
  );
}

const HeroScene = dynamic(() => import("@/components/3d/hero/HeroScene"), { ssr: false, loading: () => <HeroSkeleton /> });

/** Deterministic scratch texture revealed by the cursor "flashlight" on the hero. */
const SCRATCHES = (() => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const lines = Array.from({ length: 70 }, () => {
    const x = rnd() * 1200;
    const y = rnd() * 800;
    return `M${x.toFixed(0)} ${y.toFixed(0)} l${((rnd() - 0.5) * 160).toFixed(0)} ${((rnd() - 0.3) * 90).toFixed(0)}`;
  });
  const hands = Array.from({ length: 5 }, () => ({ x: rnd() * 1100 + 50, y: rnd() * 600 + 100, r: (rnd() - 0.5) * 60 }));
  return { lines, hands };
})();

function Scratches() {
  const { lines, hands } = SCRATCHES;
  return (
    <svg className="h-full w-full" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g stroke="#c9b8a0" strokeOpacity="0.32" strokeWidth="1.4" fill="none">
        {lines.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      {hands.map((h, i) => (
        <g key={i} transform={`translate(${h.x} ${h.y}) rotate(${h.r})`} fill="#5A0F0F" fillOpacity="0.35">
          <ellipse cx="0" cy="0" rx="18" ry="22" />
          {[-14, -6, 2, 10].map((fx, k) => (
            <rect key={k} x={fx} y={-48 + Math.abs(fx) * 0.6} width="6" height="26" rx="3" />
          ))}
          <rect x="16" y="-10" width="6" height="20" rx="3" transform="rotate(35 16 -10)" />
        </g>
      ))}
      <text x="600" y="430" textAnchor="middle" fontSize="54" fill="#c9b8a0" fillOpacity="0.25" fontFamily="var(--font-special-elite)">
        {site.wallText}
      </text>
    </svg>
  );
}

function useTiltPermission(mobile: boolean) {
  const [needs, setNeeds] = useState(false);
  const listen = useCallback(() => {
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      heroPointer.x = Math.max(-1, Math.min(1, e.gamma / 30));
      heroPointer.y = Math.max(-1, Math.min(1, -(e.beta - 45) / 30));
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => window.removeEventListener("deviceorientation", onTilt);
  }, []);
  useEffect(() => {
    if (!mobile || typeof DeviceOrientationEvent === "undefined") return;
    const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof D.requestPermission === "function") {
      const id = setTimeout(() => setNeeds(true), 0);
      return () => clearTimeout(id);
    }
    return listen();
  }, [mobile, listen]);
  const request = async () => {
    const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    try {
      if ((await D.requestPermission?.()) === "granted") {
        listen();
        setNeeds(false);
      }
    } catch {
      setNeeds(false);
    }
  };
  return { needs, request };
}

export function Landing({ assets: detected }: { assets: Record<CharacterId, HeroAsset> }) {
  const motion = useMotionAllowed();
  const mobile = useIsMobile();
  const flashlight = useStore((s) => s.heroFlashlight);
  const setFlashlight = useStore((s) => s.setHeroFlashlight);
  const audioOn = useStore((s) => s.audio);
  const calm = useStore((s) => s.calm);
  const hovered = useHero((s) => s.hovered);
  const selected = useHero((s) => s.selected);
  const select = useHero((s) => s.select);
  const setHover = useHero((s) => s.setHover);
  const navigate = useCutNavigate();
  const heroRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const plates = useRef<Record<CharacterId, HTMLElement | null>>({ uvi: null, ruvi: null });
  const [mount3D, setMount3D] = useState(false);
  const [blackout, setBlackout] = useState(false);
  const [assets, setAssets] = useState(detected);
  const tilt = useTiltPermission(mobile);

  // ?figures=original shows the original procedural designs even when sheets exist
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("figures") === "original") {
      const id = setTimeout(() => setAssets({ uvi: { kind: "procedural" }, ruvi: { kind: "procedural" } }), 0);
      return () => clearTimeout(id);
    }
  }, []);

  // Keep 3D out of first paint: mount the canvas when the browser is idle.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setMount3D(true), { timeout: 1500 });
      return () => (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
    }
    const id = setTimeout(() => setMount3D(true), 700);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => () => select(null), [select]);

  // Pointer → normalised coordinates for head tracking, pixel coordinates for the flashlight
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const stage = stageRef.current;
      const hero = heroRef.current;
      if (hero) {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty("--mx", `${e.clientX - r.left}px`);
        hero.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
      if (stage) {
        const r = stage.getBoundingClientRect();
        heroPointer.px = e.clientX - r.left;
        heroPointer.py = e.clientY - r.top;
        if (e.pointerType === "mouse" || !tilt.needs) {
          heroPointer.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
          heroPointer.y = Math.max(-1, Math.min(1, -(((e.clientY - r.top) / r.height) * 2 - 1)));
        }
        heroPointer.active = true;
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
    };
  }, [tilt.needs]);

  // A low synthesised whisper on hover (only if sound is on)
  const prevHover = useRef(hovered);
  useEffect(() => {
    for (const id of ["uvi", "ruvi"] as CharacterId[]) {
      if (hovered[id] && !prevHover.current[id] && audioOn) audio.whisper(id === "uvi" ? -0.5 : 0.5);
    }
    prevHover.current = hovered;
  }, [hovered, audioOn]);

  // Easter egg: typing "uvi" or "ruvi" → distant metallic scrape and a 1 s blackout (not in calm mode)
  useEffect(() => {
    let buf = "";
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key.length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-4);
      if (buf.endsWith("uvi") && motion) {
        buf = "";
        if (useStore.getState().audio) audio.scrape();
        setBlackout(true);
        setTimeout(() => setBlackout(false), 1000);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [motion]);

  const onSelect = useCallback(
    (id: CharacterId) => {
      if (useHero.getState().selected) return;
      select(id);
      if (useStore.getState().audio) audio.whisper(id === "uvi" ? -0.3 : 0.3);
      setTimeout(() => navigate(`/${id}`), 1200);
    },
    [select, navigate],
  );

  const meta = { uvi: uviMeta, ruvi: ruviMeta };

  return (
    <>
      <section ref={heroRef} className="relative overflow-hidden" aria-labelledby="hero-title">
        {!flashlight && (
          <div className="hero-reveal pointer-events-none absolute inset-0 z-0 hidden sm:block" aria-hidden="true">
            <Scratches />
          </div>
        )}
        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-10 text-center sm:pt-14">
          <p className="font-heading text-xs uppercase tracking-[0.45em] text-sick">Halloween · 31.10.2026 · Colombo</p>
          <h1 id="hero-title" className={`mt-3 font-heading text-6xl leading-none text-bandage sm:text-8xl md:text-9xl ${motion ? "glitch" : ""}`}>
            UVI <span className="text-blood-bright">&amp;</span> RUVI
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-fog">Two Halloween builds, measured to the centimetre. Choose who you follow into the fog.</p>
          <div className="mt-6">
            <Countdown />
          </div>
        </div>

        <div ref={stageRef} className="relative z-10 mx-auto mt-4 h-[64svh] min-h-[420px] w-full max-w-6xl sm:h-[70vh]">
          {mount3D ? (
            <HeroScene assets={assets} motion={motion} mobile={mobile} flashlight={flashlight} onSelect={onSelect} plates={plates} />
          ) : (
            <HeroSkeleton />
          )}
          {/* Rusted name plates: real buttons, positioned under each figure by the scene */}
          {(["uvi", "ruvi"] as CharacterId[]).map((id) => (
            <div
              key={id}
              ref={(el) => {
                plates.current[id] = el;
              }}
              className="absolute left-0 top-0 flex flex-col items-center"
              style={{ transform: `translate3d(${id === "uvi" ? "25vw" : "75vw"}, 50vh, 0) translate(-50%, 0)` }}
            >
              <button
                type="button"
                onPointerEnter={() => setHover(id, true)}
                onPointerLeave={() => setHover(id, false)}
                onFocus={() => setHover(id, true)}
                onBlur={() => setHover(id, false)}
                onClick={() => onSelect(id)}
                aria-label={`Enter ${meta[id].wearer}'s build: ${meta[id].build}`}
                className={`rust-tag min-h-11 min-w-24 px-5 py-2 font-heading text-2xl tracking-[0.2em] ${hovered[id] && motion ? "glitching" : ""} ${hovered[id] ? "flicker" : ""} ${selected === id ? "ring-2 ring-blood-bright" : ""}`}
              >
                {heroFigures[id].name}
              </button>
              {heroFigures[id].credit && <span className="mt-1 text-[10px] text-fog-dim">{heroFigures[id].credit}</span>}
            </div>
          ))}
          <div className="absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
            <button
              type="button"
              aria-pressed={flashlight}
              onClick={() => setFlashlight(!flashlight)}
              className={`min-h-11 border px-3 text-xs uppercase tracking-widest backdrop-blur ${flashlight ? "border-bandage bg-bandage/10 text-bandage" : "border-fog/30 bg-ash/60 text-fog"}`}
            >
              {flashlight ? "Lights on" : "Flashlight"}
            </button>
            {tilt.needs && (
              <button type="button" onClick={tilt.request} className="min-h-11 border border-fog/30 bg-ash/60 px-3 text-xs uppercase tracking-widest text-fog">
                Enable tilt
              </button>
            )}
          </div>
          <p className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap text-[11px] text-fog-dim">
            {mobile ? "Tap a figure · swipe it to turn" : "Hover to wake them · drag to turn · click to follow"}
          </p>
        </div>
        {calm && <p className="sr-only">Calm mode is on: effects are reduced.</p>}
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-16" aria-label="Choose a build">
        <div className="grid gap-5 md:grid-cols-2">
          {(["uvi", "ruvi"] as CharacterId[]).map((id, i) => (
            <Link
              key={id}
              href={`/${id}`}
              className="group fade-up block border border-fog/15 bg-ash-2/80 p-6 transition hover:border-blood-bright focus-visible:border-blood-bright"
              style={{ animationDelay: `${0.9 + i * 0.35}s` }}
            >
              <p className="font-heading text-xs uppercase tracking-[0.35em] text-sick">Worn by {meta[id].wearer}</p>
              <h2 className="mt-2 font-heading text-5xl text-bandage group-hover:text-blood-bright">{meta[id].name}</h2>
              <p className="mt-1 font-heading text-lg text-fog">{meta[id].build}</p>
              <p className="mt-4 text-fog-dim">{meta[id].tagline}.</p>
              <span className="mt-6 inline-flex min-h-11 items-center text-sm uppercase tracking-widest text-bandage">Open the build →</span>
            </Link>
          ))}
        </div>
        <div className="fade-up mt-10 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "1.7s" }}>
          <Link href="/progress" className="inline-flex min-h-12 items-center bg-blood px-8 font-heading text-xl text-bandage transition hover:bg-blood-bright">
            Start building
          </Link>
          <Link href="/duo" className="inline-flex min-h-12 items-center border border-fog/30 px-6 text-fog hover:text-bandage">
            Duo mode
          </Link>
        </div>
      </section>

      {blackout && <div className="blackout" aria-hidden="true" />}
    </>
  );
}
