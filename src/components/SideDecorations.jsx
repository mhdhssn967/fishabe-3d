import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const SCROLL_SPEED = 6;
const SPAWN_Z = -120;
const RESET_Z = 12;
const RANGE_Z = RESET_Z - SPAWN_Z;

// ── Easy per-model size, rotation (deg), and Y position control ───────────────
// Change `baseScale`, `rotY` (in degrees), and `offsetY` to tune each model.
const MODELS = [
  { path: '/environment/sides/Aloe plant.glb',         baseScale: 2.0, rotY: 0, offsetY: 1.0 },
  { path: '/environment/sides/Bell Flower.glb',         baseScale: 3.2, rotY: 0, offsetY: 0.8 },
  { path: '/environment/sides/Daisy.glb',               baseScale: 0.7, rotY: 270, offsetY: 1.0 },
  { path: '/environment/sides/Flower (1).glb',          baseScale: 1.3, rotY: 20, offsetY: 1.0 },
  { path: '/environment/sides/Flower (2).glb',          baseScale: 1.5, rotY: 0, offsetY: 3.0 },
  { path: '/environment/sides/Flower Group (1).glb',    baseScale: 2.0, rotY: 0, offsetY: 0.0 },
  { path: '/environment/sides/Flower.glb',              baseScale: 1.2, rotY: 0, offsetY: 0.3 },
  { path: '/environment/sides/Flower1.glb',             baseScale: 8.0, rotY: 0, offsetY: 2.0 },
  { path: '/environment/sides/Plant.glb',               baseScale: 3.0, rotY: 0, offsetY: 0.7 },
  { path: '/environment/sides/Rose bush.glb',           baseScale: 0.4, rotY: 0, offsetY: 0.0 },
  { path: '/environment/sides/Rose.glb',                baseScale: 3.2, rotY: 20, offsetY: 1.0 },
  { path: '/environment/sides/Tulip.glb',               baseScale: 2.5, rotY: 0, offsetY: 4.0 },
  { path: '/environment/sides/tulip 3.glb',             baseScale: 4.0, rotY: 0, offsetY: 3.0 },
];

const ITEM_COUNT = 80; // Total items across both sides

// Preload all models
MODELS.forEach(m => useGLTF.preload(m.path));

// ── Main component ────────────────────────────────────────────────────────────
export default function SideDecorations() {
  // Unconditionally load all GLTF scenes to follow hook rules
  const gltfs = MODELS.map(m => useGLTF(m.path));

  const items = useMemo(() => {
    const RANGE = RANGE_Z;
    const spacing = RANGE / (ITEM_COUNT / 2); // even spacing per side

    return Array.from({ length: ITEM_COUNT }, (_, i) => {
      const isLeft = i % 2 === 0;
      const idx = Math.floor(i / 2);
      const modelIdx = Math.floor(Math.random() * MODELS.length);
      const model = MODELS[modelIdx];

      // Place on the inner edge of the side walls — x ≈ ±4 (water edge of the bank)
      const xBase = isLeft ? -4.2 : 4.2;
      const xJitter = (Math.random() - 0.5) * 0.8;
      const x = xBase + xJitter;

      // Evenly spaced Z with small jitter so no gaps
      const z = SPAWN_Z + idx * spacing + (Math.random() - 0.5) * spacing * 0.5;

      // Rotate to face inward (toward the water) + per-model base rotation (converted to radians)
      const baseModelRot = (model.rotY || 0) * Math.PI / 180;
      const rotY = (isLeft ? -Math.PI / 2 : Math.PI / 2) + baseModelRot + (Math.random() - 0.5) * 0.5;

      // Small random scale variation on top of base
      const scale = model.baseScale * (0.85 + Math.random() * 0.3);

      return {
        id: i,
        modelIdx,
        baseScale: scale,
        x,
        z,
        rotY,
        offsetY: model.offsetY || 0,
      };
    });
  }, []);

  // Pre-clone and setup all scenes on mount for maximum performance
  const itemScenes = useMemo(() => {
    return items.map(item => {
      const gltf = gltfs[item.modelIdx];
      const clone = gltf.scene.clone(true);
      clone.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      // Set initial properties
      clone.scale.setScalar(item.baseScale);
      clone.rotation.set(0, item.rotY, 0);
      clone.position.set(item.x, item.offsetY, item.z);
      return clone;
    });
  }, [items, gltfs]);

  // Single useFrame loop updating raw Object3D nodes directly
  useFrame((state, delta) => {
    const zProgress = delta * SCROLL_SPEED;
    
    for (let i = 0; i < ITEM_COUNT; i++) {
      const item = items[i];
      const obj = itemScenes[i];
      if (!obj) continue;

      item.z += zProgress;
      if (item.z > RESET_Z) {
        item.z = SPAWN_Z;
      }

      // Curve drop to match ground
      const drop = item.z < 0
        ? Math.pow(Math.abs(item.z), 2) * 0.001
        : 0;

      obj.position.z = item.z;
      obj.position.y = item.offsetY - drop;
    }
  });

  return (
    <group>
      {itemScenes.map((obj, i) => (
        <primitive key={i} object={obj} />
      ))}
    </group>
  );
}
