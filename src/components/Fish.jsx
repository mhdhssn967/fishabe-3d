import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useGraph } from '@react-three/fiber';
import * as THREE from 'three';
import Particles from './Particles';

export default function Fish({ lane = 0, isJumping = false, onJumpEnd, z = 0, gameOver = false, fishPositionRef, coinsCollectedCount = 0, ...props }) {
  const fishRef = useRef();
  const jumpTime = useRef(0);
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
    if (gameOver) return;

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
          } else {
            // Moon-gravity arc: pow(sin, 0.45) spends much more time near the peak
            const jumpT = (jumpTime.current - prepDuration) / jumpDuration;
            const jumpHeight = 1.8;  // Reduced height
            const moonCurve = Math.pow(Math.sin(jumpT * Math.PI), 0.45);
            fishRef.current.position.y = baseHeight + jumpHeight * moonCurve;
            
            // Pitch: nose up on ascent, level during float, nose down on descent
            targetPitch = (65 * Math.PI / 180) * (1 - 2 * jumpT);
          }
        } else {
          // Jump finished
          fishRef.current.position.y = baseHeight;
          jumpTime.current = 0;
          if (onJumpEnd) onJumpEnd();
        }
      } else {
        fishRef.current.position.y = baseHeight;
      }

      // Smoothly interpolate the pitch rotation
      fishRef.current.rotation.x = THREE.MathUtils.lerp(fishRef.current.rotation.x, targetPitch, 15 * delta);

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
