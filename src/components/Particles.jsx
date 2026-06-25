import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Particles({ fishRef, isJumping, gameOver = false, coinsCollectedCount = 0 }) {
  const count = 300; // Increased count for denser splashes
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      active: false,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      scale: 0,
      life: 0,
      type: 'wake'
    }));
  }, [count]);

  // Initialize all particles to scale 0 so they are hidden on mount
  useEffect(() => {
    if (meshRef.current) {
      for (let i = 0; i < count; i++) {
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [count, dummy]);

  const wasJumping = useRef(false);
  const prevCoinsCollected = useRef(0);

  // Helper to spawn a burst of particles
  const spawnBurst = (pos, amount, type) => {
    if (gameOver) return;
    let spawned = 0;
    const colorObj = new THREE.Color();

    for (let i = 0; i < count; i++) {
      if (!particles[i].active) {
        const p = particles[i];
        p.active = true;
        p.life = 1.0;
        p.type = type;
        p.position.copy(pos);
        
        if (type === 'splash') {
          p.position.y = 0; // Spawn at water surface
          // Explode outwards and upwards like a real splash
          p.velocity.set((Math.random() - 0.5) * 10, Math.random() * 8 + 4, (Math.random() - 0.5) * 10);
          p.scale = 0.05 + Math.random() * 0.15; // Smaller, more realistic droplets
          colorObj.set('#ffffff');
        } else if (type === 'coinCollect') {
          // Spawn right at the fish/coin's current Y height
          p.position.y = pos.y + 0.25;
          // Explode in a radial sphere
          p.velocity.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4 + 3, (Math.random() - 0.5) * 6);
          p.scale = 0.08 + Math.random() * 0.08;
          colorObj.set('#FFD700'); // Shiny gold collect particle color
        } else {
          p.position.y = 0; // Spawn at water surface
          // Wake: move slowly outwards and backward
          p.position.x += (Math.random() - 0.5) * 0.5;
          p.position.z += (Math.random() - 0.5) * 0.5;
          p.velocity.set((Math.random() - 0.5) * 3, 0, Math.random() * 6 + 2);
          p.scale = 0.04 + Math.random() * 0.08;
          colorObj.set('#e0f7ff'); // Soft water blue
        }

        if (meshRef.current) {
          meshRef.current.setColorAt(i, colorObj);
        }
        
        spawned++;
        if (spawned >= amount) break;
      }
    }

    if (meshRef.current && meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  };

  // Spawn splash on jump start and end
  useEffect(() => {
    if (gameOver) return;
    if (isJumping && !wasJumping.current && fishRef.current) {
      spawnBurst(fishRef.current.position, 60, 'splash'); // Jump takeoff
    } else if (!isJumping && wasJumping.current && fishRef.current) {
      spawnBurst(fishRef.current.position, 80, 'splash'); // Jump landing (bigger splash)
    }
    wasJumping.current = isJumping;
  }, [isJumping, fishRef, particles, gameOver]);

  // --- Glitter Particles for Coins ---
  const glitterCount = 100;
  const glitterMeshRef = useRef();
  const glitterDummy = useMemo(() => new THREE.Object3D(), []);
  const glitters = useMemo(() => Array.from({ length: glitterCount }, () => ({
    active: false,
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    rotationAxis: new THREE.Vector3(),
    rotationSpeed: 0,
    scale: 0,
    life: 0
  })), [glitterCount]);

  useEffect(() => {
    if (glitterMeshRef.current) {
      for (let i = 0; i < glitterCount; i++) {
        glitterDummy.scale.set(0, 0, 0);
        glitterDummy.updateMatrix();
        glitterMeshRef.current.setMatrixAt(i, glitterDummy.matrix);
      }
      glitterMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [glitterCount, glitterDummy]);

  const spawnGlitter = (pos, amount) => {
    if (gameOver) return;
    let spawned = 0;
    for (let i = 0; i < glitterCount; i++) {
      if (!glitters[i].active) {
        const p = glitters[i];
        p.active = true;
        p.life = 1.0;
        // Spawn slightly above the fish
        p.position.set(pos.x, pos.y + 0.5, pos.z);
        // Explode outward in a smaller sphere
        p.velocity.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
        p.scale = 0.05 + Math.random() * 0.08;
        p.rotationAxis.set(Math.random(), Math.random(), Math.random()).normalize();
        p.rotationSpeed = 10 + Math.random() * 10; // Fast spin
        
        spawned++;
        if (spawned >= amount) break;
      }
    }
  };

  // Spawn coin collect particles
  useEffect(() => {
    if (gameOver) return;
    if (coinsCollectedCount > prevCoinsCollected.current && fishRef.current) {
      spawnGlitter(fishRef.current.position, 5); // Reduced from 12 to 5
    }
    prevCoinsCollected.current = coinsCollectedCount;
  }, [coinsCollectedCount, fishRef, gameOver]);

  useFrame((state, delta) => {
    if (gameOver) return;
    if (fishRef.current && !isJumping) {
      if (Math.random() > 0.4) {
        spawnBurst(fishRef.current.position, 1, 'wake');
      }
    }

    // Update water droplets
    if (meshRef.current) {
      particles.forEach((p, i) => {
        if (p.active) {
          p.life -= delta * (p.type === 'splash' ? 1.5 : 2.5);
          if (p.life <= 0) {
            p.active = false;
            dummy.scale.set(0, 0, 0);
          } else {
            p.position.addScaledVector(p.velocity, delta);
            if (p.type === 'splash') {
              p.velocity.y -= 25 * delta;
            } else {
              p.velocity.y = 0;
            }
            const currentScale = p.scale * Math.max(0, p.life);
            dummy.position.copy(p.position);
            
            // Realistic water motion blur: stretch the droplet vertically based on how fast it's moving
            if (p.type === 'splash') {
              const stretch = 1 + Math.abs(p.velocity.y) * 0.05;
              dummy.scale.set(currentScale, currentScale * stretch, currentScale);
            } else {
              dummy.scale.set(currentScale, currentScale, currentScale);
            }
          }
          dummy.updateMatrix();
          meshRef.current.setMatrixAt(i, dummy.matrix);
        }
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }

    // Update glitter particles
    if (glitterMeshRef.current) {
      glitters.forEach((p, i) => {
        if (p.active) {
          p.life -= delta * 2.0; // Fade out fast
          if (p.life <= 0) {
            p.active = false;
            glitterDummy.scale.set(0, 0, 0);
          } else {
            p.position.addScaledVector(p.velocity, delta);
            p.velocity.y -= 15 * delta; // slight gravity
            // Pulse scale based on life for a twinkle effect
            const twinkle = Math.abs(Math.sin(p.life * 20));
            const currentScale = p.scale * p.life * twinkle;
            
            glitterDummy.position.copy(p.position);
            glitterDummy.scale.set(currentScale, currentScale, currentScale);
            // Spin rapidly
            glitterDummy.setRotationFromAxisAngle(p.rotationAxis, state.clock.elapsedTime * p.rotationSpeed);
          }
          glitterDummy.updateMatrix();
          glitterMeshRef.current.setMatrixAt(i, glitterDummy.matrix);
        }
      });
      glitterMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Water Splashes */}
      <instancedMesh ref={meshRef} args={[null, null, count]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial 
          color="#e0f7ff" 
          transparent={true}
          opacity={0.6} // More transparent like real water
          roughness={0.0} // Completely smooth and shiny
          metalness={0.2} // Slightly reflective
        />
      </instancedMesh>
      
      {/* Coin Glitter */}
      <instancedMesh ref={glitterMeshRef} args={[null, null, glitterCount]}>
        {/* Sharp diamond-like octahedron */}
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial 
          color="#FFF500" 
          emissive="#FFAA00"
          emissiveIntensity={2}
          roughness={0}
          metalness={1}
        />
      </instancedMesh>
    </group>
  );
}
