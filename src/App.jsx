import React, { useState } from 'react';
import GameScene from './components/GameScene';
import HomePage from './components/HomePage';
import './index.css';

function App() {
  const [hasStarted, setHasStarted] = useState(false);

  return (
    <div className="App w-full h-full">
      {!hasStarted ? (
        <HomePage onStartGame={() => setHasStarted(true)} />
      ) : (
        <GameScene />
      )}
    </div>
  );
}

export default App;
