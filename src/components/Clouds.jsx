import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CLOUD_COUNT = 20;

export default function Clouds() {
  const cloudsRef = useRef([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Each cloud has multiple "puffs" (spheres) grouped together
  const cloudData = useMemo(() => {
    return Array.from({ length: CLOUD_COUNT }, (_, i) => ({
      x: (Math.random() - 0.5) * 80,
      y: 6 + Math.random() * 5,
      z: -120 + Math.random() * 160,
      scale: 1.2 + Math.random() * 2.0,
      speed: 2.5 + Math.random() * 2.0,
      driftOffset: Math.random() * Math.PI * 2,
    }));
  }, []);

  // We render 3 puff meshes per cloud offset along x
  const puffOffsets = [
    [0, 0, 0],
    [-1.4, -0.3, 0],
    [1.4, -0.3, 0],
    [-0.7, 0.5, 0],
    [0.7, 0.5, 0],
  ];

  const refs = puffOffsets.map(() => useRef());

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    cloudData.forEach((cloud, i) => {
      cloud.z += delta * cloud.speed;
      if (cloud.z > 30) {
        cloud.z = -130;
        cloud.x = (Math.random() - 0.5) * 80;
        cloud.y = 6 + Math.random() * 5;
        cloud.scale = 1.2 + Math.random() * 2.0;
      }
      // Gentle float up and down
      const floatY = Math.sin(t * 0.4 + cloud.driftOffset) * 0.15;

      puffOffsets.forEach(([ox, oy, oz], pi) => {
        const ref = refs[pi];
        if (!ref.current) return;
        dummy.position.set(
          cloud.x + ox * cloud.scale,
          cloud.y + oy * cloud.scale + floatY,
          cloud.z + oz * cloud.scale
        );
        dummy.scale.setScalar(cloud.scale * (pi === 0 ? 1.1 : 0.85));
        dummy.updateMatrix();
        ref.current.setMatrixAt(i, dummy.matrix);
      });
    });

    refs.forEach(ref => {
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    });
  });

  return (
    <group>
      {puffOffsets.map((_, pi) => (
        <instancedMesh key={pi} ref={refs[pi]} args={[null, null, CLOUD_COUNT]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshToonMaterial color="#f0f8ff" transparent opacity={0.92} />
        </instancedMesh>
      ))}
    </group>
  );
}
