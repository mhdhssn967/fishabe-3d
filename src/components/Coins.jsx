import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SCROLL_SPEED = 6;
const SPAWN_Z = -120;
const RESET_Z = 12;

const LANES = [-1.5, 0, 1.5];

const GROUP_COUNT = 3;
const COINS_PER_GROUP = 10;
const TOTAL_COINS = GROUP_COUNT * COINS_PER_GROUP;
const COIN_SPACING_Z = 1.2;

export default function Coins({ speed = 6, fishPositionRef, onCollectCoin }) {
  const normalMeshRef = useRef();
  const specialMeshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initialize group data
  const groups = useMemo(() => {
    return Array.from({ length: GROUP_COUNT }, (_, gIdx) => {
      const startZ = SPAWN_Z + gIdx * 40;
      const laneIdx = Math.floor(Math.random() * LANES.length);

      const specialCoinIdx = Math.floor(Math.random() * COINS_PER_GROUP);
      const coins = Array.from({ length: COINS_PER_GROUP }, (_, cIdx) => {
        const isSpecial = cIdx === specialCoinIdx;
        return {
          indexInGroup: cIdx,
          isSpecial,
          rotSpeed: 2.2 + Math.random() * 1.5,
          rotOffset: Math.random() * Math.PI * 2,
          bobOffset: Math.random() * Math.PI * 2,
          collected: false,
        };
      });

      return { id: gIdx, laneIdx, startZ, coins };
    });
  }, []);

  useFrame((state, delta) => {
    if (speed === 0) return;

    const t = state.clock.elapsedTime;
    const zProgress = delta * speed;
    const fishPos = fishPositionRef && fishPositionRef.current;

    let normalIdx = 0;
    let specialIdx = 0;

    groups.forEach((group) => {
      group.startZ += zProgress;

      const trailingCoinZ = group.startZ - (COINS_PER_GROUP - 1) * COIN_SPACING_Z;
      if (trailingCoinZ > RESET_Z) {
        group.startZ = SPAWN_Z;
        group.laneIdx = Math.floor(Math.random() * LANES.length);
        const newSpecialIdx = Math.floor(Math.random() * COINS_PER_GROUP);
        group.coins.forEach((c, idx) => {
          c.collected = false;
          c.isSpecial = idx === newSpecialIdx;
        });
      }

      group.coins.forEach((coin) => {
        const coinZ = group.startZ - coin.indexInGroup * COIN_SPACING_Z;
        
        // Base Y: normal coins are at 0.2, special coins are high up at 1.5
        const baseY = coin.isSpecial ? 1.5 : 0.2;

        if (!coin.collected && fishPos) {
          if (Math.abs(coinZ - fishPos.z) < 0.9) {
            const cx = LANES[group.laneIdx];
            if (Math.abs(cx - fishPos.x) < 0.6) {
              // Y collision check
              if (Math.abs(baseY - fishPos.y) < 0.8) {
                coin.collected = true;
                if (onCollectCoin) onCollectCoin(coin.isSpecial ? 10 : 1);
              }
            }
          }
        }

        const drop = coinZ < 0 ? Math.pow(Math.abs(coinZ), 2) * 0.001 : 0;
        const x = LANES[group.laneIdx];
        const y = baseY + Math.sin(t * 4.0 + coin.bobOffset) * 0.05 - drop;

        dummy.position.set(x, y, coinZ);
        dummy.rotation.set(Math.PI / 2, 0, coin.rotOffset + t * coin.rotSpeed);
        
        if (coin.collected) {
          dummy.scale.set(0, 0, 0);
        } else {
          // Special coins are bigger
          dummy.scale.setScalar(coin.isSpecial ? 0.75 : 0.35);
        }
        dummy.updateMatrix();

        if (coin.isSpecial) {
          if (specialMeshRef.current) specialMeshRef.current.setMatrixAt(specialIdx++, dummy.matrix);
        } else {
          if (normalMeshRef.current) normalMeshRef.current.setMatrixAt(normalIdx++, dummy.matrix);
        }
      });
    });

    // Hide unused instances
    dummy.scale.set(0, 0, 0);
    dummy.updateMatrix();
    if (normalMeshRef.current) {
      for (let i = normalIdx; i < TOTAL_COINS; i++) normalMeshRef.current.setMatrixAt(i, dummy.matrix);
      normalMeshRef.current.instanceMatrix.needsUpdate = true;
    }
    if (specialMeshRef.current) {
      for (let i = specialIdx; i < TOTAL_COINS; i++) specialMeshRef.current.setMatrixAt(i, dummy.matrix);
      specialMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Normal Coins (1 point) */}
      <instancedMesh ref={normalMeshRef} args={[null, null, TOTAL_COINS]} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.16, 8]} />
        <meshStandardMaterial 
          color="#FFE000" 
          emissive="#FF9F00"
          emissiveIntensity={0.8}
          metalness={1.0} 
          roughness={0.1} 
        />
      </instancedMesh>

      {/* Special Coins (10 points) - Same gold color but slightly shinier/larger */}
      <instancedMesh ref={specialMeshRef} args={[null, null, TOTAL_COINS]} castShadow>
        <cylinderGeometry args={[0.26, 0.26, 0.16, 8]} />
        <meshStandardMaterial 
          color="#FFE000" 
          emissive="#FF9F00"
          emissiveIntensity={1.5}
          metalness={1.0} 
          roughness={0.0} 
        />
      </instancedMesh>
    </group>
  );
}
