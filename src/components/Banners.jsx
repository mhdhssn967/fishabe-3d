import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

const SCROLL_SPEED = 6;
const SPAWN_Z = -150;
const RESET_Z = 20;
const RANGE_Z = RESET_Z - SPAWN_Z;

const BANNER_IMAGES = [
  '/environment/banners/image.png',
  '/environment/banners/image copy.png',
  '/environment/banners/image copy 2.png',
  '/environment/banners/image copy 3.png',
  '/environment/banners/image copy 4.png',
  '/environment/banners/image copy 5.png',
];

const ITEM_COUNT = 8;

export default function Banners({ speed = 6 }) {
  // Load textures
  const textures = useTexture(BANNER_IMAGES);

  // Configure textures (optional: set color space if needed, wrapping etc)
  useMemo(() => {
    textures.forEach(t => {
      t.colorSpace = THREE.SRGBColorSpace;
    });
  }, [textures]);

  const items = useMemo(() => {
    return Array.from({ length: ITEM_COUNT }, (_, i) => {
      // Distribute evenly along Z initially
      const z = SPAWN_Z + (i / ITEM_COUNT) * RANGE_Z;
      // Alternate left and right banks
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = side * (4.2 + Math.random() * 0.8); // Randomize x between 4.2 and 5.0
      // Random scale between 2.2 and 3.2
      const scale = 2.2 + Math.random() * 1.0;
      const textureIdx = Math.floor(Math.random() * textures.length);
      
      return {
        id: i,
        x,
        z,
        side,
        scale,
        textureIdx,
      };
    });
  }, [textures.length]);

  // Create a base geometry/material for the post
  // Height 3, shifted down so its top is exactly at the bottom of the banner (y=0)
  const postGeo = useMemo(() => new THREE.CylinderGeometry(0.05, 0.05, 3, 8), []);
  const postMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5C4033', roughness: 0.8 }), []);
  
  // Create geometries for the banner planes matching the image aspect ratios
  const bannerGeos = useMemo(() => {
    return textures.map(tex => {
      // Use image dimensions if loaded, fallback to 1.5 aspect ratio
      const aspect = (tex.image && tex.image.width && tex.image.height) 
        ? tex.image.width / tex.image.height 
        : 1.5;
      return new THREE.PlaneGeometry(aspect, 1);
    });
  }, [textures]);

  const bannerGroupRefs = useRef([]);

  useFrame((state, delta) => {
    if (speed === 0) return;
    
    for (let i = 0; i < ITEM_COUNT; i++) {
      const item = items[i];
      const group = bannerGroupRefs.current[i];
      if (!group) continue;

      item.z += delta * speed;
      if (item.z > RESET_Z) {
        item.z = SPAWN_Z;
        item.side = Math.random() > 0.5 ? 1 : -1;
        item.x = item.side * (4.2 + Math.random() * 0.8);
        item.scale = 2.2 + Math.random() * 1.0;
        item.textureIdx = Math.floor(Math.random() * textures.length);
        
        // Update the material texture dynamically if we change it on reset
        const mesh = group.children[1]; // The banner plane is the second child
        mesh.geometry = bannerGeos[item.textureIdx];
        mesh.material.map = textures[item.textureIdx];
        mesh.material.needsUpdate = true;
      }

      // Match the ground's curve: sink down quadratically as Z goes negative
      const curveAmount = 0.001;
      const drop = item.z < 0 ? Math.pow(Math.abs(item.z), 2) * curveAmount : 0;
      
      // Place the group. We raise it a bit more because it's scaled up.
      group.position.set(item.x, 1.5 - drop, item.z);
      
      // Update scale
      group.scale.setScalar(item.scale);
      
      // Make banners face the camera more aggressively.
      // 0 faces +Z (the camera). We tilt them inward slightly.
      group.rotation.y = item.side > 0 ? -0.5 : 0.5;
    }
  });

  return (
    <group>
      {items.map((item, i) => (
        <group 
          key={item.id} 
          ref={el => bannerGroupRefs.current[i] = el}
          position={[item.x, 1.5, item.z]}
          rotation={[0, item.side > 0 ? -0.5 : 0.5, 0]}
          scale={item.scale}
        >
          {/* Post (moved down so it ends at y=0, under the banner) */}
          <mesh geometry={postGeo} material={postMat} position={[0, -1.5, 0]} castShadow receiveShadow />
          {/* Banner Plane (moved slightly forward in Z so the post doesn't clip if they overlap) */}
          <mesh geometry={bannerGeos[item.textureIdx]} position={[0, 0.5, 0.06]} castShadow receiveShadow>
            <meshStandardMaterial 
              map={textures[item.textureIdx]} 
              transparent 
              alphaTest={0.5} 
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
