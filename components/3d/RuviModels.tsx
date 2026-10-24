"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { capSpec, pipeSpec, scalpelSpec } from "@/data/ruvi";
import { useStore } from "@/lib/store";
import { dressPattern, maskDims, type MaskDims } from "@/lib/ruvi";
import { fmtLen } from "@/lib/units";
import type { Vec3 } from "@/lib/geometry";
import {
  bottomEdgeLine,
  maskCut,
  maskOpenings,
  patchOnFront,
  planeLoop,
  rectOnFront,
  ribbonGeometry,
  shellGeometry,
} from "./maskGeometry";
import { EdgeLabel, Mannequin, PALETTES, useGrimeMaterial, useViewer, ZUp, type Focus } from "./shared";

export function useMaskDims() {
  const m = useStore((s) => s.ruvi);
  return useMemo(() => maskDims(m), [m]);
}

export function maskFocus(d: MaskDims): Focus {
  return { target: [0, -0.02, 0], radius: (d.shell.h / 2 / 100) * 1.35, half: [d.shell.w / 200 + 0.04, d.shell.h / 200 + 0.06] };
}

const latex = new THREE.MeshStandardMaterial({ color: "#b5524a", roughness: 0.35, metalness: 0.05 });
const chiffon = new THREE.MeshStandardMaterial({ color: "#0b0a09", transparent: true, opacity: 0.78, side: THREE.DoubleSide, roughness: 1 });
const foam = new THREE.MeshStandardMaterial({ color: "#5f9a4a", roughness: 1 });
const velcro = new THREE.MeshStandardMaterial({ color: "#2a2724", roughness: 1 });
const headMat = new THREE.MeshStandardMaterial({ color: "#7d7a75", roughness: 0.9, transparent: true, opacity: 0.95 });

const TISSUE = { ...PALETTES.plaster, raw: "#e6dcc5" };

function Lines({ d, semi }: { d: MaskDims; semi: Vec3 }) {
  const o = maskOpenings(d);
  const cut = maskCut(d);
  const bottom = useMemo(() => bottomEdgeLine(d, semi), [d, semi]);
  const centre = useMemo(() => planeLoop(d, semi, "x", 0), [d, semi]);
  const split = useMemo(() => planeLoop(d, semi, "y", cut.splitY), [d, semi, cut.splitY]);
  const pts = (p: Vec3[]) => p as unknown as [number, number, number][];
  return (
    <group>
      <Line points={pts(bottom)} color="#1a1a1a" lineWidth={2.5} />
      <Line points={pts(centre)} color="#1a1a1a" lineWidth={1.5} dashed dashSize={1.2} gapSize={0.8} />
      <Line points={pts(split)} color="#203a8a" lineWidth={2} />
      {o.eyes.map((e, i) => (
        <Line key={i} points={pts(rectOnFront(semi, e))} color="#111" lineWidth={2} />
      ))}
      <Line points={pts(rectOnFront(semi, o.vent))} color="#111" lineWidth={2} />
    </group>
  );
}

const GAUZE_PLANES: { n: Vec3; w: number; phase: number }[] = [
  { n: [0.25, -0.35, 1], w: 3.2, phase: 0 },
  { n: [1, 0.3, 0.45], w: 2.6, phase: 1.3 },
  { n: [-0.8, 0.2, 0.7], w: 3, phase: 2.1 },
  { n: [0.1, 1, 0.15], w: 2.4, phase: 0.7 },
  { n: [-0.4, -0.9, 0.4], w: 3.4, phase: 2.9 },
  { n: [0.6, -0.5, -0.3], w: 2.2, phase: 1.9 },
];

/**
 * The swollen head through its five build stages (driven by the assembly step).
 * `fit` adds her head, foam pads and gap labels.
 */
