import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Particles({ fishRef, isJumping, gameOver = false, coinsCollectedCount = 0 }) {
  // ── Ripple rings (flat expanding circles on water surface) ────────────────
  const rippleCount = 80;
  const rippleMeshRef = useRef();
  const rippleDummy = useMemo(() => new THREE.Object3D(), []);

  const rippleGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const rippleMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color('#b3f0ff') },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vOpacity;
        void main() {
          vUv = uv;
          vOpacity = instanceColor.r;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying float vOpacity;
        uniform vec3 color;
        void main() {
          float d = distance(vUv, vec2(0.5));
          // Outer ring
          float ring1 = smoothstep(0.5, 0.46, d) * smoothstep(0.40, 0.44, d);
          // Inner ring
          float ring2 = smoothstep(0.38, 0.35, d) * smoothstep(0.29, 0.32, d) * 0.55;
          float alpha = (ring1 + ring2) * vOpacity;
          if (alpha < 0.001) discard;
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    mat.instancing = true;
    return mat;
  }, []);

  const ripples = useMemo(() => {
    return Array.from({ length: rippleCount }, () => ({
      active: false,
      position: new THREE.Vector3(),
      scale: 0,
      maxScale: 1,
      expansionSpeed: 1,
      fadeSpeed: 1,
      life: 0,
      type: 'wake'
    }));
  }, [rippleCount]);

  useEffect(() => {
    if (rippleMeshRef.current) {
      const initColor = new THREE.Color(0, 0, 0);
      for (let i = 0; i < rippleCount; i++) {
        rippleDummy.scale.set(0, 0, 0);
        rippleDummy.updateMatrix();
        rippleMeshRef.current.setMatrixAt(i, rippleDummy.matrix);
        rippleMeshRef.current.setColorAt(i, initColor);
      }
      rippleMeshRef.current.instanceMatrix.needsUpdate = true;
      if (rippleMeshRef.current.instanceColor) {
        rippleMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
  }, [rippleCount, rippleDummy]);

  // ── Splash droplets (3D particles that fly on jump) ──────────────────────
  const splashCount = 120;
  const splashMeshRef = useRef();
  const splashDummy = useMemo(() => new THREE.Object3D(), []);

  const splashes = useMemo(() => {
    return Array.from({ length: splashCount }, () => ({
      active: false,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      scale: 0,
      life: 0,
    }));
  }, [splashCount]);

  useEffect(() => {
    if (splashMeshRef.current) {
      for (let i = 0; i < splashCount; i++) {
        splashDummy.scale.set(0, 0, 0);
        splashDummy.updateMatrix();
        splashMeshRef.current.setMatrixAt(i, splashDummy.matrix);
      }
      splashMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [splashCount, splashDummy]);

  const wasJumping = useRef(false);
  const prevCoinsCollected = useRef(0);

  // ── Spawn helpers ────────────────────────────────────────────────────────
  const spawnRipples = (pos, amount, type) => {
    if (gameOver) return;
    let spawned = 0;
    const colorObj = new THREE.Color();
    for (let i = 0; i < rippleCount; i++) {
      if (!ripples[i].active) {
        const p = ripples[i];
        p.active = true;
        p.life = 1.0;
        p.type = type;
        p.position.copy(pos);
        p.position.y = 0.02;

        if (type === 'splash') {
          p.maxScale = (1.8 + Math.random() * 0.8) * (1.0 + spawned * 0.3);
          p.scale = 0.1 + spawned * 0.2;
          p.expansionSpeed = (4.0 + Math.random() * 1.5) * (1.0 - spawned * 0.1);
          p.fadeSpeed = (1.0 + Math.random() * 0.3) * (0.8 + spawned * 0.1);
          p.position.x += (Math.random() - 0.5) * 0.1;
          p.position.z += (Math.random() - 0.5) * 0.1;
          colorObj.setRGB(1.0, 0, 0);
        } else {
          p.maxScale = 0.5 + Math.random() * 0.3;
          p.scale = 0.08;
          p.expansionSpeed = 1.8 + Math.random() * 0.8;
          p.fadeSpeed = 3.0 + Math.random() * 1.0;
          p.position.z += 0.15;
          colorObj.setRGB(0.65, 0, 0);
        }

        if (rippleMeshRef.current) {
          rippleMeshRef.current.setColorAt(i, colorObj);
        }
        spawned++;
        if (spawned >= amount) break;
      }
    }
    if (rippleMeshRef.current && rippleMeshRef.current.instanceColor) {
      rippleMeshRef.current.instanceColor.needsUpdate = true;
    }
  };

  const spawnSplash = (pos, amount) => {
    if (gameOver) return;
    let spawned = 0;
    const colorObj = new THREE.Color();
    for (let i = 0; i < splashCount; i++) {
      if (!splashes[i].active) {
        const p = splashes[i];
        p.active = true;
        p.life = 1.0;
        p.position.copy(pos);
        p.position.y = 0.05;
        // Spray outward + upward
        p.velocity.set(
          (Math.random() - 0.5) * 6,
          Math.random() * 5 + 2,
          (Math.random() - 0.5) * 6
        );
        p.scale = 0.03 + Math.random() * 0.06;

        // Mix of white and light cyan
        const r = 0.85 + Math.random() * 0.15;
        colorObj.setRGB(r, r, r);
        if (splashMeshRef.current) {
          splashMeshRef.current.setColorAt(i, colorObj);
        }
        spawned++;
        if (spawned >= amount) break;
      }
    }
    if (splashMeshRef.current && splashMeshRef.current.instanceColor) {
      splashMeshRef.current.instanceColor.needsUpdate = true;
    }
  };

  // ── Jump events → splashes + ripples ─────────────────────────────────────
  useEffect(() => {
    if (gameOver) return;
    if (isJumping && !wasJumping.current && fishRef.current) {
      spawnRipples(fishRef.current.position, 3, 'splash');
      spawnSplash(fishRef.current.position, 30);
    } else if (!isJumping && wasJumping.current && fishRef.current) {
      spawnRipples(fishRef.current.position, 5, 'splash');
      spawnSplash(fishRef.current.position, 50);
    }
    wasJumping.current = isJumping;
  }, [isJumping, fishRef, gameOver]);

  // ── Glitter for coin collection ──────────────────────────────────────────
  const glitterCount = 80;
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
        p.position.set(pos.x, pos.y + 0.5, pos.z);
        p.velocity.set((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
        p.scale = 0.05 + Math.random() * 0.08;
        p.rotationAxis.set(Math.random(), Math.random(), Math.random()).normalize();
        p.rotationSpeed = 10 + Math.random() * 10;
        spawned++;
        if (spawned >= amount) break;
      }
    }
  };

  useEffect(() => {
    if (gameOver) return;
    if (coinsCollectedCount > prevCoinsCollected.current && fishRef.current) {
      spawnGlitter(fishRef.current.position, 5);
    }
    prevCoinsCollected.current = coinsCollectedCount;
  }, [coinsCollectedCount, fishRef, gameOver]);

  // ── Per-frame update ─────────────────────────────────────────────────────
  useFrame((state, delta) => {
    if (gameOver) return;

    const currentSpeed = 6;

    // Continuous wake ripples while swimming
    if (fishRef.current && !isJumping) {
      if (Math.random() > 0.4) {
        spawnRipples(fishRef.current.position, 1, 'wake');
      }
    }

    const colorObj = new THREE.Color();

    // ── Update ripples ──────────────────────────────────────────────────
    if (rippleMeshRef.current) {
      ripples.forEach((p, i) => {
        if (p.active) {
          p.life -= delta * p.fadeSpeed;
          if (p.life <= 0) {
            p.active = false;
            rippleDummy.scale.set(0, 0, 0);
          } else {
            p.scale += delta * p.expansionSpeed;
            if (p.scale > p.maxScale) p.scale = p.maxScale;
            p.position.z += delta * currentSpeed;
            rippleDummy.position.copy(p.position);
            rippleDummy.scale.set(p.scale, p.scale, p.scale);
            colorObj.setRGB(p.life, 0, 0);
            rippleMeshRef.current.setColorAt(i, colorObj);
          }
          rippleDummy.updateMatrix();
          rippleMeshRef.current.setMatrixAt(i, rippleDummy.matrix);
        }
      });
      rippleMeshRef.current.instanceMatrix.needsUpdate = true;
      if (rippleMeshRef.current.instanceColor) {
        rippleMeshRef.current.instanceColor.needsUpdate = true;
      }
    }

    // ── Update splash droplets ──────────────────────────────────────────
    if (splashMeshRef.current) {
      splashes.forEach((p, i) => {
        if (p.active) {
          p.life -= delta * 2.0;
          if (p.life <= 0) {
            p.active = false;
            splashDummy.scale.set(0, 0, 0);
          } else {
            p.position.addScaledVector(p.velocity, delta);
            p.velocity.y -= 18 * delta; // gravity
            p.position.z += delta * currentSpeed; // flow with river

            const s = p.scale * Math.max(0, p.life);
            // Stretch vertically for motion blur
            const stretch = 1 + Math.abs(p.velocity.y) * 0.04;
            splashDummy.position.copy(p.position);
            splashDummy.scale.set(s, s * stretch, s);
          }
          splashDummy.updateMatrix();
          splashMeshRef.current.setMatrixAt(i, splashDummy.matrix);
        }
      });
      splashMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // ── Update glitter ──────────────────────────────────────────────────
    if (glitterMeshRef.current) {
      glitters.forEach((p, i) => {
        if (p.active) {
          p.life -= delta * 2.0;
          if (p.life <= 0) {
            p.active = false;
            glitterDummy.scale.set(0, 0, 0);
          } else {
            p.position.addScaledVector(p.velocity, delta);
            p.velocity.y -= 15 * delta;
            const twinkle = Math.abs(Math.sin(p.life * 20));
            const s = p.scale * p.life * twinkle;
            glitterDummy.position.copy(p.position);
            glitterDummy.scale.set(s, s, s);
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
      {/* Water Ripple rings (flat concentric rings on surface) */}
      <instancedMesh ref={rippleMeshRef} args={[rippleGeometry, rippleMaterial, rippleCount]} />

      {/* Splash droplets (3D spheres on jump) */}
      <instancedMesh ref={splashMeshRef} args={[null, null, splashCount]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#d4fbff"
          transparent
          opacity={0.55}
          roughness={0.0}
          metalness={0.15}
        />
      </instancedMesh>

      {/* Coin Glitter */}
      <instancedMesh ref={glitterMeshRef} args={[null, null, glitterCount]}>
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
