"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { fmtLen } from "@/lib/units";
import { Label3D, type LabelTone } from "./labels";
import type { Unit } from "@/lib/store";

/* ------------------------------------------------------------------ */
/* Viewer context                                                      */
/* ------------------------------------------------------------------ */

import type { Preset } from "./views";
export type { Preset };

export interface ViewerSettings {
  xray: boolean;
  labels: boolean;
  explode: number;
  step: number;
  finished: boolean;
  dark: boolean;
  mannequin: boolean;
  preset: Preset;
  presetNonce: number;
  unit: Unit;
  mobile: boolean;
  motion: boolean;
  /** Mask stage (0..4) for the RUVI mask view. */
  stage: number;
}

export const ViewerContext = createContext<ViewerSettings>({
  xray: false,
  labels: false,
  explode: 0,
  step: 99,
  finished: false,
  dark: false,
  mannequin: false,
  preset: "threeQuarter",
  presetNonce: 0,
  unit: "cm",
  mobile: false,
  motion: true,
  stage: 4,
});

export const useViewer = () => useContext(ViewerContext);

/** Model space → three space: x right, y forward, z up (cm) → y up, metres, facing the camera. */
export function ZUp({ children, position }: { children: React.ReactNode; position?: [number, number, number] }) {
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, Math.PI]} scale={0.01}>
      {children}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces: exploded view and assembly                                  */
/* ------------------------------------------------------------------ */

/**
 * A build piece. Pushed out along `dir` by the exploded slider and animated in when the
 * assembly scrubber reaches `appearAt`.
 */
export function Piece({
  dir = [0, 0, 0],
  distance = 30,
  appearAt = 0,
  children,
}: {
  dir?: readonly [number, number, number];
  distance?: number;
  appearAt?: number;
  children: React.ReactNode;
}) {
  const { explode, step, motion } = useViewer();
  const ref = useRef<THREE.Group>(null);
  const visible = step >= appearAt;
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    const k = visible ? explode * distance : distance * 1.2 + 25;
    target.set(dir[0] * k, dir[1] * k, dir[2] * k + (visible ? 0 : 20));
    const s = visible ? 1 : 0.0001;
    if (!motion) {
      g.position.copy(target);
      g.scale.setScalar(s);
      return;
    }
    const a = 1 - Math.exp(-dt * 8);
    g.position.lerp(target, a);
    const cur = g.scale.x + (s - g.scale.x) * a;
    g.scale.setScalar(Math.max(cur, 0.0001));
    g.visible = g.scale.x > 0.002;
  });

  return <group ref={ref}>{children}</group>;
}

/* ------------------------------------------------------------------ */
/* Raw / finished material with procedural rust & grime                */
/* ------------------------------------------------------------------ */

const NOISE = /* glsl */ `
varying vec3 vObjPos;
uniform float uFinished;
uniform float uScale;
uniform vec3 uRaw;
uniform vec3 uBase;
uniform vec3 uRust;
uniform vec3 uAccent;
uniform vec3 uDark;
uniform float uStripe;
float h3(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i+vec3(0,0,0)),h3(i+vec3(1,0,0)),f.x), mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x), mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y), f.z);
}
float fbm(vec3 p){ float v=0.0; float a=0.5; for(int i=0;i<4;i++){ v+=a*vnoise(p); p*=2.03; a*=0.5; } return v; }
`;

export interface GrimeColors {
  raw: string;
  base: string;
  rust: string;
  accent: string;
  dark: string;
  /** Cardboard flute stripes (0 = none). */
  stripe?: number;
  scale?: number;
  metal?: number;
}

export const PALETTES = {
  cardboard: { raw: "#b48a5a", base: "#1b1714", rust: "#7a3a1a", accent: "#c4642a", dark: "#0c0a09", stripe: 1.2, scale: 0.09, metal: 0.25 },
  plaster: { raw: "#e8e4dc", base: "#d9d0bb", rust: "#8f7a4e", accent: "#6f7a52", dark: "#4a1410", scale: 0.16 },
  cotton: { raw: "#f2efe8", base: "#ddd0b3", rust: "#a98a5a", accent: "#7a1c16", dark: "#6a5a40", scale: 0.07 },
  pvc: { raw: "#d9d9d4", base: "#1a1a1a", rust: "#6b3a1c", accent: "#8a8a8a", dark: "#050505", scale: 0.25, metal: 0.5 },
  felt: { raw: "#3a3530", base: "#2a2420", rust: "#4a2a1a", accent: "#5a1a14", dark: "#111", scale: 0.3 },
  hardhat: { raw: "#d2a326", base: "#d2a326", rust: "#a2741e", accent: "#d2a326", dark: "#3a2a10", scale: 0.2 },
  fabric: { raw: "#c8b998", base: "#6b5a44", rust: "#3a2a1c", accent: "#5a1a14", dark: "#1a140f", scale: 0.4 },
  gauze: { raw: "#efe9dc", base: "#d6caa8", rust: "#9c8a5c", accent: "#6a1a14", dark: "#5c5040", scale: 0.35 },
} satisfies Record<string, GrimeColors>;

