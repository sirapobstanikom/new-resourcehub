import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import HiddenFoxGame from './hiddenFox/HiddenFoxGame';
import './hiddenFox/hiddenFox.css';
import './hiddenFox/hiddenFoxAdmin.css';

function restorePageScroll(): void {
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
  const root = document.getElementById('root');
  if (root) root.style.overflow = '';
}

const GameHiddenFox: React.FC = () => {
  useEffect(() => {
    return () => restorePageScroll();
  }, []);

  return (
    <div className="hidden-fox-shell fixed inset-0 z-50 bg-[#050506] overflow-hidden">
      <Link
        to="/"
        className="absolute top-3 left-3 z-[10001] flex items-center gap-2 px-3 py-2 rounded-xl bg-black/60 text-white/90 hover:bg-black/80 border border-white/15 text-sm font-medium backdrop-blur-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        หน้าหลัก
      </Link>
      <HiddenFoxGame />
    </div>
  );
};

export default GameHiddenFox;
