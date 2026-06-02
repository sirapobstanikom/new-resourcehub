import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import HiddenFoxGame from './hiddenFox/HiddenFoxGame';
import './hiddenFox/hiddenFox.css';

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
    <div className="hidden-fox-shell fixed inset-0 z-50 overflow-hidden bg-[#07070f]">
      <Link
        to="/"
        className="hf-back-home absolute top-3 left-3 z-[10001] flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold backdrop-blur-md transition-all"
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
