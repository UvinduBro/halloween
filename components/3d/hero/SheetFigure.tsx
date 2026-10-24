"use client";

import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { autoTurnOrder, heroFigures } from "@/data/site";
import { heroPointer } from "@/lib/heroState";
import { useFigureBehaviour, useLightFlicker, usePointerHandlers, type FigureProps } from "./common";

const vert = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const frag = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform float uOffA;
uniform float uOffB;
uniform float uRepeat;
uniform float uMix;
uniform vec3 uKeyA; uniform vec3 uKeyA2;
uniform vec3 uKeyB; uniform vec3 uKeyB2;
uniform float uUseAlpha;
uniform float uKeyStrength;
uniform float uFlicker;
uniform float uFlare;
uniform vec3 uRim;
uniform float uFlash;
uniform vec2 uPointer;
uniform float uRadius;
uniform float uFade;
uniform vec2 uTexel;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }

vec4 frame(sampler2D t, float off, vec2 uv, vec3 k1, vec3 k2) {
  vec2 suv = vec2(off + clamp(uv.x, 0.002, 0.998) * uRepeat, uv.y);
  vec4 c = texture2D(t, suv);
  float a = c.a;
  if (uUseAlpha < 0.5) {
    // key out the soft gradient background: colour distance and luminance against the sampled corners
    float d = min(distance(c.rgb, k1), distance(c.rgb, k2));
    float lum = abs(dot(c.rgb, vec3(0.299, 0.587, 0.114)) - dot(k1, vec3(0.299, 0.587, 0.114)));
    float lo = 0.05 + 0.12 * uKeyStrength;
    a = smoothstep(lo, lo + 0.12, max(d, lum * 1.4));
    // radial feather so the figure melts into the fog
    a *= 1.0 - smoothstep(0.78, 1.0, length((uv - 0.5) * vec2(1.7, 2.05)));
  }
  // feather the frame borders
  a *= smoothstep(0.0, 0.03, uv.x) * smoothstep(1.0, 0.97, uv.x) * smoothstep(0.0, 0.02, uv.y) * smoothstep(1.0, 0.98, uv.y);
  return vec4(c.rgb, a);
}

float alphaAt(vec2 uv) {
  vec4 a = frame(uTexA, uOffA, uv, uKeyA, uKeyA2);
  vec4 b = frame(uTexB, uOffB, uv, uKeyB, uKeyB2);
  return mix(a.a, b.a, uMix);
}

