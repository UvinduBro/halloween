"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFigureBehaviour, useLightFlicker, usePointerHandlers, type FigureProps } from "./common";

/**
 * A custom model (e.g. a phone 3D scan of the costume). Auto-fits to a 2 m tall slot,
 * centred on its footprint, with the same tracking/hover/select behaviour.
 */
export function GlbFigure({ id, url, position, motion, flashlight, lightColor, onSelect }: FigureProps & { url: string }) {
  const gltf = useGLTF(url);
  const { update } = useFigureBehaviour(id, motion);
  const flicker = useLightFlicker(motion, id === "uvi" ? 11 : 47);
  const handlers = usePointerHandlers(id, onSelect);
  const root = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const t0 = useRef(0);

  const fitted = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const k = 2 / Math.max(0.001, size.y);
    scene.scale.setScalar(k);
    const centre = box.getCenter(new THREE.Vector3());
    scene.position.set(-centre.x * k, -box.min.y * k, -centre.z * k);
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return scene;
  }, [gltf.scene]);

  useFrame((_, dt) => {
    t0.current += dt;
    const t = t0.current;
    const b = update(t, dt);
    if (root.current) {
      root.current.position.set(position[0], position[1], position[2] + 0.55 * b.step);
      root.current.rotation.set(b.pitch * 0.3, b.yaw * 0.5, b.roll * 0.05);
      const s = 1 + 0.006 * b.breath;
      root.current.scale.set(1, s, 1);
    }
    if (light.current) light.current.intensity = flashlight ? 0 : (2.5 + 5 * b.flare) * flicker(t, b.flare);
  });

  return (
    <group ref={root} position={position} {...handlers}>
      <primitive object={fitted} />
      <pointLight ref={light} position={[0.4, 1.6, 0.8]} color={lightColor} distance={5} decay={1.6} />
    </group>
  );
}
