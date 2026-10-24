"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { heroPointer } from "@/lib/heroState";
import { useFigureBehaviour, useLightFlicker, usePointerHandlers, type FigureProps } from "./common";

/* ------------------------------------------------------------------ */
/* Cloth material: vertex-shader sway, stronger towards the hem         */
/* ------------------------------------------------------------------ */

function useClothMaterial(color: string, opts: { top?: number; amp?: number; roughness?: number } = {}) {
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uAmp: { value: opts.amp ?? 0.05 }, uTop: { value: opts.top ?? 1.6 } }), [opts.amp, opts.top]);
  const mat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.95, side: THREE.DoubleSide });
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime; uniform float uAmp; uniform float uTop;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float hgt = clamp((uTop - position.y) / uTop, 0.0, 1.0);
          float k = hgt * hgt * uAmp;
          transformed.x += sin(uTime * 1.3 + position.y * 3.0 + position.z * 4.0) * k;
          transformed.z += cos(uTime * 1.1 + position.y * 2.3 + position.x * 5.0) * k * 0.7;`,
        );
    };
    m.customProgramCacheKey = () => "cloth-v1";
    return m;
  }, [color, uniforms, opts.roughness]);
  useEffect(() => () => mat.dispose(), [mat]);
  return { mat, uniforms };
}

function latheGeometry(profile: [number, number][], segments: number, opts: { hunch?: number; fray?: number; depth?: number }) {
  const g = new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i) * (opts.depth ?? 0.78);
    if (opts.fray && y < 0.06) {
      const a = Math.atan2(z, x);
      y += Math.abs(Math.sin(a * 23) * Math.cos(a * 7)) * opts.fray;
    }
    if (opts.hunch && y > 1.0) z += Math.pow(y - 1.0, 2) * opts.hunch;
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

const porcelain = new THREE.MeshStandardMaterial({ color: "#e8e3d8", roughness: 0.28, metalness: 0.05 });
const crackMat = new THREE.MeshBasicMaterial({ color: "#1a1410" });
const ironMat = new THREE.MeshStandardMaterial({ color: "#3a2a20", roughness: 0.7, metalness: 0.6 });
const rustMat = new THREE.MeshStandardMaterial({ color: "#6b3418", roughness: 0.9, metalness: 0.3 });
const skinMat = new THREE.MeshStandardMaterial({ color: "#8f8577", roughness: 0.9 });

/* ------------------------------------------------------------------ */
/* UVI — The Lantern Warden                                            */
/* ------------------------------------------------------------------ */

export function LanternWarden({ id, position, motion, mobile, flashlight, lightColor, onSelect }: FigureProps) {
  const { update } = useFigureBehaviour(id, motion);
  const flicker = useLightFlicker(motion, id === "uvi" ? 11 : 47);
  const handlers = usePointerHandlers(id, onSelect);
  const coat = useClothMaterial("#26231f", { top: 1.6, amp: 0.045 });
  const hood = useClothMaterial("#1d1b18", { top: 2.1, amp: 0.012 });
  const slitMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ff7a2a", emissive: "#ff6a1a", emissiveIntensity: 3 }), []);
  const flameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#ffb35c", emissive: "#ff9a3c", emissiveIntensity: 4 }), []);

  const geos = useMemo(
    () => ({
      coat: latheGeometry(
        [
          [0.0, -0.02],
          [0.44, 0.0],
          [0.38, 0.3],
          [0.31, 0.8],
          [0.27, 1.1],
          [0.31, 1.38],
          [0.36, 1.5],
          [0.2, 1.6],
          [0.09, 1.66],
        ],
        mobile ? 18 : 30,
        { hunch: 0.7, fray: 0.14, depth: 0.72 },
      ),
      chainLink: new THREE.TorusGeometry(0.018, 0.005, 6, 12),
    }),
    [mobile],
  );

  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const swing = useRef<THREE.Group>(null);
  const lantern = useRef<THREE.PointLight>(null);
  const t0 = useRef(0);

  useFrame((_, dt) => {
    t0.current += dt;
    const t = t0.current;
    const b = update(t, dt);
    if (motion) {
      coat.uniforms.uTime.value = t;
      hood.uniforms.uTime.value = t;
    }
    if (root.current) {
      root.current.position.set(position[0], position[1], position[2] + 0.55 * b.step);
      root.current.rotation.y = -0.15 * (1 - b.step);
    }
    if (torso.current) torso.current.scale.set(1 + 0.012 * b.breath, 1, 1 + 0.02 * b.breath);
    if (head.current) {
      head.current.rotation.set(b.pitch + 0.25 * (1 - b.step), b.yaw + 0.15 * (1 - b.step), b.roll * 0.4);
    }
    if (swing.current) {
      swing.current.rotation.z = motion ? Math.sin(t * 1.1) * 0.22 : 0;
      swing.current.rotation.x = motion ? Math.sin(t * 0.8 + 1) * 0.08 : 0;
    }
    const f = flicker(t, b.flare);
    if (lantern.current) lantern.current.intensity = flashlight ? 0.15 : 4 * f;
    flameMat.emissiveIntensity = flashlight ? 0.6 : 3 * f;
    slitMat.emissiveIntensity = (flashlight ? 1 : 2.2) * (0.8 + b.flare * 1.5) * (motion ? 0.9 + 0.1 * Math.sin(t * 20) : 1);
  });

  return (
    <group ref={root} position={position} {...handlers}>
      <group ref={torso}>
        <mesh geometry={geos.coat} material={coat.mat} castShadow />
        {/* heavy shoulders hunched forward */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.27, 1.5, 0.12]} scale={[0.15, 0.1, 0.14]} material={coat.mat}>
            <sphereGeometry args={[1, 14, 10]} />
          </mesh>
        ))}
        {/* left arm, hanging */}
        <mesh position={[-0.36, 1.12, 0.1]} rotation={[0.1, 0, 0.12]} material={coat.mat}>
          <cylinderGeometry args={[0.07, 0.09, 0.75, 10]} />
        </mesh>
        <mesh position={[-0.4, 0.72, 0.12]} scale={[0.05, 0.08, 0.04]} material={skinMat}>
          <sphereGeometry args={[1, 10, 8]} />
        </mesh>
        {/* right arm, forward, holding the chain */}
        <mesh position={[0.36, 1.25, 0.28]} rotation={[0.9, 0, -0.15]} material={coat.mat}>
          <cylinderGeometry args={[0.065, 0.085, 0.6, 10]} />
        </mesh>
        <group position={[0.4, 1.02, 0.5]}>
          <mesh scale={[0.05, 0.06, 0.05]} material={skinMat}>
            <sphereGeometry args={[1, 10, 8]} />
          </mesh>
          <group ref={swing}>
            {Array.from({ length: 9 }, (_, i) => (
              <mesh key={i} geometry={geos.chainLink} position={[0, -0.03 - i * 0.032, 0]} rotation={[0, i % 2 ? Math.PI / 2 : 0, Math.PI / 2]} material={rustMat} />
            ))}
            {/* old iron lantern */}
            <group position={[0, -0.42, 0]}>
              <mesh position={[0, 0.11, 0]} material={ironMat}>
                <coneGeometry args={[0.08, 0.06, 4]} />
              </mesh>
              <mesh position={[0, -0.09, 0]} material={ironMat}>
                <boxGeometry args={[0.12, 0.02, 0.12]} />
              </mesh>
              {[
                [-1, -1],
                [-1, 1],
                [1, -1],
                [1, 1],
              ].map(([x, z]) => (
                <mesh key={`${x}${z}`} position={[x * 0.055, 0, z * 0.055]} material={ironMat}>
                  <boxGeometry args={[0.012, 0.18, 0.012]} />
                </mesh>
              ))}
              <mesh material={flameMat}>
                <sphereGeometry args={[0.035, 12, 10]} />
              </mesh>
              <pointLight ref={lantern} color={lightColor} distance={6} decay={1.5} intensity={4} />
            </group>
          </group>
        </group>
      </group>

      {/* deep hood with a cracked porcelain face plate */}
      <group ref={head} position={[0, 1.74, 0.2]}>
        {/* the opening of the hood faces forward (+z) */}
        <mesh material={hood.mat}>
          <sphereGeometry args={[0.18, 18, 14, Math.PI / 2 + 0.75, Math.PI * 2 - 1.5, 0, Math.PI * 0.82]} />
        </mesh>
        <mesh position={[0, -0.14, -0.02]} material={hood.mat}>
          <coneGeometry args={[0.22, 0.2, 16, 1, true]} />
        </mesh>
        <group position={[0, -0.02, 0.06]}>
          <mesh scale={[0.1, 0.13, 0.05]} material={porcelain}>
            <sphereGeometry args={[1, 20, 16]} />
          </mesh>
          {/* the single glowing slit */}
          <mesh position={[0, 0.02, 0.05]} material={slitMat}>
            <boxGeometry args={[0.1, 0.008, 0.01]} />
          </mesh>
          {/* cracks */}
          <mesh position={[0.03, 0.06, 0.045]} rotation={[0, 0, 0.9]} material={crackMat}>
            <boxGeometry args={[0.05, 0.002, 0.004]} />
          </mesh>
          <mesh position={[-0.035, -0.05, 0.045]} rotation={[0, 0, -0.5]} material={crackMat}>
            <boxGeometry args={[0.06, 0.002, 0.004]} />
          </mesh>
          <mesh position={[0.045, -0.02, 0.04]} rotation={[0, 0, 1.8]} material={crackMat}>
            <boxGeometry args={[0.035, 0.002, 0.004]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* RUVI — The Moth Widow                                               */
/* ------------------------------------------------------------------ */

function wingShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.08, 0.05, 0.22, 0.2, 0.2, 0.3);
  s.bezierCurveTo(0.16, 0.36, 0.06, 0.25, 0.02, 0.12);
  s.bezierCurveTo(0.1, 0.1, 0.16, 0.02, 0.12, -0.05);
  s.bezierCurveTo(0.08, -0.08, 0.02, -0.03, 0, 0);
  return new THREE.ShapeGeometry(s, 12);
}

export function MothWidow({ id, position, motion, mobile, flashlight, lightColor, onSelect }: FigureProps) {
  const { update } = useFigureBehaviour(id, motion);
  const flicker = useLightFlicker(motion, id === "uvi" ? 11 : 47);
  const handlers = usePointerHandlers(id, onSelect);
  const gown = useClothMaterial("#57534d", { top: 1.5, amp: 0.035 });
  const wingMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d9d2bd", roughness: 0.8, transparent: true, opacity: 0.85, side: THREE.DoubleSide }), []);
  const flameMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#fff1c4", emissive: "#ffd27a", emissiveIntensity: 4, transparent: true, opacity: 0.95 }), []);
  const candleMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#e9e1d0", roughness: 0.6 }), []);

  const geos = useMemo(() => {
    const gownGeo = latheGeometry(
      [
        [0.0, -0.02],
        [0.5, 0.0],
        [0.37, 0.25],
        [0.24, 0.72],
        [0.16, 1.02],
        [0.19, 1.25],
        [0.18, 1.42],
        [0.09, 1.5],
        [0.075, 1.52],
      ],
      mobile ? 20 : 34,
      { fray: 0.1, depth: 0.82 },
    );
    // curtain of hanging black threads over the face
    const threads: number[] = [];
    const count = mobile ? 45 : 90;
    for (let i = 0; i < count; i++) {
      const a = -Math.PI * 0.85 + (i / (count - 1)) * Math.PI * 1.7 + Math.PI / 2;
      const r = 0.115 + (i % 3) * 0.004;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r * 0.95;
      const len = 0.24 + ((i * 7919) % 13) / 100;
      threads.push(x, 0.1, z, x * 1.05, 0.1 - len, z * 1.08);
    }
    const threadGeo = new THREE.BufferGeometry();
    threadGeo.setAttribute("position", new THREE.Float32BufferAttribute(threads, 3));
    return { gownGeo, threadGeo, wing: wingShape() };
  }, [mobile]);

  const threadMat = useMemo(() => {
    const m = new THREE.LineBasicMaterial({ color: "#050505" });
    return m;
  }, []);

  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const flame = useRef<THREE.Group>(null);
  const candle = useRef<THREE.PointLight>(null);
  const wings = useRef<THREE.Group>(null);
  const moths = useRef<THREE.Group>(null);
  const threads = useRef<THREE.LineSegments>(null);
  const t0 = useRef(0);
  const mothCount = mobile ? 3 : 7;

  useFrame((_, dt) => {
    t0.current += dt;
    const t = t0.current;
    const b = update(t, dt);
    if (motion) gown.uniforms.uTime.value = t;
    if (root.current) {
      root.current.position.set(position[0], position[1], position[2] + 0.55 * b.step);
      root.current.rotation.y = 0.15 * (1 - b.step);
    }
    if (torso.current) torso.current.scale.set(1 + 0.01 * b.breath, 1, 1 + 0.018 * b.breath);
    if (head.current) head.current.rotation.set(b.pitch + 0.08, b.yaw - 0.1 * (1 - b.step), b.roll * 0.5 - 0.12 * (1 - b.step));
    if (threads.current && motion) threads.current.rotation.y = Math.sin(t * 0.9) * 0.04;
    if (wings.current) wings.current.rotation.x = motion ? Math.sin(t * 0.7) * 0.06 : 0;
    // flame bends toward the cursor
    if (flame.current) {
      flame.current.rotation.z = THREE.MathUtils.clamp(-heroPointer.x * 0.5, -0.5, 0.5) + (motion ? Math.sin(t * 11) * 0.05 : 0);
      flame.current.rotation.x = THREE.MathUtils.clamp(heroPointer.y * 0.3, -0.3, 0.3);
      const fs = motion ? 1 + Math.sin(t * 17) * 0.1 : 1;
      flame.current.scale.set(1, fs * (1 + b.flare * 0.4), 1);
    }
    const f = flicker(t, b.flare);
    if (candle.current) candle.current.intensity = flashlight ? 0.12 : 2.6 * f;
    flameMat.emissiveIntensity = flashlight ? 0.5 : 3 * f;
    if (moths.current) {
      moths.current.children.forEach((m, i) => {
        const a = (motion ? t * (0.35 + i * 0.05) : 0) + (i / mothCount) * Math.PI * 2;
        const r = 0.35 + 0.08 * Math.sin(a * 1.7 + i);
        m.position.set(Math.cos(a) * r, 1.6 + Math.sin(a * 2.3 + i) * 0.25, Math.sin(a) * r);
        m.rotation.y = -a;
        const flap = motion ? Math.abs(Math.sin(t * 18 + i)) : 0.6;
        m.scale.set(0.3 + flap * 0.7, 1, 1);
      });
    }
  });

  return (
    <group ref={root} position={position} {...handlers}>
      <group ref={torso}>
        <mesh geometry={geos.gownGeo} material={gown.mat} castShadow />
        {/* high collar */}
        <mesh position={[0, 1.57, 0]} material={gown.mat}>
          <cylinderGeometry args={[0.085, 0.07, 0.12, 16, 1, true]} />
        </mesh>
        {/* slender arms; the right one holds the candle */}
        <mesh position={[-0.22, 1.12, 0.02]} rotation={[0.05, 0, 0.08]} material={gown.mat}>
          <cylinderGeometry args={[0.045, 0.06, 0.62, 10]} />
        </mesh>
        <mesh position={[0.17, 1.22, 0.14]} rotation={[1.0, 0, -0.35]} material={gown.mat}>
          <cylinderGeometry args={[0.042, 0.055, 0.42, 10]} />
        </mesh>
        <group position={[0.1, 1.08, 0.3]}>
          <mesh scale={[0.035, 0.04, 0.035]} material={skinMat}>
            <sphereGeometry args={[1, 10, 8]} />
          </mesh>
          <mesh position={[0, 0.14, 0]} material={candleMat}>
            <cylinderGeometry args={[0.018, 0.02, 0.26, 12]} />
          </mesh>
          <group ref={flame} position={[0, 0.28, 0]}>
            <mesh position={[0, 0.025, 0]} material={flameMat}>
              <coneGeometry args={[0.012, 0.055, 10]} />
            </mesh>
            <pointLight ref={candle} color={lightColor} distance={5} decay={1.6} intensity={2.6} position={[0, 0.04, 0]} />
          </group>
        </group>
      </group>

      <group ref={head} position={[0, 1.72, 0]}>
        <mesh scale={[0.095, 0.115, 0.1]} material={skinMat}>
          <sphereGeometry args={[1, 18, 14]} />
        </mesh>
        <lineSegments ref={threads} geometry={geos.threadGeo} material={threadMat} />
        {/* folded pale moth wings at the back of the head, like a headdress */}
        <group ref={wings} position={[0, 0.03, -0.09]}>
          <mesh geometry={geos.wing} material={wingMat} rotation={[-1.05, 0.35, -0.35]} />
          <mesh geometry={geos.wing} material={wingMat} rotation={[-1.05, Math.PI - 0.35, -0.35]} />
        </group>
      </group>

      <group ref={moths}>
        {Array.from({ length: mothCount }, (_, i) => (
          <mesh key={i} material={wingMat}>
            <planeGeometry args={[0.04, 0.025]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