export function MaskModel({ fit = false }: { fit?: boolean }) {
  const d = useMaskDims();
  const { step, explode, motion, xray, finished: finishToggle, unit } = useViewer();
  const stage = Math.min(4, Math.max(0, fit ? Math.max(step, 1) : step));
  const semi = d.shellSemi;
  const balloonSemi = useMemo<Vec3>(() => [semi[0] - 0.4, semi[1] - 0.4, semi[2] - 0.4], [semi]);
  const withOpenings = stage >= 2 || fit;
  const withLumps = stage >= 2;

  const geos = useMemo(() => {
    const front = shellGeometry(d, { semi, part: "front", lumps: withLumps, openings: withOpenings });
    const back = shellGeometry(d, { semi, part: "back", lumps: withLumps, openings: false });
    const balloon = shellGeometry(d, { semi: balloonSemi, part: "whole", lumps: false, openings: false, cutBottom: false, res: [64, 48] });
    return { front, back, balloon };
  }, [d, semi, balloonSemi, withLumps, withOpenings]);

  const gauze = useMemo(() => GAUZE_PLANES.map((g) => ribbonGeometry(d, semi, g.n, g.w, 0.35 + (withLumps ? 0.25 : 0), g.phase)), [d, semi, withLumps]);
  const o = useMemo(() => maskOpenings(d), [d]);
  const patches = useMemo(() => [...o.eyes, o.vent].map((r) => patchOnFront(semi, r, -0.4)), [o, semi]);

  const finished = stage >= 4 || finishToggle;
  const plaster = useGrimeMaterial(stage >= 3 ? TISSUE : PALETTES.plaster, { finished });
  const gauzeMat = useGrimeMaterial(PALETTES.gauze, { finished });
  const shellOpacity = fit ? 0.35 : undefined;
  const plasterFit = useGrimeMaterial(PALETTES.plaster, { finished, opacityOverride: shellOpacity });
  const shellMat = fit ? plasterFit : plaster;

  const backRef = useRef<THREE.Group>(null);
  const frontRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const open = (stage === 1 && !fit ? 7 : 0) + explode * 14;
    const a = motion ? 1 - Math.exp(-dt * 4) : 1;
    if (backRef.current) backRef.current.position.y += (-open - backRef.current.position.y) * a;
    if (frontRef.current) frontRef.current.position.y += (open * 0.35 - frontRef.current.position.y) * a;
  });

  const cut = maskCut(d);
  return (
    <ZUp>
      {stage === 0 && !fit && (
        <group>
          <mesh geometry={geos.balloon} material={latex} />
          <mesh position={[0, 0, -semi[2] - 1.6]} material={latex}>
            <coneGeometry args={[1, 2, 12]} />
          </mesh>
          <Lines d={d} semi={balloonSemi} />
          <EdgeLabel position={[semi[0] + 3, 0, 0]} text={`balloon ${fmtLen(d.balloonCirc, unit, 0)} round`} />
        </group>
      )}
      {(stage >= 1 || fit) && (
        <>
          <group ref={frontRef}>
            <mesh geometry={geos.front} material={shellMat} />
            {(stage >= 3 || fit) && patches.map((g, i) => <mesh key={i} geometry={g} material={chiffon} />)}
          </group>
          <group ref={backRef}>
            <mesh geometry={geos.back} material={shellMat} />
          </group>
          {stage >= 3 && !fit && (
            <group>
              {gauze.map((g, i) => (
                <mesh key={i} geometry={g} material={gauzeMat} />
              ))}
              {[-1, 1].map((s) => (
                <mesh key={s} position={[s * semi[0] * 0.98, cut.splitY, -2]} material={velcro}>
                  <boxGeometry args={[0.5, 4, 2.5]} />
                </mesh>
              ))}
            </group>
          )}
          {stage >= 4 && !fit && <CapOnMask d={d} />}
          {stage === 1 && !fit && <EdgeLabel position={[semi[0] + 4, cut.splitY, semi[2] * 0.5]} text="split behind the ears" />}
          <EdgeLabel position={[0, semi[1] + 2, semi[2] + 3]} text={`${fmtLen(d.shell.w, unit)} × ${fmtLen(d.shell.h, unit)} × ${fmtLen(d.shell.d, unit)}`} />
        </>
      )}
      {(fit || xray) && stage >= 1 && <FitCheck d={d} />}
      {/* Mannequin space has z = 0 at the shoulders; the mask's origin is the head centre. */}
      <group position={[0, 0, -(d.headSemi[2] + 9)]}>
        <Mannequin head={{ centre: [0, 0, d.headSemi[2] + 9], semi: d.headSemi }} shoulderWidth={38} showHead={!(fit || xray) || stage < 1} />
      </group>
    </ZUp>
  );
}

