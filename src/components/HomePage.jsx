import React from 'react';

export default function HomePage({ onStartGame }) {
  const overlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#70d6d1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  };

  const contentStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
    textAlign: 'center',
    padding: '0 1.5rem',
  };

  const logoStyle = {
    width: '250px',
    height: 'auto',
    marginBottom: '1rem',
  };

  const titleStyle = {
    color: 'white',
    fontSize: '4.5rem',
    fontWeight: '900',
    fontFamily: "'Outfit', sans-serif",
    textTransform: 'uppercase',
    textShadow: '5px 5px 0 #2d8a86',
    letterSpacing: '0.05em',
    margin: 0,
    transform: 'rotate(-3deg)',
  };

  const buttonStyle = {
    marginTop: '3rem',
    padding: '1.25rem 5rem',
    backgroundColor: 'white',
    color: '#70d6d1',
    fontSize: '2.5rem',
    fontWeight: '900',
    borderRadius: '9999px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  };

  return (
    <div style={overlayStyle}>
      <div style={contentStyle}>
        <img src="/logo.png" alt="Fishbae Logo" style={logoStyle} />
        <h1 style={titleStyle}>Fishbae 3D</h1>
        <button 
          onClick={onStartGame}
          style={buttonStyle}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.25)'; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)'; }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        >
          Play
        </button>
      </div>
    </div>
  );
}
