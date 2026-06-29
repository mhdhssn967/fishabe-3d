import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useGraph } from '@react-three/fiber';
import * as THREE from 'three';
import Particles from './Particles';

export default function Fish({ lane = 0, isJumping = false, onJumpEnd, onLandAlmost, z = 0, gameOver = false, fishPositionRef, coinsCollectedCount = 0, ...props }) {
  const fishRef = useRef();
  const jumpTime = useRef(0);
  const playedLandSound = useRef(false);
  const baseHeight = -0.2;
  // Load the new fish model and extract its animations
  const { scene, animations } = useGLTF('/fishanim.glb');
  const { nodes, materials } = useGraph(scene);
  const { actions } = useAnimations(animations, fishRef);

  useEffect(() => {
    // Play the built-in swim animation
    const swimAction = actions && (actions['swim'] || Object.values(actions)[0]);
    if (swimAction) {
      if (gameOver) {
        swimAction.paused = true;
      } else {
        swimAction.play();
        swimAction.paused = false;
      }
    }
  }, [actions, gameOver]);

  useFrame((state, delta) => {
    if (gameOver) {
      if (fishRef.current) {
         // Death animation: roll upside down (PI) and sway lazily
         const t = state.clock.elapsedTime;
         fishRef.current.rotation.z = THREE.MathUtils.lerp(fishRef.current.rotation.z, Math.PI, 5 * delta);
         fishRef.current.rotation.x = THREE.MathUtils.lerp(fishRef.current.rotation.x, 0, 5 * delta);
         fishRef.current.rotation.y = THREE.MathUtils.lerp(fishRef.current.rotation.y, Math.sin(t * 3) * 0.2, 5 * delta);
         // Float up slightly
         fishRef.current.position.y = THREE.MathUtils.lerp(fishRef.current.position.y, baseHeight + 0.1, 2 * delta);
      }
      return;
    }

    if (fishRef.current) {
      // Lane interpolation (x-axis)
      // Platform is 8 units wide, let's make lanes at -2.5, 0, 2.5
      const targetX = lane * 1.5; 
      fishRef.current.position.x = THREE.MathUtils.lerp(fishRef.current.position.x, targetX, 10 * delta);

      // Jump logic
      let targetPitch = 0;
      if (isJumping) {
        jumpTime.current += delta;
        const totalDuration = 1;  // Longer for floaty moon feel
        const prepDuration = 0.15;
        const jumpDuration = totalDuration - prepDuration;

        if (jumpTime.current < totalDuration) {
          if (jumpTime.current < prepDuration) {
            // Wind-up phase
            const prepT = jumpTime.current / prepDuration;
            const dipDepth = 0.25;
            fishRef.current.position.y = baseHeight - dipDepth * Math.sin(prepT * Math.PI);
            targetPitch = -(10 * Math.PI / 180) * Math.sin(prepT * Math.PI);
            playedLandSound.current = false;
          } else {
            // Moon-gravity arc: pow(sin, 0.45) spends much more time near the peak
            const jumpT = (jumpTime.current - prepDuration) / jumpDuration;
            const jumpHeight = 1.8;  // Reduced height
            const moonCurve = Math.pow(Math.sin(jumpT * Math.PI), 0.45);
            fishRef.current.position.y = baseHeight + jumpHeight * moonCurve;
            
            // Pitch: nose up on ascent, level during float, nose down on descent
            targetPitch = (65 * Math.PI / 180) * (1 - 2 * jumpT);
            
            // Trigger landing sound slightly before hitting the ground
            if (jumpT > 0.85 && !playedLandSound.current) {
              if (onLandAlmost) onLandAlmost();
              playedLandSound.current = true;
            }
          }
        } else {
          // Jump finished
          fishRef.current.position.y = baseHeight;
          jumpTime.current = 0;
          playedLandSound.current = false;
          if (onJumpEnd) onJumpEnd();
        }
      } else {
        fishRef.current.position.y = baseHeight;
      }

      // Calculate horizontal movement for turning/banking
      const diffX = targetX - fishRef.current.position.x;
      // Turn into the direction of movement (yaw)
      const targetYaw = -diffX * 0.8; 
      // Lean/bank into the turn (roll)
      const targetRoll = -diffX * 0.3;

      // Smoothly interpolate the pitch, yaw, and roll rotations
      fishRef.current.rotation.x = THREE.MathUtils.lerp(fishRef.current.rotation.x, targetPitch, 15 * delta);
      fishRef.current.rotation.y = THREE.MathUtils.lerp(fishRef.current.rotation.y, targetYaw, 15 * delta);
      fishRef.current.rotation.z = THREE.MathUtils.lerp(fishRef.current.rotation.z, targetRoll, 15 * delta);

      // Update shared ref for collision detection
      if (fishPositionRef && fishPositionRef.current) {
        fishPositionRef.current.x = fishRef.current.position.x;
        fishPositionRef.current.y = fishRef.current.position.y;
        fishPositionRef.current.z = 1.5; // Fixed Z coordinate relative to world stream
      }
    }
  });

  return (
    <group>
      <group ref={fishRef} position={[0, baseHeight, z+1.5]} {...props} dispose={null}>
        {/* Render explicit bones and skinnedMesh instead of the full scene to avoid duplicate static meshes.
            Added castShadow to the skinnedMesh so it projects a shadow on the sea floor. */}
        <group scale={0.12} rotation={[25 * (Math.PI / 180), Math.PI, 0]}>
          <primitive object={nodes.Main1} />
          <skinnedMesh 
            castShadow 
            geometry={nodes.tripo_node_1cfb91ff.geometry} 
            material={materials.tripo_mat_1cfb91ff} 
            skeleton={nodes.tripo_node_1cfb91ff.skeleton} 
          />
        </group>
      </group>
      <Particles fishRef={fishRef} isJumping={isJumping} gameOver={gameOver} coinsCollectedCount={coinsCollectedCount} />
    </group>
  );
}
