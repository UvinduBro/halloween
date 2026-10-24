"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { helmetAssembly, helmetFaces, helmetSpec, knifeAssembly, knifeSpec, type HelmetFaceId } from "@/data/uvi";
import { add, centroid3, faceFrame, mul, normalize, sub, type Vec2, type Vec3 } from "@/lib/geometry";
import { useUviVars } from "@/lib/hooks";
import { buildHelmet, type HelmetBuilt } from "@/lib/uvi";
import { EdgeLabel, Mannequin, PALETTES, Piece, useGrimeMaterial, useViewer, ZUp, type Focus } from "./shared";

const appearAt = (pieces: { pieces: string[] }[], id: string) => {
  const i = pieces.findIndex((s) => s.pieces.includes(id));
  return i < 0 ? 0 : i;
};

/** Extrude a 2D shape (in a face's local frame) and place it in model space. Extrusion goes inward. */
function faceShapeGeometry(outline: readonly Vec2[], holes: (readonly Vec2[])[], frame: ReturnType<typeof faceFrame>, outward: Vec3, depth: number) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) shape.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  // local z in [0, depth]; flip so the slab sits on the inside of the outer skin
  const ezOut = frame.ez[0] * outward[0] + frame.ez[1] * outward[1] + frame.ez[2] * outward[2] > 0;
  const m = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(...frame.ex),
    new THREE.Vector3(...frame.ey),
    new THREE.Vector3(...frame.ez),
  );
  m.setPosition(...frame.origin);
  if (ezOut) g.translate(0, 0, -depth);
  g.applyMatrix4(m);
  g.computeVertexNormals();
  return g;
}