export function useGrimeMaterial(colors: GrimeColors, opts: { finished?: boolean; side?: THREE.Side; opacityOverride?: number } = {}) {
  const { xray, finished: globalFinished } = useViewer();
  const finished = opts.finished ?? globalFinished;
  const uniforms = useMemo(
    () => ({
      uFinished: { value: 0 },
      uScale: { value: colors.scale ?? 0.1 },
      uRaw: { value: new THREE.Color(colors.raw) },
      uBase: { value: new THREE.Color(colors.base) },
      uRust: { value: new THREE.Color(colors.rust) },
      uAccent: { value: new THREE.Color(colors.accent) },
      uDark: { value: new THREE.Color(colors.dark) },
      uStripe: { value: colors.stripe ?? 0 },
    }),
    [colors],
  );

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, side: opts.side ?? THREE.DoubleSide });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vObjPos;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObjPos = position;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${NOISE}`)
        .replace(
          "#include <color_fragment>",
          /* glsl */ `#include <color_fragment>
          vec3 P = vObjPos * uScale;
          float n = fbm(P);
          float n2 = fbm(P * 3.1 + 7.0);
          vec3 fin = mix(uBase, uRust, smoothstep(0.38, 0.72, n));
          fin = mix(fin, uAccent, smoothstep(0.55, 0.8, n2) * smoothstep(0.45, 0.7, n) * 0.85);
          fin = mix(fin, uDark, smoothstep(0.62, 0.92, 1.0 - n2) * 0.55);
          vec3 raw = uRaw * (0.9 + 0.18 * n2);
          if (uStripe > 0.0) raw *= 0.94 + 0.06 * sin(vObjPos.x * 6.2831 / uStripe);
          diffuseColor.rgb = mix(raw, fin, uFinished);`,
        )
        .replace(
          "#include <roughnessmap_fragment>",
          "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.65 + 0.3 * fbm(vObjPos * uScale * 2.0), uFinished);",
        );
    };
    m.customProgramCacheKey = () => "grime-v1";
    return m;
  }, [uniforms, opts.side]);

  useEffect(() => () => material.dispose(), [material]);

  uniforms.uFinished.value = finished ? 1 : 0;
  material.metalness = finished ? (colors.metal ?? 0) : 0;
  const opacity = opts.opacityOverride ?? (xray ? 0.3 : 1);
  material.transparent = opacity < 1;
  material.opacity = opacity;
  material.depthWrite = opacity >= 1;
  return material;
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

export function EdgeLabel({
  position,
  lengthCm,
  text,
  tone,
  always,
}: {
  position: readonly [number, number, number];
  lengthCm?: number;
  text?: string;
  tone?: LabelTone;
  always?: boolean;
}) {
  const { unit } = useViewer();
  return <Label3D position={position} text={text ?? fmtLen(lengthCm ?? 0, unit)} tone={tone} always={always} />;
}

/* ------------------------------------------------------------------ */
/* Mannequin                                                           */
/* ------------------------------------------------------------------ */

const mannequinMat = new THREE.MeshStandardMaterial({ color: "#7d7a75", roughness: 0.9 });

/** Generic grey mannequin in model cm space (z up, z = 0 at the top of the shoulders). */
export function Mannequin({
  head,
  shoulderWidth = 44,
  torso = true,
  showHead = true,
}: {
  head: { centre: readonly [number, number, number]; semi: readonly [number, number, number] };
  shoulderWidth?: number;
  torso?: boolean;
  showHead?: boolean;
}) {
  const { mannequin } = useViewer();
  if (!mannequin) return null;
  const [cx, cy, cz] = head.centre;
  const [sx, sy, sz] = head.semi;
  const neckTop = cz - sz * 0.7;
  return (
    <group>
      {showHead && (
        <mesh position={[cx, cy, cz]} scale={[sx, sy, sz]} material={mannequinMat}>
          <sphereGeometry args={[1, 32, 24]} />
        </mesh>
      )}
      <mesh position={[cx, cy - 1, (neckTop + -2) / 2]} rotation={[Math.PI / 2, 0, 0]} material={mannequinMat}>
        <cylinderGeometry args={[sx * 0.62, sx * 0.72, Math.max(2, neckTop + 2), 20]} />
      </mesh>
      {torso && (
        <group>
          <mesh position={[0, 0, -2]} rotation={[Math.PI / 2, 0, 0]} scale={[shoulderWidth / 2, 6, 11]} material={mannequinMat}>
            <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 0, -32]} rotation={[Math.PI / 2, 0, 0]} scale={[shoulderWidth / 2 / 14, 1, 11 / 14]} material={mannequinMat}>
            <cylinderGeometry args={[14, 12.5, 60, 32, 1]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Lights, flashlight, camera presets                                  */
/* ------------------------------------------------------------------ */

export function SceneLights() {
  const { dark } = useViewer();
  return (
    <>
      <ambientLight intensity={dark ? 0.03 : 0.45} />
      <hemisphereLight args={["#c9c4ba", "#1a0c08", dark ? 0.02 : 0.5]} />
      <directionalLight position={[3, 5, 4]} intensity={dark ? 0 : 1.6} color="#f1e6d2" />
      <directionalLight position={[-4, 2, -3]} intensity={dark ? 0 : 0.6} color="#8b4a23" />
      {dark && <Flashlight />}
    </>
  );
}

function Flashlight() {
  const light = useRef<THREE.SpotLight>(null);
  const { camera, pointer, scene } = useThree();
  const ray = useMemo(() => new THREE.Raycaster(), []);
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    scene.add(l.target);
    return () => {
      scene.remove(l.target);
    };
  }, [scene]);
  useFrame(() => {
    const l = light.current;
    if (!l) return;
    ray.setFromCamera(pointer, camera);
    l.position.copy(camera.position);
    l.target.position.copy(camera.position).addScaledVector(ray.ray.direction, 3);
    l.target.updateMatrixWorld();
  });
  return <spotLight ref={light} angle={0.22} penumbra={0.6} intensity={40} distance={12} decay={1.6} color="#fff1d6" />;
}

export interface Focus {
  target: [number, number, number];
  radius: number;
  /** Half width / half height (m) of what must fit in frame from the front. */
  half?: [number, number];
}

/** Camera distance that fits the focus box in a viewport of the given aspect. */
export function fitDistance(focus: Focus, fovDeg: number, aspect: number, margin = 1.25) {
  const halfV = (fovDeg / 2) * (Math.PI / 180);
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  const [hw, hh] = focus.half ?? [focus.radius, focus.radius];
  // keep some depth allowance so rotating doesn't clip
  const depth = focus.radius * 0.6;
  return Math.max(hh / Math.tan(halfV), hw / Math.tan(halfH)) * margin + depth;
}

const PRESET_DIRS: Record<Preset, [number, number, number]> = {
  front: [0, 0.08, 1],
  side: [1, 0.08, 0],
  back: [0, 0.08, -1],
  top: [0, 1, 0.0001],
  threeQuarter: [0.75, 0.42, 0.85],
};

/** Moves the camera to a preset whenever the preset (or its nonce) changes. */
export function CameraRig({ focus }: { focus: Focus }) {
  const { preset, presetNonce, motion } = useViewer();
  const { camera, controls, size } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: OrbitControlsImpl | null;
    size: { width: number; height: number };
  };
  const aspect = size.width / Math.max(1, size.height);
  const anim = useRef<{ from: THREE.Vector3; to: THREE.Vector3; t: number } | null>(null);
  const target = useMemo(() => new THREE.Vector3(...focus.target), [focus.target]);

  useEffect(() => {
    const d = new THREE.Vector3(...PRESET_DIRS[preset]).normalize();
    const dist = fitDistance(focus, camera.fov, aspect);
    const to = target.clone().addScaledVector(d, dist);
    if (controls) controls.target.copy(target);
    if (!motion) {
      camera.position.copy(to);
      camera.lookAt(target);
      controls?.update();
      anim.current = null;
      return;
    }
    anim.current = { from: camera.position.clone(), to, t: 0 };
    // re-frame only on preset changes and model changes, not on every resize
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, presetNonce, focus, target, camera, controls, motion]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (!a) return;
    a.t = Math.min(1, a.t + dt / 0.7);
    const e = 1 - Math.pow(1 - a.t, 3);
    camera.position.lerpVectors(a.from, a.to, e);
    camera.lookAt(target);
    controls?.update();
    if (a.t >= 1) anim.current = null;
  });
  return null;
}

/* ------------------------------------------------------------------ */
/* Linked cameras (duo mode)                                           */
/* ------------------------------------------------------------------ */

const links: Record<string, { leader: string | null; pos: THREE.Vector3; target: THREE.Vector3; zoom: number }> = {};

export function CameraLink({ group, id }: { group: string; id: string }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null };
  useEffect(() => {
    if (!links[group]) links[group] = { leader: null, pos: new THREE.Vector3(), target: new THREE.Vector3(), zoom: 1 };
    if (!controls) return;
    const onStart = () => {
      links[group].leader = id;
    };
    controls.addEventListener("start", onStart);
    return () => controls.removeEventListener("start", onStart);
  }, [controls, group, id]);
  useFrame(() => {
    const l = links[group];
    if (!l || !controls) return;
    if (l.leader === id) {
      // Share the camera offset relative to the target so different-sized models stay framed.
      l.pos.copy(camera.position).sub(controls.target).normalize();
      l.zoom = camera.position.distanceTo(controls.target);
    } else if (l.leader) {
      const base = controls.target;
      const r = camera.position.distanceTo(base);
      camera.position.copy(base).addScaledVector(l.pos, r);
      camera.lookAt(base);
    }
  });
  return null;
}