function FitCheck({ d }: { d: MaskDims }) {
  const { unit } = useViewer();
  const h = d.headSemi;
  const s = d.shellSemi;
  const pads: { p: Vec3; scale: Vec3 }[] = [
    { p: [0, h[1] * 0.75, h[2] * 0.62], scale: [3.5, 0.6, 2] }, // forehead
    { p: [0, -h[1] * 0.1, h[2] + 0.6], scale: [3, 3, 0.6] }, // crown
    { p: [h[0] + 0.6, 0, h[2] * 0.25], scale: [0.6, 2.5, 2.5] }, // right temple
    { p: [-h[0] - 0.6, 0, h[2] * 0.25], scale: [0.6, 2.5, 2.5] }, // left temple
    { p: [0, -h[1] - 0.6, h[2] * 0.2], scale: [3, 0.6, 2.5] }, // back
  ];
  return (
    <group>
      <mesh scale={h as unknown as [number, number, number]} material={headMat}>
        <sphereGeometry args={[1, 40, 28]} />
      </mesh>
      {pads.map((pad, i) => (
        <mesh key={i} position={pad.p as unknown as [number, number, number]} scale={pad.scale as unknown as [number, number, number]} material={foam}>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
      ))}
      <EdgeLabel
        position={[0, 0, s[2] + 5]}
        tone="sick"
        text={`gap ${fmtLen(d.gaps[2], unit)} top · ${fmtLen(d.gaps[0], unit)} sides · ${fmtLen(d.gaps[1], unit)} front/back`}
      />
      <EdgeLabel position={[s[0] + 3, 0, 0]} tone="muted" text="foam pads 1–1.5 cm" />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Cap                                                                  */
/* ------------------------------------------------------------------ */

function useCapGeometry() {
  return useMemo(() => {
    const r = capSpec.ringCirc / (2 * Math.PI);
    const band = new THREE.CylinderGeometry(r, r * 1.04, 1, 64, 6, true);
    const pos = band.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i); // -0.5..0.5
      const z = pos.getZ(i);
      const ang = Math.atan2(x, z); // 0 at the front (+z local)
      const height = capSpec.frontHeight * (0.68 + 0.32 * Math.cos(ang));
      pos.setY(i, (y + 0.5) * height);
    }
    band.computeVertexNormals();
    const cuff = new THREE.CylinderGeometry(r * 1.06, r * 1.08, capSpec.cuff, 64, 1, true);
    cuff.translate(0, capSpec.cuff / 2, 0);
    return { band, cuff, r };
  }, []);
}

function CapMesh() {
  const { band, cuff, r } = useCapGeometry();
  const cotton = useGrimeMaterial(PALETTES.cotton);
  return (
    <group>
      <mesh geometry={band} material={cotton} />
      <mesh geometry={cuff} material={cotton} />
      {/* back pleat */}
      <mesh position={[0, capSpec.frontHeight * 0.36 * 0.9, -r - 0.25]} material={cotton}>
        <boxGeometry args={[1.2, capSpec.frontHeight * 0.36 * 1.8, 0.5]} />
      </mesh>
    </group>
  );
}

function CapOnMask({ d }: { d: MaskDims }) {
  const s = d.shellSemi;
  // three-space cap (y up) inside the z-up group: rotate so the cap's y axis points along +z
  return (
    <group position={[0, s[1] * 0.3, s[2] * 0.72]} rotation={[Math.PI / 2 + 0.55, Math.PI, 0]}>
      <CapMesh />
    </group>
  );
}

export const capFocus: Focus = { target: [0, 0.045, 0], radius: 0.1, half: [0.09, 0.07] };

