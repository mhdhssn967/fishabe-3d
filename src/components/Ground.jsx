import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

export default function Ground({ speed = 6, ...props }) {
  const waterTexture = useTexture('/newtst.png');
  const surfaceTexture = useTexture('/WATER.png');
  const sideTexture = useTexture('/side_texture.png');
  const materialRef = useRef();
  const surfaceMaterialRef = useRef();
  const sideMaterialRef = useRef();
  const sideMaterialRightRef = useRef();

  const sideTextureRight = useMemo(() => {
    const t = sideTexture.clone();
    t.needsUpdate = true;
    return t;
  }, [sideTexture]);

  useMemo(() => {
    waterTexture.wrapS = waterTexture.wrapT = THREE.RepeatWrapping;
    waterTexture.repeat.set(5, 20); // Repeat texture along width and length to avoid stretching
    
    surfaceTexture.wrapS = surfaceTexture.wrapT = THREE.RepeatWrapping;
    surfaceTexture.repeat.set(0.5, 5); // Reduced repeat = larger texture scale
    
    sideTexture.wrapS = sideTexture.wrapT = THREE.RepeatWrapping;
    sideTexture.repeat.set(30, 0.5); // Fixed aspect ratio to avoid stretching
    
    sideTextureRight.wrapS = sideTextureRight.wrapT = THREE.RepeatWrapping;
    sideTextureRight.repeat.set(30, 0.5);
  }, [waterTexture, surfaceTexture, sideTexture, sideTextureRight]);

  const curveAmount = 0.001;

  // Function to bend geometry downwards based on Z distance
  const bendGeometry = (geometry, isRotatedPlane, zOffset) => {
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let worldZ = isRotatedPlane ? -pos.getY(i) + zOffset : pos.getZ(i) + zOffset;
      
      // Bend downwards increasingly as it gets further away (z < 0)
      if (worldZ < 0) {
        const drop = Math.pow(Math.abs(worldZ), 2) * curveAmount;
        if (isRotatedPlane) pos.setZ(i, pos.getZ(i) - drop);
        else pos.setY(i, pos.getY(i) - drop);
      }
    }
    geometry.computeVertexNormals();
    return geometry;
  };

  // Pre-calculate curved geometries with high segmentation so they can bend smoothly
  const geometries = useMemo(() => {
    return {
      water: bendGeometry(new THREE.PlaneGeometry(8, 150, 1, 64), true, -30),
      seaFloor: bendGeometry(new THREE.PlaneGeometry(40, 150, 1, 64), true, -30),
      wallBase: bendGeometry(new THREE.BoxGeometry(10, 2.5, 150, 1, 1, 64), false, -30),
      wallTop: bendGeometry(new THREE.BoxGeometry(10, 0.5, 150, 1, 1, 64), false, -30)
    };
  }, []);

  useFrame((state, delta) => {
    if (speed === 0) return;
    const t = state.clock.elapsedTime;
    if (materialRef.current && materialRef.current.map) {
      // Animate the texture offset to simulate backward movement
      materialRef.current.map.offset.y += delta * 1.2;
    }
    // Pulse water surface color for a shimmering toony effect
    if (surfaceMaterialRef.current) {
      const pulse = Math.sin(t * 1.5) * 0.05;
      surfaceMaterialRef.current.color.setRGB(0.4 + pulse, 0.75 + pulse * 0.5, 1.0);
      surfaceMaterialRef.current.map.offset.y += delta * 1.2;
    }
    if (sideMaterialRef.current && sideMaterialRef.current.map) {
      sideMaterialRef.current.map.offset.x += delta * 1.2;
    }
    if (sideMaterialRightRef.current && sideMaterialRightRef.current.map) {
      sideMaterialRightRef.current.map.offset.x -= delta * 1.2;
    }
  });

  return (
    <group {...props}>
      {/* Water Surface (Transparent, shimmering) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -30]} geometry={geometries.water}>
        <meshPhysicalMaterial 
          ref={surfaceMaterialRef}
          map={surfaceTexture}
          color="#6ad4ff" 
          opacity={0.3} 
          transparent={true} 
          roughness={0.05} 
          metalness={0.1} 
          clearcoat={1.0}
          clearcoatRoughness={0.05}
        />
      </mesh>

      {/* Sea Floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, -30]} geometry={geometries.seaFloor}>
        <meshStandardMaterial 
          ref={materialRef}
          map={waterTexture} 
          color="#1a6fb5" 
        />
      </mesh>

      {/* Left Wall Base (Brown dirt - lower sides) */}
      <mesh receiveShadow position={[-9, -0.75, -30]} geometry={geometries.wallBase}>
        <meshToonMaterial color="#A0522D" />
      </mesh>
      {/* Left Wall Top (Green textured - top strip) */}
      <mesh receiveShadow position={[-9, 0.75, -30]} geometry={geometries.wallTop}>
        <meshStandardMaterial ref={sideMaterialRef} map={sideTexture} bumpMap={sideTexture} bumpScale={0.5} color="#ffffff" roughness={1.0} />
      </mesh>

      {/* Right Wall Base (Brown dirt - lower sides) */}
      <mesh receiveShadow position={[9, -0.75, -30]} geometry={geometries.wallBase}>
        <meshToonMaterial color="#A0522D" />
      </mesh>
      {/* Right Wall Top (Green textured - top strip) */}
      <mesh receiveShadow position={[9, 0.75, -30]} geometry={geometries.wallTop}>
        <meshStandardMaterial ref={sideMaterialRightRef} map={sideTextureRight} bumpMap={sideTextureRight} bumpScale={0.5} color="#ffffff" roughness={1.0} />
      </mesh>
    </group>
  );
}
