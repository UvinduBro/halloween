"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { heroFigures, site } from "@/data/site";
import type { CharacterId } from "@/data/types";
import { heroPointer, useHero, type HeroAsset } from "@/lib/heroState";
import { SheetFigure } from "./SheetFigure";
import { GlbFigure } from "./GlbFigure";
import { LanternWarden, MothWidow } from "./ProceduralFigures";
import type { FigureProps } from "./common";

export interface HeroSceneProps {
  assets: Record<CharacterId, HeroAsset>;
  motion: boolean;
  mobile: boolean;
  flashlight: boolean;
  onSelect: (id: CharacterId) => void;
  plates: React.RefObject<Record<CharacterId, HTMLElement | null>>;
  onReady?: () => void;
}

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

const fogVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const fogFrag = /* glsl */ `
uniform float uTime; uniform float uOpacity; uniform float uPart; uniform float uPartX; uniform float uSeed; uniform vec3 uColor;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float v=0.; float a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p*=2.02; a*=.5; } return v; }
void main(){
  vec2 p = vUv * vec2(4.0, 1.6) + vec2(uTime * 0.025 + uSeed, uTime * 0.006);
  float d = fbm(p + fbm(p * 0.7 + uSeed));
  float a = smoothstep(0.35, 0.85, d);
  a *= smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
  a *= smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
  // the fog parts around the chosen figure
  float gap = 1.0 - uPart * (1.0 - smoothstep(0.04, 0.28, abs(vUv.x - uPartX)));
  gl_FragColor = vec4(uColor, a * uOpacity * gap);
}`;

function FogSheets({ motion, mobile }: { motion: boolean; mobile: boolean }) {
  const selected = useHero((s) => s.selected);
  const sheets = useMemo(
    () =>
      (mobile
        ? [
            { z: -1.2, y: 0.9, o: 0.28 },
            { z: 1.0, y: 0.45, o: 0.22 },
          ]
        : [
            { z: -1.8, y: 1.1, o: 0.3 },
            { z: -0.8, y: 0.7, o: 0.22 },
            { z: 0.4, y: 0.5, o: 0.18 },
            { z: 1.2, y: 0.35, o: 0.22 },
            { z: 2.0, y: 0.2, o: 0.15 },
          ]
      ).map((s, i) => ({
        ...s,
        mat: new THREE.ShaderMaterial({
          vertexShader: fogVert,
          fragmentShader: fogFrag,
          transparent: true,
          depthWrite: false,
          uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: s.o },
            uPart: { value: 0 },
            uPartX: { value: 0.5 },
            uSeed: { value: i * 3.7 },
            uColor: { value: new THREE.Color("#b9b3a8") },
          },
        }),
      })),
    [mobile],
  );
  useEffect(() => () => sheets.forEach((s) => s.mat.dispose()), [sheets]);
  const part = useRef(0);
  useFrame((_, dt) => {
    part.current += ((selected ? 1 : 0) - part.current) * (1 - Math.exp(-dt * 3));
    for (const s of sheets) {
      if (motion) s.mat.uniforms.uTime.value += dt;
      s.mat.uniforms.uPart.value = part.current;
      s.mat.uniforms.uPartX.value = selected === "uvi" ? 0.42 : selected === "ruvi" ? 0.58 : 0.5;
    }
  });
  return (
    <group>
      {sheets.map((s, i) => (
        <mesh key={i} position={[0, s.y, s.z]} material={s.mat} renderOrder={5 + i}>
          <planeGeometry args={[12, 2.6]} />
        </mesh>
      ))}
    </group>
  );
}

const wallVert = fogVert;
const wallFrag = /* glsl */ `
uniform sampler2D uText; uniform float uFlash; uniform vec2 uPointer; uniform float uRadius;
varying vec2 vUv;
void main(){
  vec4 t = texture2D(uText, vUv);
  float L = 1.0 - smoothstep(uRadius * 0.35, uRadius, distance(gl_FragCoord.xy, uPointer));
  gl_FragColor = vec4(t.rgb, t.a * L * uFlash);
}`;

