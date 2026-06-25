import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Stones() {
  const count = 60; // Total stones
  const stonesRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initialize random positions and properties for stones
  const stonesData = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      const isLeft = i % 2 === 0;
      // Spawn stones on the sides, slightly closer to the water than trees or mixed
      const x = isLeft ? -3.5 - Math.random() * 10 : 3.5 + Math.random() * 10;
      const z = -120 + Math.random() * 140;
      // Irregular scaling to make them look like diverse rocks
      const scaleX = 0.4 + Math.random() * 1.5;
      const scaleY = 0.2 + Math.random() * 0.8;
      const scaleZ = 0.4 + Math.random() * 1.5;
      const rotationY = Math.random() * Math.PI;
      const rotationZ = (Math.random() - 0.5) * 0.4;
      const rotationX = (Math.random() - 0.5) * 0.4;
      
      // Assorted stone colors (variations of grey/slate)
      const colors = ['#888888', '#999999', '#777777', '#a9a9a9', '#696969', '#556b2f'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      data.push({ x, z, scaleX, scaleY, scaleZ, rotationX, rotationY, rotationZ, color: new THREE.Color(color) });
    }
    return data;
  }, []);

  useFrame((state, delta) => {
    if (stonesRef.current) {
      stonesData.forEach((stone, i) => {
        // Move towards the camera to match ground texture speed (offset speed 2 * repeat length 7.5 = 15)
        stone.z += delta * 15; 
        
        if (stone.z > 20) {
          stone.z -= 140; // Reset to the back
          const isLeft = i % 2 === 0;
          stone.x = isLeft ? -3.5 - Math.random() * 10 : 3.5 + Math.random() * 10;
        }

        dummy.position.set(stone.x, 1 + (stone.scaleY / 2), stone.z);
        dummy.rotation.set(stone.rotationX, stone.rotationY, stone.rotationZ);
        dummy.scale.set(stone.scaleX, stone.scaleY, stone.scaleZ);
        dummy.updateMatrix();
        stonesRef.current.setMatrixAt(i, dummy.matrix);
      });
      stonesRef.current.instanceMatrix.needsUpdate = true;
      
      // Update colors initially if not done
      if (!stonesRef.current.userData.colorsSet) {
        stonesData.forEach((stone, i) => {
          stonesRef.current.setColorAt(i, stone.color);
        });
        stonesRef.current.instanceColor.needsUpdate = true;
        stonesRef.current.userData.colorsSet = true;
      }
    }
  });

  return (
    <instancedMesh ref={stonesRef} args={[null, null, count]} receiveShadow castShadow>
      {/* A dodecahedron with radius 1 and detail 0 is perfect for low-poly stones */}
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={0.9} metalness={0.1} />
    </instancedMesh>
  );
}
