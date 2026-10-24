"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { dressAssembly, maskAssembly } from "@/data/ruvi";
import { helmetAssembly, knifeAssembly } from "@/data/uvi";
import type { AssemblyStep } from "@/data/types";
import { useIsMobile, useMotionAllowed } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { buildHelmet } from "@/lib/uvi";
import { useUviVars } from "@/lib/hooks";
import { CameraLink, CameraRig, SceneLights, ViewerContext, type Focus, type ViewerSettings } from "./shared";
import { VIEW_LABELS, type Preset, type ViewKind } from "./views";
import { LabelContext, LabelOverlay, LabelProjector, LabelRegistry } from "./labels";
import { HelmetModel, helmetFocus, KnifeModel, knifeFocus } from "./UviModels";
import { CapModel, capFocus, DressModel, dressFocus, MaskModel, maskFocus, PipeModel, pipeFocus, useMaskDims } from "./RuviModels";

export type { ViewKind };

const ASSEMBLY: Partial<Record<ViewKind, AssemblyStep[]>> = {
  helmet: helmetAssembly,
  knife: knifeAssembly,
  mask: maskAssembly,
  dress: dressAssembly,
};

const PRESETS: { id: Preset; label: string }[] = [
  { id: "front", label: "Front" },
  { id: "side", label: "Side" },
  { id: "back", label: "Back" },
  { id: "top", label: "Top" },
  { id: "threeQuarter", label: "¾" },
];

export interface BuildViewerProps {
  view: ViewKind;
  compact?: boolean;
  fixedStep?: number;
  initialPreset?: Preset;
  linkGroup?: string;
  linkId?: string;
  className?: string;
  defaults?: Partial<Pick<ViewerSettings, "mannequin" | "labels" | "xray" | "finished" | "dark">>;
  title?: string;
}

function TouchSetup({ mobile }: { mobile: boolean }) {
  const { gl, controls } = useThree();
  useEffect(() => {
    if (!mobile) return;
    const el = gl.domElement;
    const apply = () => {
      el.style.touchAction = "pan-y";
    };
    apply();
    const id = setTimeout(apply, 50);
    return () => clearTimeout(id);
  }, [gl, controls, mobile]);
  return null;
}

function Model({ view, preset }: { view: ViewKind; preset: Preset }) {
  switch (view) {
    case "helmet":
      return <HelmetModel showLean={preset === "side"} />;
    case "knife":
      return <KnifeModel />;
    case "mask":
      return <MaskModel />;
    case "fit":
      return <MaskModel fit />;
    case "dress":
      return <DressModel />;
    case "cap":
      return <CapModel />;
    case "pipe":
      return <PipeModel />;
  }
}

function useFocus(view: ViewKind): Focus {
  const uvi = useUviVars();
  const mask = useMaskDims();
  const L = useStore((s) => s.ruvi.dressLength);
  return useMemo(() => {
    switch (view) {
      case "helmet":
        return helmetFocus(buildHelmet(uvi.k));
      case "knife":
        return knifeFocus;
      case "mask":
      case "fit":
        return maskFocus(mask);
      case "dress":
        return dressFocus(L);
      case "cap":
        return capFocus;
      case "pipe":
        return pipeFocus;
    }
  }, [view, uvi.k, mask, L]);
}

const btn = "min-h-11 px-3 text-sm border transition";
const on = "border-sick bg-sick/15 text-bandage";
const off = "border-fog/20 text-fog-dim hover:text-bandage";