void main() {
  vec4 A = frame(uTexA, uOffA, vUv, uKeyA, uKeyA2);
  vec4 B = frame(uTexB, uOffB, vUv, uKeyB, uKeyB2);
  float n = noise(vUv * vec2(18.0, 42.0));
  // dissolve-noise crossfade (simple fade on mobile)
  float t = uFade > 0.5 ? uMix : (uMix <= 0.0 ? 0.0 : (uMix >= 1.0 ? 1.0 : step(n, uMix)));
  vec4 c = mix(A, B, t);
  // ember edge on the dissolve boundary
  float edge = (uFade < 0.5 && uMix > 0.0 && uMix < 1.0) ? (1.0 - smoothstep(0.0, 0.05, abs(n - uMix))) : 0.0;

  // rim light: additive edge glow from the alpha
  float s = 3.0;
  float an = min(min(alphaAt(vUv + vec2(uTexel.x * s, 0.0)), alphaAt(vUv - vec2(uTexel.x * s, 0.0))),
                 min(alphaAt(vUv + vec2(0.0, uTexel.y * s)), alphaAt(vUv - vec2(0.0, uTexel.y * s))));
  float rim = clamp(c.a - an, 0.0, 1.0);

  vec3 col = c.rgb * uFlicker * (0.85 + 0.35 * uFlare);
  col += uRim * rim * (0.9 + 1.6 * uFlare);
  col += vec3(1.0, 0.45, 0.15) * edge * 1.5;

  if (uFlash > 0.5) {
    float L = 1.0 - smoothstep(uRadius * 0.45, uRadius, distance(gl_FragCoord.xy, uPointer));
    col *= L * 1.3 + 0.015;
  }
  gl_FragColor = vec4(col, c.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

/** Sample two background colours (corner and mid-left edge) of each frame, and detect real alpha. */
function analyse(images: HTMLImageElement[], frames: number) {
  const out: { keys: [THREE.Color, THREE.Color][]; useAlpha: boolean } = { keys: [], useAlpha: false };
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { keys: Array.from({ length: 4 }, () => [new THREE.Color(0.2, 0.15, 0.12), new THREE.Color(0.3, 0.22, 0.18)] as [THREE.Color, THREE.Color]), useAlpha: true };
  let transparentCorners = 0;
  for (let f = 0; f < 4; f++) {
    const img = images.length === 4 ? images[f] : images[0];
    const fw = img.naturalWidth / (images.length === 4 ? 1 : frames);
    const x0 = images.length === 4 ? 0 : f * fw;
    const h = img.naturalHeight;
    cv.width = 8;
    cv.height = 8;
    const sample = (sx: number, sy: number) => {
      ctx.clearRect(0, 0, 8, 8);
      ctx.drawImage(img, sx, sy, 4, 4, 0, 0, 4, 4);
      const d = ctx.getImageData(1, 1, 1, 1).data;
      return d;
    };
    const c1 = sample(x0 + fw * 0.03, h * 0.03);
    const c2 = sample(x0 + fw * 0.05, h * 0.5);
    if (c1[3] < 128) transparentCorners++;
    out.keys.push([new THREE.Color(c1[0] / 255, c1[1] / 255, c1[2] / 255), new THREE.Color(c2[0] / 255, c2[1] / 255, c2[2] / 255)]);
  }
  out.useAlpha = transparentCorners >= 3;
  return out;
}

export function SheetFigure({
  id,
  position,
  motion,
  mobile,
  flashlight,
  lightColor,
  rim,
  onSelect,
  urls,
}: FigureProps & { urls: string[] }) {
  const textures = useTexture(urls);
  const { size, gl } = useThree();
  const separate = urls.length === 4;
  const cfg = heroFigures[id];

  const info = useMemo(() => {
    for (const t of textures) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      t.needsUpdate = true;
    }
    const imgs = textures.map((t) => t.image as HTMLImageElement);
    const a = analyse(imgs, 4);
    const img = imgs[0];
    const frameW = separate ? img.naturalWidth : img.naturalWidth / 4;
    return { ...a, aspect: frameW / img.naturalHeight, texel: [1 / frameW, 1 / img.naturalHeight] as [number, number] };
  }, [textures, separate]);

  const uniforms = useMemo(
    () =>
      THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTexA: { value: null },
          uTexB: { value: null },
          uOffA: { value: 0 },
          uOffB: { value: 0 },
          uRepeat: { value: 1 },
          uMix: { value: 0 },
          uKeyA: { value: new THREE.Color() },
          uKeyA2: { value: new THREE.Color() },
          uKeyB: { value: new THREE.Color() },
          uKeyB2: { value: new THREE.Color() },
          uUseAlpha: { value: 1 },
          uKeyStrength: { value: cfg.keyStrength },
          uFlicker: { value: 1 },
          uFlare: { value: 0 },
          uRim: { value: new THREE.Color(rim) },
          uFlash: { value: 0 },
          uPointer: { value: new THREE.Vector2() },
          uRadius: { value: 220 },
          uFade: { value: 0 },
          uTexel: { value: new THREE.Vector2() },
        },
      ]),
    [cfg.keyStrength, rim],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        fog: true,
      }),
    [uniforms],
  );
  useEffect(() => () => material.dispose(), [material]);

  // turntable state
  const tt = useRef({ cur: 0, next: 0, mix: 0, hold: 0, dragX: null as number | null, dragAcc: 0, hoverIdx: -1 });
  const setFrames = () => {
    const s = tt.current;
    const texFor = (i: number) => (separate ? textures[i] : textures[0]);
    uniforms.uTexA.value = texFor(s.cur);
    uniforms.uTexB.value = texFor(s.next);
    uniforms.uOffA.value = separate ? 0 : s.cur / 4;
    uniforms.uOffB.value = separate ? 0 : s.next / 4;
    uniforms.uRepeat.value = separate ? 1 : 0.25;
    uniforms.uKeyA.value.copy(info.keys[s.cur][0]);
    uniforms.uKeyA2.value.copy(info.keys[s.cur][1]);
    uniforms.uKeyB.value.copy(info.keys[s.next][0]);
    uniforms.uKeyB2.value.copy(info.keys[s.next][1]);
  };
  const goTo = (idx: number) => {
    const s = tt.current;
    if (idx === s.next && s.mix > 0) return;
    if (s.mix > 0 && s.mix < 1) s.cur = s.next;
    if (idx === s.cur) {
      s.mix = 0;
      s.next = s.cur;
      return;
    }
    s.next = idx;
    s.mix = 0.0001;
    s.hold = 0;
  };
  const stepBy = (dir: number) => {
    const s = tt.current;
    const base = s.mix > 0 ? s.next : s.cur;
    const i = autoTurnOrder.indexOf(base);
    goTo(autoTurnOrder[(i + dir + autoTurnOrder.length) % autoTurnOrder.length]);
  };

  const { update } = useFigureBehaviour(id, motion);
  const flicker = useLightFlicker(motion, id === "uvi" ? 11 : 47);
  const handlers = usePointerHandlers(id, onSelect);
  const group = useRef<THREE.Group>(null);
  const plane = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const jitter = useRef({ at: id === "uvi" ? 5 : 7, frames: 0 });
  const time = useRef(0);

  const H = 2.05;
  const W = H * info.aspect;

  useFrame((_, dt) => {
    time.current += dt;
    const t = time.current;
    const b = update(t, dt);
    const s = tt.current;

    // selection: jump to the front frame
    if (b.selected && (s.mix > 0 ? s.next : s.cur) !== 0) goTo(0);

    // auto-turn at rest: front → side → back → other side, 3 s pause on each
    if (!b.selected && s.dragX === null && s.hoverIdx < 0 && motion) {
      s.hold += dt;
      if (s.mix === 0 && s.hold > 3) stepBy(1);
    }
    if (s.mix > 0) {
      s.mix = Math.min(1, s.mix + dt / (mobile ? 0.35 : 0.6));
      if (s.mix >= 1) {
        s.cur = s.next;
        s.mix = 0;
        s.hold = 0;
      }
    }
    setFrames();
    uniforms.uMix.value = s.mix;
    uniforms.uFade.value = mobile ? 1 : 0;
    uniforms.uTexel.value.set(info.texel[0], info.texel[1]);
    uniforms.uUseAlpha.value = info.useAlpha ? 1 : 0;

    const fl = flicker(t, b.flare);
    uniforms.uFlicker.value = flashlight ? 1 : Math.min(1.25, 0.75 + fl * 0.25);
    uniforms.uFlare.value = b.flare;
    uniforms.uFlash.value = flashlight ? 1 : 0;
    const dpr = gl.getPixelRatio();
    uniforms.uPointer.value.set(heroPointer.px * dpr, (size.height - heroPointer.py) * dpr);
    uniforms.uRadius.value = Math.min(size.width, size.height) * 0.28 * dpr;

    if (group.current) {
      // fake depth: tilt toward the cursor (±8°), breathing, occasional jitter
      group.current.rotation.y = THREE.MathUtils.degToRad(8) * THREE.MathUtils.clamp(heroPointer.x, -1, 1) * (1 - b.step);
      group.current.rotation.x = THREE.MathUtils.degToRad(-3) * THREE.MathUtils.clamp(heroPointer.y, -1, 1) * (1 - b.step);
      const sc = 1 + 0.08 * b.step;
      group.current.scale.set(sc, sc * (1 + 0.008 * b.breath), sc);
      group.current.position.set(position[0], position[1], position[2] + 0.5 * b.step);
      const j = jitter.current;
      if (motion && t > j.at) {
        j.frames = 2;
        j.at = t + 5 + Math.random() * 7;
      }
      if (j.frames > 0) {
        group.current.position.x += (Math.random() - 0.5) * 0.05;
        j.frames--;
      }
    }
    if (glow.current) (glow.current.material as THREE.MeshBasicMaterial).opacity = (0.22 + 0.25 * b.flare) * (flashlight ? 0.2 : 1) * fl;
    if (light.current) light.current.intensity = flashlight ? 0 : (3 + 6 * b.flare) * fl;
  });

  const glowTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    return t;
  }, []);

  return (
    <group ref={group} position={position}>
      {!mobile && (
        <mesh ref={glow} position={[0, H * 0.55, -0.35]} scale={[W * 2.2, H * 1.3, 1]}>
          <planeGeometry />
          <meshBasicMaterial map={glowTex} color={rim} transparent opacity={0.25} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </mesh>
      )}
      <mesh
        ref={plane}
        position={[0, H / 2, 0]}
        material={material}
        {...handlers}
        onPointerDown={(e) => {
          tt.current.dragX = e.clientX;
          tt.current.dragAcc = 0;
        }}
        onPointerUp={() => {
          tt.current.dragX = null;
        }}
        onPointerMove={(e) => {
          const s = tt.current;
          if (s.dragX !== null && e.buttons) {
            s.dragAcc += e.clientX - s.dragX;
            s.dragX = e.clientX;
            if (Math.abs(s.dragAcc) > 45) {
              stepBy(s.dragAcc > 0 ? 1 : -1);
              s.dragAcc = 0;
            }
            return;
          }
          // desktop: cursor x across the figure drives the angle while hovering
          if (!mobile && e.uv) {
            const x = e.uv.x;
            const idx = x < 0.33 ? 2 : x > 0.67 ? 1 : 0;
            if (idx !== s.hoverIdx) {
              s.hoverIdx = idx;
              goTo(idx);
            }
          }
        }}
        onPointerLeave={() => {
          tt.current.hoverIdx = -1;
          tt.current.dragX = null;
        }}
      >
        <planeGeometry args={[W, H]} />
      </mesh>
      <pointLight ref={light} position={[0.3, H * 0.7, 0.6]} color={lightColor} distance={5} decay={1.6} />
    </group>
  );
}
