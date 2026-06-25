import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COUNT = 160; // Total separate stone-like shapes

// ── Easy Offsets Control Per Side ─────────────────────────────────────────────
// Easily adjust the position of the stones on each side.
const LEFT_X_OFFSET = 0.7;   // Positive moves right (inward), negative moves left
const LEFT_Y_OFFSET = 1.5;   // Positive moves up, negative moves down
const RIGHT_X_OFFSET = -1;  // Positive moves right, negative moves left (inward)
const RIGHT_Y_OFFSET = 1.5;  // Positive moves up, negative moves down

// Colorful low-poly palette for stone-like shapes
const COLORS = [
  '#FF2A6D', '#05D9E8', '#F5A623',
  '#2ECC40', '#01FF70', '#7FFF00', '#ADFF2F',
  '#FF5E7E', '#FFD700', '#FF3F81', '#39CCCC',
  '#FF4136', '#FF851B', '#B10DC9', '#F012BE'
];

const rc = () => new THREE.Color(COLORS[Math.floor(Math.random() * COLORS.length)]);

export default function Trees({ speed = 6 }) {
  const stoneRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const patchData = useMemo(() => {
    const RANGE = 140; // total Z span
    const perSide = COUNT / 2;
    const spacing = RANGE / perSide;

    return Array.from({ length: COUNT }, (_, i) => {
      const isLeft = i % 2 === 0;
      const idx = Math.floor(i / 2);

      // Position them along the green banks with side offsets
      let x, baseY;
      if (isLeft) {
        x = -1 * (4.2 + Math.random() * 3.3) + LEFT_X_OFFSET;
        baseY = -0.7 + LEFT_Y_OFFSET;
      } else {
        x = 1 * (4.2 + Math.random() * 3.3) + RIGHT_X_OFFSET;
        baseY = -0.7 + RIGHT_Y_OFFSET;
      }

      // Evenly spaced Z + small jitter for organic feel
      const z = -120 + idx * spacing + (Math.random() - 0.5) * spacing * 0.4;
      
      // Random 3D rotations to make them look like tumbled rocks
      const rotX = Math.random() * Math.PI * 2;
      const rotY = Math.random() * Math.PI * 2;
      const rotZ = Math.random() * Math.PI * 2;

      // Non-uniform scaling (wider/longer but squashed on Y to look like flat stones)
      const scaleX = 0.6 + Math.random() * 0.9;
      const scaleY = 0.35 + Math.random() * 0.45; // flatter Y
      const scaleZ = 0.6 + Math.random() * 0.9;

      return {
        x,
        baseY,
        z,
        rotX,
        rotY,
        rotZ,
        scaleX,
        scaleY,
        scaleZ,
        color: rc(),
      };
    });
  }, []);

  useFrame((state, delta) => {
    if (!stoneRef.current || speed === 0) return;

    const zProgress = delta * speed; // Scroll speed matches the river flow

    patchData.forEach((p, i) => {
      p.z += zProgress;
      if (p.z > 20) {
        p.z -= 140;
        const isLeft = i % 2 === 0;
        
        // Reset positions using the offset variables
        if (isLeft) {
          p.x = -1 * (4.2 + Math.random() * 3.3) + LEFT_X_OFFSET;
          p.baseY = -0.7 + LEFT_Y_OFFSET;
        } else {
          p.x = 1 * (4.2 + Math.random() * 3.3) + RIGHT_X_OFFSET;
          p.baseY = -0.7 + RIGHT_Y_OFFSET;
        }
        
        p.rotX = Math.random() * Math.PI * 2;
        p.rotY = Math.random() * Math.PI * 2;
        p.rotZ = Math.random() * Math.PI * 2;
        p.scaleX = 0.6 + Math.random() * 0.9;
        p.scaleY = 0.35 + Math.random() * 0.45;
        p.scaleZ = 0.6 + Math.random() * 0.9;
      }

      // Curve drop to match ground curvature
      const drop = p.z < 0 ? Math.pow(Math.abs(p.z), 2) * 0.001 : 0;
      const baseY = p.baseY - drop;

      // Position, rotate and non-uniformly scale the stone
      dummy.position.set(p.x, baseY + p.scaleY * 0.5, p.z);
      dummy.scale.set(p.scaleX, p.scaleY, p.scaleZ);
      dummy.rotation.set(p.rotX, p.rotY, p.rotZ);
      dummy.updateMatrix();
      stoneRef.current.setMatrixAt(i, dummy.matrix);
    });

    stoneRef.current.instanceMatrix.needsUpdate = true;

    // Apply colors once after mount
    if (!stoneRef.current.userData.colorsSet) {
      patchData.forEach((p, i) => {
        stoneRef.current.setColorAt(i, p.color);
      });
      stoneRef.current.instanceColor.needsUpdate = true;
      stoneRef.current.userData.colorsSet = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={stoneRef} args={[null, null, COUNT]} castShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshToonMaterial />
      </instancedMesh>
    </group>
  );
}
