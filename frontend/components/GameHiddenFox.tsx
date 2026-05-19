import React from 'react';
import { Link } from 'react-router-dom';

const GameHiddenFox: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <Link
        to="/"
        className="absolute top-3 left-3 z-[60] flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 text-white/90 hover:bg-black/80 border border-white/15 text-sm font-medium backdrop-blur-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        หน้าหลัก
      </Link>
      <iframe
        title="Hidden Fox — Wolf Hunter"
        src="/hidden-fox-game/index.html"
        allow="fullscreen; accelerometer; gyroscope"
        className="w-full h-full border-0"
        style={{ width: '100vw', height: '100vh' }}
      />
    </div>
  );
};

export default GameHiddenFox;