function makeWallTexture() {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, c.width, c.height);
  const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-special-elite").trim() || "serif";
  // seeded scratches
  let seed = 31;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ctx.strokeStyle = "rgba(220,205,185,0.35)";
  for (let i = 0; i < 140; i++) {
    const x = rnd() * c.width;
    const y = rnd() * c.height;
    ctx.lineWidth = 0.5 + rnd() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rnd() - 0.5) * 120, y + (rnd() - 0.2) * 60);
    ctx.stroke();
  }
  // tally marks
  for (let g = 0; g < 4; g++) {
    const x0 = 180 + g * 70;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(x0 + k * 12, 420);
      ctx.lineTo(x0 + k * 12 + 4, 480);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x0 - 8, 470);
    ctx.lineTo(x0 + 52, 425);
    ctx.stroke();
  }
  ctx.font = `120px ${fam}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // scratched, multi-pass text
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(${200 + i * 6},${170 - i * 10},${150 - i * 12},${0.16 + i * 0.05})`;
    ctx.fillText(site.wallText, c.width / 2 + (rnd() - 0.5) * 6, c.height / 2 + (rnd() - 0.5) * 6);
  }
  ctx.strokeStyle = "rgba(120,20,15,0.6)";
  ctx.lineWidth = 2;
  ctx.strokeText(site.wallText, c.width / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Environment({ flashlight }: { flashlight: boolean }) {
  const { size, gl } = useThree();
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: wallVert,
        fragmentShader: wallFrag,
        transparent: true,
        depthWrite: false,
        uniforms: { uText: { value: makeWallTexture() }, uFlash: { value: 0 }, uPointer: { value: new THREE.Vector2() }, uRadius: { value: 200 } },
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(() => {
    const dpr = gl.getPixelRatio();
    mat.uniforms.uFlash.value += ((flashlight ? 1 : 0) - mat.uniforms.uFlash.value) * 0.1;
    mat.uniforms.uPointer.value.set(heroPointer.px * dpr, (size.height - heroPointer.py) * dpr);
    mat.uniforms.uRadius.value = Math.min(size.width, size.height) * 0.3 * dpr;
  });
  return (
    <group>
      <mesh position={[0, 2.2, -2.6]} receiveShadow>
        <planeGeometry args={[14, 6]} />
        <meshStandardMaterial color="#1b1816" roughness={1} />
      </mesh>
      <mesh position={[0, 2.35, -2.58]} material={mat}>
        <planeGeometry args={[6.4, 1.6]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#12100e" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Flashlight({ on }: { on: boolean }) {
  const light = useRef<THREE.SpotLight>(null);
  const { camera, scene } = useThree();
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);
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
    l.intensity += ((on ? 60 : 0) - l.intensity) * 0.15;
    ndc.set(heroPointer.x, heroPointer.y);
    ray.setFromCamera(ndc, camera);
    l.position.copy(camera.position);
    l.target.position.copy(camera.position).addScaledVector(ray.ray.direction, 6);
    l.target.updateMatrixWorld();
  });
  return <spotLight ref={light} angle={0.16} penumbra={0.7} distance={14} decay={1.4} color="#fff3dc" intensity={0} />;
}

/** Keeps both figures in frame at any aspect (they zoom out on phones). */
function FitCamera({ halfWidth }: { halfWidth: number }) {
  const { camera, size } = useThree();
  const selected = useHero((s) => s.selected);
  const target = useMemo(() => new THREE.Vector3(0, 1.05, 0), []);
  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const halfV = THREE.MathUtils.degToRad(cam.fov / 2);
    const halfH = Math.atan(Math.tan(halfV) * aspect);
    const dist = Math.max(1.3 / Math.tan(halfV), halfWidth / Math.tan(halfH)) + 0.6;
    const want = selected ? dist * 0.82 : dist;
    const z = cam.position.z + (want - cam.position.z) * (1 - Math.exp(-dt * 2.5));
    cam.position.set(0, 1.25, z);
    cam.lookAt(target);
  });
  return null;
}

