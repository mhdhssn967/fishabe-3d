import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const SCROLL_SPEED = 6;
const SPAWN_Z = -120;
const RESET_Z = 12;
const RANGE_Z = RESET_Z - SPAWN_Z;

const LANES = [-1.5, 0, 1.5]; // Left, Center, Right lanes

// Preload the obstacle models
useGLTF.preload('/environment/Rock.glb');
useGLTF.preload('/environment/Chopped Log.glb');

export default function Obstacles({ speed = 6, fishPositionRef, onCollision }) {
  // Load models
  const rockGltf = useGLTF('/environment/Rock.glb');
  const logGltf = useGLTF('/environment/Chopped Log.glb');

  // We want 4 active obstacles streaming down the river, spaced out
  const obstacleData = useMemo(() => {
    const data = [];
    const spacing = 35; // Spaced 35 units apart in Z

    for (let i = 0; i < 4; i++) {
      const type = 'rock';
      const laneIdx = Math.floor(Math.random() * LANES.length);
      const z = SPAWN_Z + i * spacing;

      // Random scale offset
      const scale = type === 'rock' ? 0.8 + Math.random() * 0.4 : 0.6 + Math.random() * 0.3;
      const swayOffset = Math.random() * Math.PI * 2;

      data.push({
        id: i,
        type,
        laneIdx,
        z,
        scale,
        swayOffset,
      });
    }
    return data;
  }, []);

  // Pre-clone the obstacle scenes for performance
  const obstacleScenes = useMemo(() => {
    return obstacleData.map((data, i) => {
      const isRock = data.type === 'rock';
      const template = isRock ? rockGltf.scene : logGltf.scene;
      const clone = template.clone(true);

      clone.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          // Enable receiveShadow for logs/rocks if needed, but set to false for performance
          child.receiveShadow = false;
        }
      });

      return clone;
    });
  }, [obstacleData, rockGltf, logGltf]);

  useFrame((state, delta) => {
    if (speed === 0) return;

    const t = state.clock.elapsedTime;
    const zProgress = delta * speed;
    const fishPos = fishPositionRef && fishPositionRef.current;

    obstacleData.forEach((data, i) => {
      const obj = obstacleScenes[i];
      if (!obj) return;

      // Scroll obstacle forward
      data.z += zProgress;

      // Check collision with the fish
      if (fishPos) {
        // Check if the obstacle is close to the fish's Z coordinate (1.5)
        if (Math.abs(data.z - fishPos.z) < 1.0) {
          const ox = LANES[data.laneIdx];
          // Check if obstacle and fish are in the same lane (X-axis alignment)
          if (Math.abs(ox - fishPos.x) < 0.6) {
            // Check Y-axis: if the fish is not jumping over it
            if (fishPos.y < 0.35) {
              if (onCollision) onCollision();
            }
          }
        }
      }

      // Reset when past the camera
      if (data.z > RESET_Z) {
        data.z = SPAWN_Z;
        // Randomize next type and lane
        data.type = 'rock';
        data.laneIdx = Math.floor(Math.random() * LANES.length);
        data.scale = data.type === 'rock' ? 0.8 + Math.random() * 0.4 : 0.6 + Math.random() * 0.3;
        data.swayOffset = Math.random() * Math.PI * 2;

        // Update the clone's internal model geometry structure if the type swapped
        const isRock = data.type === 'rock';
        const newTemplate = isRock ? rockGltf.scene : logGltf.scene;
        
        // Quick swap children
        obj.clear();
        newTemplate.children.forEach(child => {
          const c = child.clone(true);
          c.traverse(mesh => {
            if (mesh.isMesh) {
              mesh.castShadow = true;
              mesh.receiveShadow = false;
            }
          });
          obj.add(c);
        });
      }

      // Calculate curve drop
      const drop = data.z < 0 ? Math.pow(Math.abs(data.z), 2) * 0.001 : 0;
      const x = LANES[data.laneIdx];

      if (data.type === 'rock') {
        // Rock sits on the bottom ground (riverbed is at Y = -2) but tall enough to protrude
        obj.position.set(x, -1.4 - drop, data.z);
        obj.rotation.set(0, data.swayOffset, 0); // static random rotation
        obj.scale.setScalar(data.scale * 1.8);
      } else {
        // Log floats on water surface (Y = 0) with a sway/bob movement
        const bob = Math.sin(t * 1.5 + data.swayOffset) * 0.06;
        const swayRoll = Math.sin(t * 1.8 + data.swayOffset) * 0.08;
        const swayPitch = Math.cos(t * 1.2 + data.swayOffset) * 0.05;

        // Center logs in a specific lane (x) and scale down by 4x
        const logRotY = 0; // Rotated 90 degrees from vertical to make it horizontal
        obj.position.set(x, -0.05 + bob - drop, data.z);
        
        // Lock Y-rotation to horizontal axis + add subtle sway roll/pitch
        obj.rotation.set(swayPitch, logRotY, swayRoll);
        
        // Scale it down to a smaller size
        obj.scale.setScalar(data.scale * 0.45);
      }
    });
  });

  return (
    <group>
      {obstacleScenes.map((obj, i) => (
        <primitive key={i} object={obj} />
      ))}
    </group>
  );
}
