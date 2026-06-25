import React, { Suspense, useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Loader } from '@react-three/drei';
import * as THREE from 'three';
import Fish from './Fish';
import Ground from './Ground';
import WaterDecorations from './WaterDecorations';
import Obstacles from './Obstacles';
import Coins from './Coins';
import GameOverOverlay from './GameOverOverlay';

export default function GameScene() {
  const [lane, setLane] = useState(0); // -1: left, 0: center, 1: right
  const [isJumping, setIsJumping] = useState(false);
  const [startX, setStartX] = useState(null);
  const [startY, setStartY] = useState(null);

  // Gameplay State
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [gameId, setGameId] = useState(0);
  const [coinsCollectedCount, setCoinsCollectedCount] = useState(0);

  // Audio References
  const coinAudio = useRef(new Audio('/sounds/coin.mp3'));
  const jumpAudio = useRef(new Audio('/sounds/jump.mp3'));

  // Shared ref for high-performance collision detection (prevents React re-renders)
  const fishPositionRef = useRef({ x: 0, y: -0.2, z: 1.5 });

  const playSound = (audio) => {
    try {
      const clone = audio.cloneNode();
      clone.volume = 0.4;
      clone.play().catch(() => {});
    } catch (e) {
      // ignore
    }
  };

  // Play jump sound when jump starts
  useEffect(() => {
    if (isJumping && !gameOver) {
      playSound(jumpAudio.current);
    }
  }, [isJumping, gameOver]);

  const restartGame = () => {
    setScore(0);
    setLane(0);
    setIsJumping(false);
    setGameOver(false);
    setCoinsCollectedCount(0);
    setGameId(prev => prev + 1);
    fishPositionRef.current = { x: 0, y: -0.2, z: 1.5 };
  };

  const handlePointerDown = (e) => {
    if (gameOver) return;
    setStartX(e.clientX);
    setStartY(e.clientY);
  };

  const handlePointerUp = (e) => {
    if (gameOver) return;
    if (startX === null || startY === null) return;
    const diffX = e.clientX - startX;
    const diffY = e.clientY - startY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal swipe
      if (diffX > 50 && lane < 1) setLane(lane + 1);
      else if (diffX < -50 && lane > -1) setLane(lane - 1);
    } else {
      // Vertical swipe
      if (diffY < -50 && !isJumping) setIsJumping(true);
    }
    setStartX(null);
    setStartY(null);
  };

  const speed = gameOver ? 0 : 6;

  return (
    <div 
      className="w-full h-full absolute inset-0 touch-none"
      style={{ 
        backgroundImage: "url('/bg.png?v=6')", 
        backgroundSize: 'contain', 
        // backgroundPosition: 'bottom center',
        // backgroundRepeat: 'no-repeat'
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <Canvas shadows gl={{ powerPreference: 'high-performance' }}>
        {/* Vibrant sky fog - pushed far so trees are fully visible */}
        <fog attach="fog" args={['#a8dfff', 60, 300]} />
        {/* Set up the camera */}
        <PerspectiveCamera makeDefault position={[0, 3, 6]} fov={80} />
        {/* Lock controls to keep camera pointed at the fish without user interaction */}
        <OrbitControls target={[0, 0.5, 0]} enablePan={false} enableZoom={false} enableRotate={false} />
        
        {/* Toony lighting: warm sun + cool sky fill */}
        <ambientLight intensity={0.5} color="#fff4e0" />
        <hemisphereLight skyColor="#a8dfff" groundColor="#3aad5e" intensity={0.7} />
        <directionalLight 
          position={[8, 18, 5]} 
          intensity={2.2} 
          color="#ffe680"
          castShadow 
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
          shadow-camera-near={0.5}
          shadow-camera-far={40}
        />
        {/* Cool fill from the opposite side */}
        <directionalLight position={[-8, 5, -5]} intensity={0.5} color="#a0d8ef" />
        {/* Dedicated fish spotlight to make it pop */}
        <pointLight position={[0, 3, 3]} intensity={3} color="#ffffff" distance={10} decay={1.5} />
        
        <Suspense fallback={null}>
          {/* Fish positioned with props for lane and jumping */}
          <Fish 
            z={0} 
            lane={lane} 
            isJumping={isJumping} 
            onJumpEnd={() => setIsJumping(false)} 
            gameOver={gameOver} 
            fishPositionRef={fishPositionRef}
            coinsCollectedCount={coinsCollectedCount}
          />
          
          {/* The straight moving ground */}
          <Ground position={[0, 0, 0]} speed={speed} />

          {/* Lily pads, flowers & lotus on the water */}
          <WaterDecorations speed={speed} />
          
          {/* Obstacles (rocks and logs) inside the river */}
          <Obstacles 
            key={`obstacles-${gameId}`} 
            speed={speed} 
            fishPositionRef={fishPositionRef} 
            onCollision={() => setGameOver(true)} 
          />
          
          {/* Collectible spinning coins */}
          <Coins 
            key={`coins-${gameId}`} 
            speed={speed} 
            fishPositionRef={fishPositionRef} 
            onCollectCoin={(value = 1) => {
              setScore(prev => prev + value);
              setCoinsCollectedCount(prev => prev + 1);
              playSound(coinAudio.current);
            }} 
          />
        </Suspense>

      </Canvas>
      
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-4">
        {/* Score Display (Top Left) */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          backgroundColor: '#70d6d1',
          color: 'white',
          padding: '0.5rem 1.5rem',
          borderRadius: '9999px',
          fontSize: '1.5rem',
          fontWeight: '900',
          boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          border: '3px solid white'
        }}>
          Score: {score}
        </div>

        {/* Game Over Screen */}
        {gameOver && (
          <GameOverOverlay score={score} restartGame={restartGame} />
        )}
      </div>

      {/* Drei Loader for 3D Assets */}
      <Loader 
        containerStyles={{ background: '#70d6d1' }}
        innerStyles={{ width: '80%', maxWidth: '400px' }}
        barStyles={{ background: 'white', height: '12px' }}
        dataStyles={{ color: 'white', fontSize: '2rem', fontWeight: '900', fontFamily: "'Outfit', sans-serif" }}
      />
    </div>
  );
}