/** Positions the DOM name plates under each figure. */
function PlateProjector({ plates, positions }: { plates: HeroSceneProps["plates"]; positions: Record<CharacterId, [number, number, number]> }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const els = plates.current;
    if (!els) return;
    for (const id of ["uvi", "ruvi"] as CharacterId[]) {
      const el = els[id];
      if (!el) continue;
      const p = positions[id];
      v.set(p[0], p[1] - 0.05, p[2] + 0.2).project(camera);
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      el.style.left = "0px";
      el.style.top = "0px";
      el.style.bottom = "auto";
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${Math.min(y, size.height - 70).toFixed(1)}px, 0) translate(-50%, 0)`;
    }
  });
  return null;
}

function SceneLights({ flashlight }: { flashlight: boolean }) {
  const amb = useRef<THREE.AmbientLight>(null);
  useFrame(() => {
    if (amb.current) amb.current.intensity += ((flashlight ? 0.01 : 0.18) - amb.current.intensity) * 0.1;
  });
  return (
    <>
      <ambientLight ref={amb} intensity={0.18} color="#c9c4ba" />
      <directionalLight position={[0, 6, 4]} intensity={flashlight ? 0 : 0.25} color="#a9b0c4" />
    </>
  );
}

function Figure({ id, asset, ...rest }: FigureProps & { asset: HeroAsset }) {
  switch (asset.kind) {
    case "glb":
      return <GlbFigure id={id} url={asset.url} {...rest} />;
    case "frames":
      return <SheetFigure id={id} urls={asset.urls} {...rest} />;
    case "sheet":
      return <SheetFigure id={id} urls={[asset.url]} {...rest} />;
    default:
      return id === "uvi" ? <LanternWarden id={id} {...rest} /> : <MothWidow id={id} {...rest} />;
  }
}

/** Signals readiness once the figures (and their textures) have rendered a frame. */
function Ready({ onReady }: { onReady?: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady?.();
  });
  return null;
}

export default function HeroScene({ assets, motion, mobile, flashlight, onSelect, plates, onReady }: HeroSceneProps) {
  // Desktop: the figures stand centre-stage between the title column and the info panel.
  const spread = mobile ? 0.62 : 0.58;
  const positions: Record<CharacterId, [number, number, number]> = {
    uvi: [-spread, 0, 0],
    ruvi: [spread, 0, 0],
  };

  useEffect(() => {
    for (const id of ["uvi", "ruvi"] as CharacterId[]) {
      const a = assets[id];
      if (a.kind === "sheet") useTexture.preload(a.url);
      if (a.kind === "frames") a.urls.forEach((u) => useTexture.preload(u));
      if (a.kind === "glb") useGLTF.preload(a.url);
    }
  }, [assets]);

  return (
    <Canvas
      dpr={[1, mobile ? 1.4 : 1.8]}
      gl={{ antialias: !mobile, powerPreference: "high-performance" }}
      camera={{ fov: 38, near: 0.1, far: 60, position: [0, 1.25, 7] }}
      onCreated={({ gl, scene }) => {
        gl.domElement.style.touchAction = "pan-y";
        scene.fog = new THREE.FogExp2("#0e0d0c", 0.075);
      }}
      aria-hidden="true"
    >
      <color attach="background" args={["#0e0d0c"]} />
      <SceneLights flashlight={flashlight} />
      <Flashlight on={flashlight} />
      <Environment flashlight={flashlight} />
      <Suspense fallback={null}>
        {(["uvi", "ruvi"] as CharacterId[]).map((id) => (
          <Figure
            key={id}
            id={id}
            asset={assets[id]}
            position={positions[id]}
            motion={motion}
            mobile={mobile}
            flashlight={flashlight}
            lightColor={heroFigures[id].light}
            rim={heroFigures[id].rim}
            onSelect={onSelect}
          />
        ))}
        <Ready onReady={onReady} />
      </Suspense>
      <FogSheets motion={motion} mobile={mobile} />
      <FitCamera halfWidth={mobile ? spread + 0.55 : (spread + 0.55) * 2.1} />
      <PlateProjector plates={plates} positions={positions} />
      {!mobile ? (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.65} luminanceThreshold={0.55} luminanceSmoothing={0.2} mipmapBlur />
          <Noise opacity={motion ? 0.07 : 0.04} />
          <ChromaticAberration offset={new THREE.Vector2(0.0006, 0.0004)} radialModulation={false} modulationOffset={0} />
          <Vignette offset={0.2} darkness={0.85} />
        </EffectComposer>
      ) : (
        <EffectComposer multisampling={0}>
          <Vignette offset={0.25} darkness={0.8} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