function quadGeometry(quads: Vec3[][]) {
  const pos: number[] = [];
  for (const [a, b, c, d] of quads) pos.push(...a, ...b, ...c, ...a, ...c, ...d);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function useHelmetGeometry(h: HelmetBuilt) {
  return useMemo(() => {
    const t = helmetSpec.panelThickness * h.k;
    const faces = h.faces.map((f) => {
      const frame = faceFrame(f.ordered[0], f.ordered[1], f.ordered[2]);
      const holes = f.window ? [f.window] : [];
      return { id: f.id, geo: faceShapeGeometry(f.flat, holes, frame, f.outward, t), outward: f.outward, f };
    });

    const formers = h.formers.map((fm) => {
      const pts = fm.cut2D.map(([x, y]) => new THREE.Vector2(x, -y));
      const shape = new THREE.Shape(pts);
      if (fm.hole > 0) {
        const c = centroid3(fm.section);
        const hole = new THREE.Path();
        hole.absarc(c[0], c[1], fm.hole / 2, 0, Math.PI * 2, true);
        shape.holes.push(hole);
      }
      const g = new THREE.ExtrudeGeometry(shape, { depth: t * 2, bevelEnabled: false });
      g.translate(0, 0, fm.z - t);
      return { id: fm.id, geo: g };
    });

    // Mesh over the vision window, slightly inside the centre face
    const centre = h.faces.find((f) => f.id === "centre")!;
    const win = centre.window3D!;
    const inward = mul(centre.outward, -(t + 0.15));
    const mesh = quadGeometry([win.map((p) => add(p, inward))]);

    // Seam strips: two 2.5 cm wings on adjacent faces along each lateral edge, plus 4 cm bottom strips
    const faceOf = (id: HelmetFaceId) => h.faces.find((f) => f.id === id)!;
    const wing = (p: Vec3, q: Vec3, faceId: HelmetFaceId, width: number): Vec3[] => {
      const f = faceOf(faceId);
      const c = centroid3(f.pts);
      const e = normalize(sub(q, p));
      const toC = sub(c, p);
      const along = e[0] * toC[0] + e[1] * toC[1] + e[2] * toC[2];
      const w = normalize(sub(toC, mul(e, along)));
      const inset = mul(f.outward, -(t + 0.3));
      return [add(p, inset), add(q, inset), add(add(q, mul(w, width)), inset), add(add(p, mul(w, width)), inset)];
    };
    const v = h.v;
    const half = helmetSpec.seamStripWidth * h.k * 0.5;
    const bottom = helmetSpec.bottomStripWidth * h.k;
    const strips = quadGeometry([
      wing(v.T, v.FL, "centre", half),
      wing(v.T, v.FL, "sideL", half),
      wing(v.T, v.FR, "centre", half),
      wing(v.T, v.FR, "sideR", half),
      wing(v.T, v.ML, "sideL", half),
      wing(v.T, v.ML, "backL", half),
      wing(v.T, v.MR, "sideR", half),
      wing(v.T, v.MR, "backR", half),
      wing(v.T, v.K, "backL", half),
      wing(v.T, v.K, "backR", half),
      wing(v.FL, v.FR, "centre", bottom),
      wing(v.ML, v.FL, "sideL", bottom),
      wing(v.FR, v.MR, "sideR", bottom),
      wing(v.K, v.ML, "backL", bottom),
      wing(v.MR, v.K, "backR", bottom),
    ]);
    return { faces, formers, mesh, strips };
  }, [h]);
}

const meshMat = new THREE.MeshStandardMaterial({ color: "#050505", transparent: true, opacity: 0.85, side: THREE.DoubleSide, roughness: 1 });
const stripMat = new THREE.MeshStandardMaterial({ color: "#8a6a44", side: THREE.DoubleSide, roughness: 1 });

export function useHelmet() {
  const vars = useUviVars();
  return useMemo(() => buildHelmet(vars.k), [vars.k]);
}

export function helmetFocus(h: HelmetBuilt): Focus {
  // model z (cm) → three y (m); centre of the helmet height
  const midZ = (h.v.T[2] + h.v.FL[2]) / 2;
  return {
    target: [0, midZ / 100, 0],
    radius: (h.size.height / 2 / 100) * 1.08,
    half: [h.size.width / 2 / 100, h.size.height / 2 / 100],
  };
}

export function HelmetModel({ showLean = false }: { showLean?: boolean }) {
  const h = useHelmet();
  const vars = useUviVars();
  const geo = useHelmetGeometry(h);
  const card = useGrimeMaterial(PALETTES.cardboard);
  const inner = useGrimeMaterial(PALETTES.cardboard, { finished: false });
  const hat = useGrimeMaterial(PALETTES.hardhat, { finished: false });
  const { xray } = useViewer();
  const explodeDist = 28 * h.k;

  const v = h.v;
  const edges: [Vec3, Vec3][] = [
    [v.T, v.FL],
    [v.FL, v.FR],
    [v.T, v.ML],
    [v.ML, v.FL],
    [v.T, v.K],
    [v.K, v.ML],
  ];

  return (
    <ZUp>
      {geo.faces.map((f) => (
        <Piece key={f.id} dir={f.outward} distance={explodeDist} appearAt={appearAt(helmetAssembly, f.id)}>
          <mesh geometry={f.geo} material={card} castShadow receiveShadow />
        </Piece>
      ))}
      {geo.formers.map((f) => (
        <Piece key={f.id} dir={[0, 0, f.id === "top" ? 1 : 0.6]} distance={explodeDist * 0.8} appearAt={appearAt(helmetAssembly, f.id)}>
          <mesh geometry={f.geo} material={inner} />
        </Piece>
      ))}
      <Piece dir={[0, 0, 0]} appearAt={appearAt(helmetAssembly, "strips")}>
        <mesh geometry={geo.strips} material={stripMat} />
      </Piece>
      <Piece dir={h.faces[0].outward} distance={explodeDist * 1.3} appearAt={appearAt(helmetAssembly, "mesh")}>
        <mesh geometry={geo.mesh} material={meshMat} />
      </Piece>
      <Piece dir={[0, 0, -1]} distance={explodeDist * 0.9} appearAt={appearAt(helmetAssembly, "hardhat")}>
        {/* Hard hat: dome top touches the crown former (z = 32); forehead ~4 cm behind the centre face */}
        <group position={[0, 0, 21 * h.k]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={[10.5 * h.k, 11 * h.k, 12 * h.k]} material={hat}>
            <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh position={[0, 0, 0.4]} rotation={[Math.PI / 2, 0, 0]} scale={[10.9 * h.k, 0.8, 12.4 * h.k]} material={hat}>
            <cylinderGeometry args={[1, 1, 1, 32, 1, true]} />
          </mesh>
        </group>
      </Piece>
      <Mannequin head={h.head} shoulderWidth={vars.shoulderWidth} />
      {edges.map(([a, b]) => {
        const mid = mul(add(a, b), 0.5);
        const out = normalize(sub(mid, h.inside));
        const p = add(mid, mul(out, 4 * h.k));
        return <EdgeLabel key={`${a}-${b}`} position={p as [number, number, number]} lengthCm={Math.hypot(...sub(a, b))} />;
      })}
      {showLean && <LeanIndicator h={h} />}
      {xray && <HeadClearanceLabel h={h} />}
    </ZUp>
  );
}

function HeadClearanceLabel({ h }: { h: HelmetBuilt }) {
  const { unit } = useViewer();
  const c = h.head.centre;
  return (
    <EdgeLabel
      position={[c[0], c[1], c[2] + h.head.semi[2] + 4]}
      tone="sick"
      text={`head clearance ≈ ${unit === "in" ? `${(h.clearance / 2.54).toFixed(1)} in` : `${h.clearance.toFixed(1)} cm`}`}
    />
  );
}

/** 20° lean indicator for the Side view: the centre face's mid-line against a vertical. */
function LeanIndicator({ h }: { h: HelmetBuilt }) {
  const v = h.v;
  const base = mul(add(v.FL, v.FR), 0.5);
  const top = v.T;
  const vertical: Vec3 = [base[0], base[1], top[2]];
  const ridgeTop: Vec3 = [v.K[0], v.K[1], top[2]];
  return (
    <group>
      <Line points={[base, top] as unknown as [number, number, number][]} color="#e9e1d0" lineWidth={2} />
      <Line points={[base, vertical] as unknown as [number, number, number][]} color="#9FA87A" lineWidth={1.5} dashed dashSize={3} gapSize={2} />
      <Line points={[v.K, ridgeTop] as unknown as [number, number, number][]} color="#9FA87A" lineWidth={1.5} dashed dashSize={3} gapSize={2} />
      <EdgeLabel position={[base[0] + 2, base[1] + 6, base[2] + 30]} tone="heading" always text={`${h.leans.centre.toFixed(0)}° lean`} />
      <EdgeLabel position={[v.K[0], v.K[1] - 6, v.K[2] + 30]} tone="muted" always text={`ridge ${h.leans.ridge.toFixed(0)}°`} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Great Knife                                                         */
/* ------------------------------------------------------------------ */

/** The pipe slot is centred on the 20 cm handle end. */
const slotY = -10;

export const knifeFocus: Focus = { target: [0, 0, 0], radius: 0.8, half: [0.78, 0.18] };

export function KnifeModel() {
  const card = useGrimeMaterial(PALETTES.cardboard);
  const pvc = useGrimeMaterial(PALETTES.pvc, { finished: false });
  const fabric = useGrimeMaterial(PALETTES.fabric);
  const felt = useGrimeMaterial(PALETTES.felt, { finished: false });
  const t = knifeSpec.layerThickness;
  const r = knifeSpec.pipe.diameterMm / 20;

  const geos = useMemo(() => {
    const outline = knifeSpec.polygon.map(([x, y]) => new THREE.Vector2(x, y));
    const solid = new THREE.ExtrudeGeometry(new THREE.Shape(outline), { depth: t, bevelEnabled: false });
    const { w, l } = knifeSpec.slot;
    const notched = new THREE.Shape([
      new THREE.Vector2(0, 0),
      new THREE.Vector2(100, 0),
      new THREE.Vector2(120, -30),
      new THREE.Vector2(0, -20),
      new THREE.Vector2(0, slotY - w / 2),
      new THREE.Vector2(l, slotY - w / 2),
      new THREE.Vector2(l, slotY + w / 2),
      new THREE.Vector2(0, slotY + w / 2),
    ]);
    const middle = new THREE.ExtrudeGeometry(notched, { depth: t, bevelEnabled: false });
    return { solid, middle };
  }, [t]);

  // Lay the knife upright in the scene: blade along x, width along y, layers along z; centre it.
  const offsetX = -(knifeSpec.blade - knifeSpec.grip) / 2;
  const pipeLen = knifeSpec.pipe.length;
  const pipeCentreX = knifeSpec.pipe.inside - pipeLen / 2;

  return (
    <group scale={0.01} position={[offsetX * 0.01, 0.12, 0]}>
      <Piece dir={[0, 0, -1]} distance={12} appearAt={appearAt(knifeAssembly, "layer1")}>
        <mesh geometry={geos.solid} material={card} position={[0, 0, -t * 1.5]} />
      </Piece>
      <Piece dir={[0, 0, 0]} appearAt={appearAt(knifeAssembly, "layer2")}>
        <mesh geometry={geos.middle} material={card} position={[0, 0, -t / 2]} />
        <EdgeLabel position={[7.5, slotY - 4, 1]} text="pipe slot 3 × 15" />
      </Piece>
      <Piece dir={[-1, 0, 0]} distance={20} appearAt={appearAt(knifeAssembly, "pipe")}>
        <mesh position={[pipeCentreX, slotY, 0]} rotation={[0, 0, Math.PI / 2]} material={pvc}>
          <cylinderGeometry args={[r, r, pipeLen, 20]} />
        </mesh>
      </Piece>
      <Piece dir={[0, 0, 1]} distance={12} appearAt={appearAt(knifeAssembly, "layer3")}>
        <mesh geometry={geos.solid} material={card} position={[0, 0, t / 2]} />
      </Piece>
      <Piece dir={[-1, 0, 0]} distance={26} appearAt={appearAt(knifeAssembly, "grip")}>
        <mesh position={[-knifeSpec.grip / 2, slotY, 0]} rotation={[0, 0, Math.PI / 2]} material={fabric}>
          <cylinderGeometry args={[r + 0.35, r + 0.35, knifeSpec.grip - 1, 16]} />
        </mesh>
      </Piece>
      <Piece dir={[0, -1, 0]} distance={10} appearAt={appearAt(knifeAssembly, "pad")}>
        <mesh position={[116, -29.2, 0]} material={felt}>
          <boxGeometry args={[7, 1, 2.2]} />
        </mesh>
      </Piece>
      <EdgeLabel position={[50, 3, 0]} lengthCm={100} />
      <EdgeLabel position={[60, -27, 0]} text={`blade ${knifeSpec.blade} · grip ${knifeSpec.grip}`} />
      <EdgeLabel position={[-3, -16, 0]} lengthCm={20} />
      <EdgeLabel position={[124, -18, 0]} lengthCm={30} />
    </group>
  );
}

export { helmetFaces };