export default function BuildViewer({
  view,
  compact = false,
  fixedStep,
  initialPreset = "threeQuarter",
  linkGroup,
  linkId,
  className = "",
  defaults,
  title,
}: BuildViewerProps) {
  const unit = useStore((s) => s.unit);
  const mobile = useIsMobile();
  const motion = useMotionAllowed();
  const assembly = ASSEMBLY[view];
  const maxStep = assembly ? assembly.length - 1 : 0;

  const [xray, setXray] = useState(defaults?.xray ?? false);
  const [labels, setLabels] = useState(defaults?.labels ?? !compact);
  const [explode, setExplode] = useState(0);
  const [step, setStep] = useState(maxStep);
  const [finished, setFinished] = useState(defaults?.finished ?? false);
  const [dark, setDark] = useState(defaults?.dark ?? false);
  const [mannequin, setMannequin] = useState(defaults?.mannequin ?? view === "helmet");
  const [preset, setPreset] = useState<Preset>(initialPreset);
  const [nonce, setNonce] = useState(0);
  const [playing, setPlaying] = useState(false);
  const glRef = useRef<HTMLCanvasElement | null>(null);
  const [registry] = useState(() => new LabelRegistry());

  // reset the scrubber when the view changes
  const [prevView, setPrevView] = useState(view);
  if (prevView !== view) {
    setPrevView(view);
    setStep(maxStep);
    setPlaying(false);
    setExplode(0);
  }

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= maxStep) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 1400);
    return () => clearInterval(id);
  }, [playing, maxStep]);

  const effectiveStep = fixedStep ?? step;
  const focus = useFocus(view);
  const settings: ViewerSettings = {
    xray,
    labels,
    explode,
    step: effectiveStep,
    finished,
    dark,
    mannequin,
    preset,
    presetNonce: nonce,
    unit,
    mobile,
    motion,
    stage: effectiveStep,
  };

  const screenshot = () => {
    const c = glRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `${view}-${Date.now()}.png`;
    a.click();
  };

  const cameraStart = useMemo(() => {
    const d = new THREE.Vector3(0.75, 0.42, 0.85).normalize().multiplyScalar(focus.radius * 3.4);
    return [focus.target[0] + d.x, focus.target[1] + d.y, focus.target[2] + d.z] as [number, number, number];
    // only the first frame uses this; presets take over afterwards
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = assembly?.[Math.min(effectiveStep, maxStep)];
  const canvasLabel = `${title ?? VIEW_LABELS[view]} 3D model${current ? `, step ${effectiveStep + 1}: ${current.title}` : ""}. ${
    mobile ? "Use two fingers to rotate and pinch to zoom." : "Drag to rotate, scroll to zoom."
  }`;

  return (
    <ViewerContext.Provider value={settings}>
      <LabelContext.Provider value={registry}>
      <div className={`flex flex-col gap-3 ${compact ? "h-full" : ""} ${className}`}>
        {!compact && (
          <div className="flex flex-wrap gap-1" role="group" aria-label="Camera presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={preset === p.id}
                onClick={() => {
                  setPreset(p.id);
                  setNonce((n) => n + 1);
                }}
                className={`${btn} ${preset === p.id ? on : off}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        <div
          className={`relative w-full overflow-hidden border border-fog/10 ${compact ? "min-h-56 flex-1" : "h-[58vh] min-h-[340px] sm:h-[520px]"}`}
          style={{ background: dark ? "#050404" : "radial-gradient(ellipse at 50% 40%, #2a2420, #0e0d0c 75%)" }}
        >
          <Canvas
            role="img"
            aria-label={canvasLabel}
            dpr={[1, mobile ? 1.5 : 2]}
            gl={{ preserveDrawingBuffer: true, antialias: !mobile, powerPreference: "high-performance" }}
            camera={{ fov: 40, near: 0.01, far: 50, position: cameraStart }}
            onCreated={({ gl }) => {
              glRef.current = gl.domElement;
            }}
          >
            <SceneLights />
            <Model view={view} preset={preset} />
            <OrbitControls
              makeDefault
              enableDamping
              enablePan={false}
              minDistance={focus.radius * 1.3}
              maxDistance={focus.radius * 10}
              target={focus.target}
              autoRotate={compact && motion && !linkGroup}
              autoRotateSpeed={0.8}
              touches={mobile ? { ONE: -1 as unknown as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE } : undefined}
            />
            <CameraRig focus={focus} />
            <TouchSetup mobile={mobile} />
            <LabelProjector />
            {linkGroup && linkId && <CameraLink group={linkGroup} id={linkId} />}
            {!mobile && motion && !compact && (
              <EffectComposer multisampling={0}>
                <Noise opacity={0.05} />
                <Vignette eskil={false} offset={0.25} darkness={0.75} />
              </EffectComposer>
            )}
          </Canvas>
          <LabelOverlay registry={registry} show={labels} />
          {mobile && !compact && (
            <p className="pointer-events-none absolute bottom-2 left-2 bg-ash/70 px-2 py-1 text-[11px] text-fog-dim">Two fingers: rotate · pinch: zoom</p>
          )}
        </div>

        {!compact && (
          <>
            <div className="flex flex-wrap gap-1" role="group" aria-label="View options">
              <button type="button" aria-pressed={xray} onClick={() => setXray(!xray)} className={`${btn} ${xray ? on : off}`}>
                X-ray
              </button>
              <button type="button" aria-pressed={labels} onClick={() => setLabels(!labels)} className={`${btn} ${labels ? on : off}`}>
                Measurements
              </button>
              <button type="button" aria-pressed={mannequin} onClick={() => setMannequin(!mannequin)} className={`${btn} ${mannequin ? on : off}`}>
                Mannequin
              </button>
              <button type="button" aria-pressed={finished} onClick={() => setFinished(!finished)} className={`${btn} ${finished ? on : off}`}>
                {finished ? "Finished" : view === "mask" || view === "fit" ? "Raw plaster" : "Raw cardboard"}
              </button>
              <button type="button" aria-pressed={dark} onClick={() => setDark(!dark)} className={`${btn} ${dark ? on : off}`}>
                {dark ? "Flashlight on" : "Dark scene"}
              </button>
              <button type="button" onClick={screenshot} className={`${btn} ${off}`}>
                Screenshot
              </button>
            </div>
            <label className="flex items-center gap-3 text-sm text-fog">
              <span className="w-20 shrink-0">Exploded</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={explode}
                onChange={(e) => setExplode(Number(e.target.value))}
                className="h-11 flex-1 accent-[#c06a35]"
              />
              <span className="w-10 text-right tabular-nums text-fog-dim">{Math.round(explode * 100)}%</span>
            </label>
            {assembly && (
              <div className="border border-fog/10 bg-ash-2/80 p-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!playing && step >= maxStep) setStep(0);
                      setPlaying(!playing);
                    }}
                    className={`${btn} ${off} min-w-11`}
                    aria-label={playing ? "Pause assembly animation" : "Play assembly animation"}
                  >
                    {playing ? "❚❚" : "▶"}
                  </button>
                  <label className="flex flex-1 items-center gap-3 text-sm text-fog">
                    <span className="sr-only">Assembly step</span>
                    <input
                      type="range"
                      min={0}
                      max={maxStep}
                      step={1}
                      value={step}
                      onChange={(e) => {
                        setPlaying(false);
                        setStep(Number(e.target.value));
                      }}
                      className="h-11 flex-1 accent-[#9FA87A]"
                      aria-valuetext={`Step ${step + 1} of ${maxStep + 1}: ${assembly[step].title}`}
                    />
                    <span className="w-12 text-right tabular-nums text-fog-dim">
                      {step + 1}/{maxStep + 1}
                    </span>
                  </label>
                </div>
                {(view === "mask" || view === "fit") && (
                  <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label="Mask stage">
                    {assembly.map((a, i) => (
                      <button key={a.title} type="button" aria-pressed={step === i} onClick={() => setStep(i)} className={`${btn} ${step === i ? on : off}`}>
                        {i + 1}. {a.title}
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-fog" aria-live="polite">
                  <span className="font-heading text-bandage">{assembly[step].title}. </span>
                  {assembly[step].text}
                </p>
              </div>
            )}
          </>
        )}
      </div>
      </LabelContext.Provider>
    </ViewerContext.Provider>
  );
}
