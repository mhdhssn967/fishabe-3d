import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

const SPAWN_Z = -150;
const RESET_Z = 20;
const RANGE_Z = RESET_Z - SPAWN_Z;

const MODELS = [
  { path: '/environment/Rock.glb', baseScale: 0.8 },
  { path: '/environment/Flower.glb', baseScale: 0.25 },
];

const ITEM_COUNT = 40;

// Pre-load all models
MODELS.forEach(model => useGLTF.preload(model.path));

export default function BankDecorations({ speed = 6 }) {
  // Load all GLTF scenes
  const gltfs = MODELS.map(m => useGLTF(m.path));

  const items = useMemo(() => {
    return Array.from({ length: ITEM_COUNT }, (_, i) => {
      const modelIdx = Math.floor(Math.random() * MODELS.length);
      const model = MODELS[modelIdx];
      
      // Alternate sides
      const side = Math.random() > 0.5 ? 1 : -1;
      // Banks go from 4.0 to 6.0 now. We place them scattered within that range.
      const x = side * (4.2 + Math.random() * 1.6);
      const z = SPAWN_Z + (i / ITEM_COUNT) * RANGE_Z;

      return {
        id: i,
        modelIdx,
        x,
        z,
        side,
        scale: model.baseScale * (0.6 + Math.random() * 0.8),
        rotationY: Math.random() * Math.PI * 2,
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
      // Set initial scale and rotation
      clone.scale.setScalar(item.scale);
      // Grass bank top is at y = 1.0 (wallTop is y=0.75, height=0.5)
      clone.position.set(item.x, 1.0, item.z);
      clone.rotation.y = item.rotationY;
      return clone;
    });
  }, [items, gltfs]);

  // Single useFrame loop updating raw Object3D nodes directly
  useFrame((state, delta) => {
    if (speed === 0) return;
    
    for (let i = 0; i < ITEM_COUNT; i++) {
      const item = items[i];
      const obj = itemScenes[i];
      if (!obj) continue;

      item.z += delta * speed;
      if (item.z > RESET_Z) {
        item.z = SPAWN_Z;
        item.side = Math.random() > 0.5 ? 1 : -1;
        item.x = item.side * (4.2 + Math.random() * 1.6);
      }

      // Match the ground's curve: sink down quadratically as Z goes negative
      const curveAmount = 0.001;
      const drop = item.z < 0 ? Math.pow(Math.abs(item.z), 2) * curveAmount : 0;

      obj.position.set(item.x, 1.0 - drop, item.z);
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
