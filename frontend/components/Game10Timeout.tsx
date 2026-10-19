import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

type Phase = 'idle' | 'running' | 'stopped';

const TARGET_SECONDS = 10;

const Game10Timeout: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const startTimeRef = useRef<number>(0);

  const startGame = () => {
    setPhase('running');
    startTimeRef.current = Date.now();
  };

  const stopGame = () => {
    const elapsed = Math.round((Date.now() - startTimeRef.current) / 10) / 100;
    setElapsedSeconds(elapsed);
    setPhase('stopped');
  };

  const resetGame = () => {
    setPhase('idle');
    setElapsedSeconds(0);
  };

  const diff = phase === 'stopped' ? Math.round((elapsedSeconds - TARGET_SECONDS) * 100) / 100 : 0;
  const isPerfect = phase === 'stopped' && Math.abs(elapsedSeconds - TARGET_SECONDS) < 0.005;

  return (
    <div className="md-page relative">
      {phase !== 'running' && (
        <div className="fixed top-4 left-4 right-4 z-20 flex justify-between items-center">
          <Link to="/" className="md-btn-ghost inline-flex items-center gap-2 !px-4 !py-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            หน้าหลัก
          </Link>
          {phase === 'stopped' && (
            <button type="button" onClick={resetGame} className="md-btn-ghost !text-emerald-700">
              เล่นอีกครั้ง
            </button>
          )}
        </div>
      )}

      {phase === 'idle' && (
        <button
          type="button"
          onClick={startGame}
          className="min-h-dvh w-full flex flex-col items-center justify-center gap-6 px-6 py-20 transition-all duration-300 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/50 text-white"
        >
          <span className="text-white/90 text-sm font-medium uppercase tracking-[0.2em]">10 Timeout</span>
          <span className="text-2xl md:text-3xl font-bold text-white/90">เป้าหมาย {TARGET_SECONDS} วินาที</span>
          <span className="text-4xl md:text-6xl font-black text-white drop-shadow-lg">เริ่มกด</span>
          <span className="text-white/70 text-sm max-w-xs text-center">
            กดเริ่มแล้วนับในใจ — กดหยุดเมื่อคิดว่าครบ {TARGET_SECONDS} วินาที (ไม่มีการแสดงเวลา)
          </span>
        </button>
      )}

      {phase === 'running' && (
        <button
          type="button"
          onClick={stopGame}
          className="min-h-dvh w-full flex flex-col items-center justify-center gap-6 px-6 py-20 transition-all duration-300 bg-red-600 hover:bg-red-500 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400/50 text-white"
        >
          <span className="text-4xl md:text-6xl font-black text-white drop-shadow-lg">หยุด</span>
          <span className="text-white/70 text-sm">กดเมื่อคิดว่าครบ {TARGET_SECONDS} วินาที</span>
        </button>
      )}

      {phase === 'stopped' && (
        <div className="min-h-dvh w-full flex flex-col items-center justify-center px-6 py-24">
          <div className="md-card w-full max-w-md rounded-[32px] p-8 md:p-12 text-center shadow-md">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-widest mb-1">เป้าหมาย {TARGET_SECONDS} วินาที</p>
            <p className="text-7xl md:text-8xl font-black text-[#FFCC00] tabular-nums mb-1">{elapsedSeconds.toFixed(2)}</p>
            <p className="text-xl text-gray-500 font-medium mb-2">วินาที</p>
            {isPerfect ? (
              <p className="text-emerald-600 font-bold text-lg mb-6">ตรงเป้า!</p>
            ) : (
              <p className="text-gray-500 text-sm mb-6">
                {diff > 0 ? `เกินเป้า ${diff.toFixed(2)} วินาที` : `ไม่ถึงเป้า ${(-diff).toFixed(2)} วินาที`}
              </p>
            )}
            <button type="button" onClick={resetGame} className="md-btn-primary w-full mb-4">
              เล่นอีกครั้ง
            </button>
            <Link to="/" className="md-btn-ghost block w-full text-center">
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game10Timeout;