export function CapModel() {
  const { unit } = useViewer();
  return (
    <group scale={0.01}>
      <CapMesh />
      <EdgeLabel position={[0, capSpec.frontHeight + 1.5, 7]} text={`${fmtLen(capSpec.frontHeight, unit)} at the front`} />
      <EdgeLabel position={[8, 1, 0]} text={`cuff ${fmtLen(capSpec.cuff, unit)}`} />
      <EdgeLabel position={[0, -2, 0]} text={`${fmtLen(capSpec.ringCirc, unit)} round`} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Dress                                                               */
/* ------------------------------------------------------------------ */

export function DressModel() {
  const m = useStore((s) => s.ruvi);
  const p = useMemo(() => dressPattern(m), [m]);
  const { step, unit } = useViewer();
  const cotton = useGrimeMaterial(PALETTES.cotton);
  const vneckMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a2420", side: THREE.DoubleSide }), []);
  const buttonMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#efeae0", roughness: 0.4 }), []);

  const geo = useMemo(() => {
    const rings: { z: number; half: number; depthK: number }[] = [
      { z: 1.5, half: (m.neck / (2 * Math.PI)) * 1.25, depthK: 0.95 },
      { z: -3, half: p.half.shoulderPoint, depthK: 0.5 },
      { z: -p.levels.underarm, half: p.half.bust, depthK: 0.7 },
      { z: -p.levels.waist, half: p.half.waist, depthK: 0.72 },
      { z: -p.levels.hips, half: p.half.hips, depthK: 0.7 },
      { z: -p.L, half: p.half.hem, depthK: 0.7 },
    ];
    const N = 48;
    const pos: number[] = [];
    const ring = (r: (typeof rings)[number], frayed: boolean) =>
      Array.from({ length: N + 1 }, (_, i) => {
        const t = (i / N) * Math.PI * 2;
        const a = r.half * 0.74;
        const b = a * r.depthK;
        const fray = frayed ? (Math.sin(i * 12.9898) * 43758.5453) % 1 : 0;
        return new THREE.Vector3(a * Math.cos(t), b * Math.sin(t), r.z + (frayed ? Math.abs(fray) * 3 : 0));
      });
    // Smooth vertical interpolation between rings
    const levels: { z: number; half: number; depthK: number }[] = [];
    for (let i = 0; i < rings.length - 1; i++) {
      const A = rings[i];
      const B = rings[i + 1];
      const steps = 6;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const e = t * t * (3 - 2 * t);
        levels.push({ z: A.z + (B.z - A.z) * t, half: A.half + (B.half - A.half) * e, depthK: A.depthK + (B.depthK - A.depthK) * e });
      }
    }
    levels.push(rings[rings.length - 1]);
    const rs = levels.map((r, i) => ring(r, i === levels.length - 1));
    for (let j = 0; j < rs.length - 1; j++)
      for (let i = 0; i < N; i++) {
        const a = rs[j][i];
        const b = rs[j][i + 1];
        const c = rs[j + 1][i + 1];
        const d = rs[j + 1][i];
        pos.push(...a.toArray(), ...d.toArray(), ...c.toArray(), ...a.toArray(), ...c.toArray(), ...b.toArray());
      }
    const body = new THREE.BufferGeometry();
    body.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    body.computeVertexNormals();
    return { body, rings };
  }, [m.neck, p]);

  const frontY = (half: number, depthK: number) => half * 0.74 * depthK + 0.25;
  const buttonZ = p.buttons.map(([, y]) => y);
  const depthAt = (z: number) => {
    const r = geo.rings;
    for (let i = 0; i < r.length - 1; i++)
      if (z <= r[i].z && z >= r[i + 1].z) {
        const t = (z - r[i].z) / (r[i + 1].z - r[i].z);
        return frontY(r[i].half + (r[i + 1].half - r[i].half) * t, r[i].depthK + (r[i + 1].depthK - r[i].depthK) * t);
      }
    return 10;
  };
  const sleeveLen = 17;
  const sleeveR = p.half.sleeveOpening / Math.PI;

  return (
    <ZUp position={[0, p.L / 200, 0]}>
      <mesh geometry={geo.body} material={cotton} />
      {step >= 1 &&
        [-1, 1].map((s) => (
          <group key={s} position={[s * (p.half.shoulderPoint - 3), 0, -6]} rotation={[0, (s * Math.PI) / 3.2, 0]}>
            <mesh position={[0, 0, -sleeveLen / 2]} rotation={[Math.PI / 2, 0, 0]} material={cotton}>
              <cylinderGeometry args={[7.5, sleeveR, sleeveLen, 24, 1, true]} />
            </mesh>
          </group>
        ))}
      {step >= 1 && (
        <mesh material={vneckMat}>
          <bufferGeometry
            attach="geometry"
            onUpdate={(g) => g.computeVertexNormals()}
          >
            <bufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array([
                  -7.5 * 0.74, depthAt(1) + 0.1, 1.2,
                  7.5 * 0.74, depthAt(1) + 0.1, 1.2,
                  0, depthAt(-10) + 0.15, -10,
                ]),
                3,
              ]}
            />
          </bufferGeometry>
        </mesh>
      )}
      {step >= 2 &&
        buttonZ.map((z, i) => (
          <mesh key={i} position={[1.2, depthAt(z) + 0.2, z]} material={buttonMat} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.7, 0.7, 0.3, 12]} />
          </mesh>
        ))}
      <Mannequin head={{ centre: [0, 1, 15], semi: [7.5, 10, 11] }} shoulderWidth={m.shoulders} />
      <EdgeLabel position={[p.half.bust * 0.8, 0, -p.levels.underarm]} text={`bust ½ ${fmtLen(p.half.bust, unit)}`} />
      <EdgeLabel position={[p.half.waist * 0.85, 0, -p.levels.waist]} text={`waist ½ ${fmtLen(p.half.waist, unit)}`} />
      <EdgeLabel position={[p.half.hips * 0.8, 0, -p.levels.hips]} text={`hips ½ ${fmtLen(p.half.hips, unit)}`} />
      <EdgeLabel position={[-p.half.hem * 0.9, 0, -p.L]} text={`length ${fmtLen(p.L, unit)}`} />
    </ZUp>
  );
}

