import React from 'react';

const GameAr: React.FC = () => {
  return (
    <iframe
      title="Game AR"
      src="/ar-standalone.html"
      allow="camera; fullscreen"
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', border: 0, margin: 0, padding: 0 }}
    />
  );
};

export default GameAr;
