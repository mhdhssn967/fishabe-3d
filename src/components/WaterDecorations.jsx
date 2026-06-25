import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const SCROLL_SPEED = 6;
const SPAWN_Z = -120;
const RESET_Z = 12;
const RANGE_Z = RESET_Z - SPAWN_Z;

// ── Easy per-model size control ───────────────────────────────────────────────
// Change the `baseScale` number for each model to set its size.
const MODELS = [
  { path: '/environment/Flower.glb',        baseScale: 0.15  },
  { path: '/environment/Lilly Pad.glb',     baseScale: 1.8  },
  // { path: '/environment/Lotus.glb',         baseScale: 0.5  },
  { path: '/environment/Nenuphar.glb',      baseScale: 0.5  },
  { path: '/environment/Water lilies.glb',  baseScale: 0.05 },
];

const ITEM_COUNT = 30;

// Pre-load all models
MODELS.forEach(model => useGLTF.preload(model.path));

export default function WaterDecorations({ speed = 6 }) {
  // Load all GLTF scenes to follow hook rules
  const gltfs = MODELS.map(m => useGLTF(m.path));

  const items = useMemo(() => {
    return Array.from({ length: ITEM_COUNT }, (_, i) => {
      const modelIdx = Math.floor(Math.random() * MODELS.length);
      const model = MODELS[modelIdx];
      return {
        id: i,
        modelIdx,
        x: (Math.random() - 0.5) * 6.2,
        z: SPAWN_Z + Math.random() * RANGE_Z,
        // Small random variation on top of the per-model base scale
        scale: model.baseScale * (0.8 + Math.random() * 0.4),
        bobOffset: Math.random() * Math.PI * 2,
        speed: 0.85 + Math.random() * 0.3,
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
          child.receiveShadow = false;
        }
      });
      // Set initial scale and position
      clone.scale.setScalar(item.scale);
      clone.position.set(item.x, 0.05, item.z);
      return clone;
    });
  }, [items, gltfs]);

  // Single useFrame loop updating raw Object3D nodes directly
  useFrame((state, delta) => {
    if (speed === 0) return;
    const t = state.clock.elapsedTime;
    
    for (let i = 0; i < ITEM_COUNT; i++) {
      const item = items[i];
      const obj = itemScenes[i];
      if (!obj) continue;

      item.z += delta * speed * item.speed;
      if (item.z > RESET_Z) {
        item.z = SPAWN_Z;
        item.x = (Math.random() - 0.5) * 6.2;
      }

      const bob = Math.sin(t * 1.1 + item.bobOffset) * 0.04;
      const wobble = Math.sin(t * 0.4 + item.bobOffset) * 0.06;

      // Match the ground's curve: sink down quadratically as Z goes negative
      const curveAmount = 0.001;
      const drop = item.z < 0 ? Math.pow(Math.abs(item.z), 2) * curveAmount : 0;

      obj.position.set(item.x, 0.05 + bob - drop, item.z);
      obj.rotation.y += delta * 0.05;
      obj.rotation.x = wobble * 0.3;
      obj.rotation.z = wobble * 0.2;
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