export function dressFocus(L: number): Focus {
  return { target: [0, 0, 0], radius: (L / 2 / 100) * 1.25, half: [0.32, L / 200 + 0.05] };
}

/* ------------------------------------------------------------------ */
/* Lead pipe and scalpel                                               */
/* ------------------------------------------------------------------ */

export const pipeFocus: Focus = { target: [0, 0.36, 0], radius: 0.42, half: [0.18, 0.4] };

export function PipeModel() {
  const pvc = useGrimeMaterial(PALETTES.pvc);
  const rust = useGrimeMaterial({ ...PALETTES.pvc, base: "#3a1d10", rust: "#8b4a23", accent: "#c06a35", scale: 0.6 });
  const grip = useMemo(() => new THREE.MeshStandardMaterial({ color: "#0d0d0d", roughness: 1 }), []);
  const blade = useMemo(() => new THREE.MeshStandardMaterial({ color: "#9a9a96", metalness: 0.6, roughness: 0.35 }), []);
  const { unit } = useViewer();
  const r = pipeSpec.diameterMm / 20;
  const R = 3.5;
  const L = pipeSpec.length;
  const ang = (pipeSpec.elbow * Math.PI) / 180;
  const end = new THREE.Vector3(-R + R * Math.cos(ang), 0, L + R * Math.sin(ang));
  const dir = new THREE.Vector3(-Math.sin(ang), 0, Math.cos(ang));
  const stubCentre = end.clone().addScaledVector(dir, pipeSpec.stub / 2);
  const stubQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

  return (
    <ZUp>
      <mesh position={[0, 0, L / 2]} rotation={[Math.PI / 2, 0, 0]} material={pvc}>
        <cylinderGeometry args={[r, r, L, 24]} />
      </mesh>
      <mesh position={[0, 0, pipeSpec.grip / 2]} rotation={[Math.PI / 2, 0, 0]} material={grip}>
        <cylinderGeometry args={[r + 0.25, r + 0.25, pipeSpec.grip, 24]} />
      </mesh>
      <mesh position={[-R, 0, L]} rotation={[Math.PI / 2, 0, 0]} material={rust}>
        <torusGeometry args={[R, r * 1.12, 16, 24, ang]} />
      </mesh>
      <mesh position={stubCentre} quaternion={stubQ} material={pvc}>
        <cylinderGeometry args={[r, r, pipeSpec.stub, 24]} />
      </mesh>
      {/* optional scalpel */}
      <group position={[12, 0, 8]} rotation={[0, -0.3, 0]}>
        <mesh position={[0, 0, scalpelSpec.handle / 2]} material={grip}>
          <boxGeometry args={[1.2, 0.5, scalpelSpec.handle]} />
        </mesh>
        <mesh position={[0, 0, scalpelSpec.handle + scalpelSpec.blade / 2]} material={blade}>
          <boxGeometry args={[0.9, 0.25, scalpelSpec.blade]} />
        </mesh>
      </group>
      <EdgeLabel position={[5, 0, L / 2]} text={`${fmtLen(L, unit)} pipe`} />
      <EdgeLabel position={[6, 0, pipeSpec.grip / 2]} text={`grip ${fmtLen(pipeSpec.grip, unit)}`} />
      <EdgeLabel position={[-9, 0, L + 9]} text={`45° + ${fmtLen(pipeSpec.stub, unit)} stub`} />
      <EdgeLabel position={[16, 0, 18]} text="scalpel (optional)" />
    </ZUp>
  );
}
