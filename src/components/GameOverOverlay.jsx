import React from 'react';

export default function GameOverOverlay({ score, restartGame }) {
  const overlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#45c4b0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
    pointerEvents: 'auto',
  };

  const contentStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2rem',
    textAlign: 'center',
    padding: '0 1.5rem',
    width: '100%',
    maxWidth: '500px',
  };

  const headerStyle = {
    color: 'white',
    fontSize: '2.75rem',
    fontWeight: '900',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    textShadow: '0 4px 6px rgba(0,0,0,0.1)',
    margin: 0,
  };

  const scoreContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: '1.5rem 3rem',
    borderRadius: '1.5rem',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  };

  const scoreLabelStyle = {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '1.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    fontWeight: '600',
  };

  const scoreValueStyle = {
    color: 'white',
    fontSize: '4.5rem',
    fontWeight: '900',
    textShadow: '0 10px 15px rgba(0,0,0,0.2)',
    lineHeight: 1,
  };

  const buttonStyle = {
    width: '100%',
    maxWidth: '300px',
    padding: '1rem',
    backgroundColor: 'white',
    color: '#45c4b0',
    fontSize: '1.5rem',
    fontWeight: '900',
    borderRadius: '9999px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  };

  return (
    <div style={overlayStyle}>
      <div style={contentStyle}>
        <h2 style={headerStyle}>Game Over</h2>
        
        <div style={scoreContainerStyle}>
          <span style={scoreLabelStyle}>Your Score</span>
          <span style={scoreValueStyle}>{score}</span>
        </div>
        
        <button 
          onClick={restartGame}
          style={buttonStyle}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.2)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)'; }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
