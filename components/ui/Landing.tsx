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
import { useInteracted } from "@/lib/interaction";
import { Countdown } from "./Countdown";
import { HeroPoster } from "./HeroPoster";
import { Portal } from "./Portal";
import { DeferredPosterArt as PosterArt } from "./DeferredPosterArt";
import { SectionHeading } from "./Section";
import { EpisodeCards } from "./landing/EpisodeCards";
import { TonightRail } from "./landing/TonightRail";
import { Dossier } from "./landing/Dossier";
import type { PosterArt as Art } from "@/lib/assets";

const HeroScene = dynamic(() => import("@/components/3d/hero/HeroScene"), { ssr: false, loading: () => null });

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

export function Landing({
  assets: detected,
  posters,
}: {
  assets: Record<CharacterId, HeroAsset>;
  posters: Record<CharacterId, Art | null>;
}) {
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
  const [ready3D, setReady3D] = useState(false);
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

  // Keep 3D out of first paint and off the main thread until someone is actually here:
  // the WebGL scene mounts on the first interaction (after the content gate is closed).
  const interacted = useInteracted();
  const show3D = mount3D || interacted;

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

  const plateButtons = (["uvi", "ruvi"] as CharacterId[]).map((id) => (
    <div
      key={id}
      ref={(el) => {
        plates.current[id] = el;
      }}
      className="absolute z-20 flex flex-col items-center"
      style={{ left: `${id === "uvi" ? (mobile ? 24 : 43) : mobile ? 76 : 57}%`, bottom: "4%", transform: "translateX(-50%)" }}
    >
      <button
        type="button"
        onPointerEnter={() => setHover(id, true)}
        onPointerLeave={() => setHover(id, false)}
        onFocus={() => setHover(id, true)}
        onBlur={() => setHover(id, false)}
        onClick={() => onSelect(id)}
        aria-label={`Enter ${meta[id].wearer}'s build: ${meta[id].build}`}
        className={`rust-tag min-h-11 min-w-24 rounded-md px-5 py-2 font-heading text-2xl tracking-[0.2em] ${hovered[id] && motion ? "glitching" : ""} ${hovered[id] ? "flicker" : ""} ${selected === id ? "ring-2 ring-blood-bright" : ""}`}
      >
        {heroFigures[id].name}
      </button>
      {heroFigures[id].credit && <span className="mt-1 text-[10px] text-fog-dim">{heroFigures[id].credit}</span>}
    </div>
  ));

  return (
    <>
      <section ref={heroRef} className="relative mx-auto max-w-[1400px] px-3 pt-4 sm:px-5" aria-labelledby="hero-title">
        {/* The "screen": a rounded cinematic frame, as on a streaming landing page */}
        <div className="relative overflow-hidden rounded-[2rem] border border-fog/15 bg-ash shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)] lg:h-[min(88svh,860px)] lg:min-h-[640px]">
          {!flashlight && (
            <div className="hero-reveal pointer-events-none absolute inset-0 z-0 hidden sm:block" aria-hidden="true">
              <Scratches />
            </div>
          )}

          {/* Left column: title, logline, actions */}
          <div className="relative z-20 px-6 pt-8 sm:px-10 lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:w-[36%] lg:flex-col lg:justify-center lg:bg-gradient-to-r lg:from-ash lg:via-ash/80 lg:to-transparent lg:pt-0">
            <p className="font-heading text-xs uppercase tracking-[0.4em] text-sick">A Halloween special · 2 episodes</p>
            <h1 id="hero-title" className={`font-display mt-3 text-[clamp(4.5rem,13vw,9.5rem)] text-bandage ${motion ? "glitch" : ""}`}>
              Uvi
              <span className="block text-[0.42em] leading-none text-blood-text">&amp;</span>
              <span className="title-outline block" style={{ ["--accent" as string]: "#e9e1d0" }}>
                Ruvi
              </span>
            </h1>
            <p className="mt-5 max-w-sm text-fog">
              Two monsters, measured to the centimetre and built from cardboard, plaster and nerve in eight nights. Choose who you follow into the fog.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/progress" className="btn-play" style={{ ["--accent" as string]: "#e0685d" }}>
                <span aria-hidden="true">▶</span> Start building
              </Link>
              <a href="#episodes" className="btn-ghost">
                Episodes
              </a>
            </div>
          </div>

          {/* Stage: the 3D figures in the fog (absolute behind the columns on desktop) */}
          <div ref={stageRef} className="relative z-10 h-[62svh] min-h-[440px] w-full lg:absolute lg:inset-0 lg:h-auto">
            {!ready3D && <HeroPoster assets={assets} mobile={mobile} />}
            {show3D && (
              <div className={`absolute inset-0 transition-opacity duration-700 ${ready3D ? "opacity-100" : "opacity-0"}`}>
                <HeroScene
                  assets={assets}
                  motion={motion}
                  mobile={mobile}
                  flashlight={flashlight}
                  onSelect={onSelect}
                  plates={plates}
                  onReady={() => setReady3D(true)}
                />
              </div>
            )}
            {plateButtons}
            <p className="pointer-events-none absolute bottom-1 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap text-[11px] text-fog-dim">
              {mobile ? "Tap a figure · swipe it to turn" : "Hover to wake them · drag to turn · click to follow"}
            </p>
          </div>

          {/* Right column: tonight panel */}
          <div className="relative z-20 px-4 pb-6 lg:absolute lg:inset-y-0 lg:right-0 lg:flex lg:w-[30%] lg:flex-col lg:justify-center lg:bg-gradient-to-l lg:from-ash lg:via-ash/70 lg:to-transparent lg:px-8 lg:pb-0">
            <div className="flex justify-end gap-2 lg:absolute lg:right-6 lg:top-6">
              <button
                type="button"
                aria-pressed={flashlight}
                onClick={() => {
                  setMount3D(true);
                  setFlashlight(!flashlight);
                }}
                className={`min-h-11 rounded-full border px-4 text-xs uppercase tracking-widest ${flashlight ? "border-bandage bg-bandage/10 text-bandage" : "border-fog/30 bg-ash/70 text-fog"}`}
              >
                {flashlight ? "Lights on" : "Flashlight"}
              </button>
              {tilt.needs && (
                <button type="button" onClick={tilt.request} className="min-h-11 rounded-full border border-fog/30 bg-ash/70 px-4 text-xs uppercase tracking-widest text-fog">
                  Enable tilt
                </button>
              )}
            </div>
            <div className="panel mt-4 p-5 lg:mt-0">
              <p className="font-heading text-lg uppercase tracking-[0.12em] text-blood-text">They come out 31.10</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="chip">2026</span>
                <span className="chip chip-accent" style={{ ["--accent" as string]: "#e0685d" }}>
                  16+
                </span>
                <span className="chip">8 nights</span>
                <span className="chip">Colombo · 19:00</span>
              </div>
              <div className="mt-4">
                <Countdown compact />
              </div>
              <p className="mt-5 text-xs uppercase tracking-[0.3em] text-fog-dim">What&apos;s next?</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {(["uvi", "ruvi"] as CharacterId[]).map((id) => (
                  <Link
                    key={id}
                    href={`/${id}`}
                    className="group relative h-28 overflow-hidden rounded-xl border border-fog/15 bg-ash-3"
                    style={{ ["--accent" as string]: meta[id].accent }}
                  >
                    <PosterArt
                      art={posters[id]}
                      alt=""
                      frameVw={[30, 6]}
                      className="absolute left-1/2 top-0 h-[190%] -translate-x-1/2 transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ash to-transparent px-2 pb-1.5 pt-6 text-left">
                      <span className="block text-[10px] uppercase tracking-widest" style={{ color: meta[id].accent }}>
                        Ep {meta[id].episode.number}
                      </span>
                      <span className="font-display block text-xl text-bandage">{meta[id].name}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
        {calm && <p className="sr-only">Calm mode is on: effects are reduced.</p>}
      </section>

      <section id="episodes" className="relative z-10 mx-auto max-w-[1400px] scroll-mt-20 px-4 py-16 sm:px-6" aria-labelledby="episodes-title">
        <SectionHeading kicker="Now building" title="Choose your episode" id="episodes-title" />
        <EpisodeCards posters={posters} />
      </section>

      <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-16 sm:px-6" aria-labelledby="next-title">
        <SectionHeading kicker="Do not fall behind" title="What's next" id="next-title" />
        <TonightRail />
      </section>

      <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-8 sm:px-6">
        <Dossier posters={posters} />
      </section>

      {blackout && (
        <Portal>
          <div className="blackout" aria-hidden="true" />
        </Portal>
      )}
    </>
  );
}
