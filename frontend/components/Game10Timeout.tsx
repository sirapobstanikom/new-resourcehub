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
    <div className="min-h-screen bg-transparent text-white flex flex-col selection:bg-yellow-400 selection:text-black">
      {/* ปุ่มกลับ — อยู่ด้านบนเมื่อไม่ใช่ fullscreen ปุ่ม */}
      {phase !== 'running' && (
        <div className="fixed top-4 left-4 right-4 z-20 flex justify-between items-center">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white/90 hover:bg-white/20 border border-white/10 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            หน้าหลัก
          </Link>
          {phase === 'stopped' && (
            <button
              type="button"
              onClick={resetGame}
              className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40 text-sm font-medium transition-colors"
            >
              เล่นอีกครั้ง
            </button>
          )}
        </div>
      )}

      {phase === 'idle' && (
        <button
          type="button"
          onClick={startGame}
          className="min-h-screen w-full flex flex-col items-center justify-center gap-6 px-6 py-20 transition-all duration-300 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400/50"
        >
          <span className="text-white/90 text-sm font-medium uppercase tracking-[0.2em]">
            10 Timeout
          </span>
          <span className="text-2xl md:text-3xl font-bold text-white/90">
            เป้าหมาย {TARGET_SECONDS} วินาที
          </span>
          <span className="text-4xl md:text-6xl font-black text-white drop-shadow-lg">
            เริ่มกด
          </span>
          <span className="text-white/70 text-sm max-w-xs text-center">
            กดเริ่มแล้วนับในใจ — กดหยุดเมื่อคิดว่าครบ {TARGET_SECONDS} วินาที (ไม่มีการแสดงเวลา)
          </span>
        </button>
      )}

      {phase === 'running' && (
        <button
          type="button"
          onClick={stopGame}
          className="min-h-screen w-full flex flex-col items-center justify-center gap-6 px-6 py-20 transition-all duration-300 bg-red-600 hover:bg-red-500 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-red-400/50"
        >
          <span className="text-4xl md:text-6xl font-black text-white drop-shadow-lg">
            หยุด
          </span>
          <span className="text-white/70 text-sm">
            กดเมื่อคิดว่าครบ {TARGET_SECONDS} วินาที
          </span>
        </button>
      )}

      {phase === 'stopped' && (
        <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-24 bg-transparent">
          <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-8 md:p-12 text-center shadow-2xl shadow-yellow-400/5">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-widest mb-1">
              เป้าหมาย {TARGET_SECONDS} วินาที
            </p>
            <p className="text-7xl md:text-8xl font-black text-yellow-400 tabular-nums mb-1">
              {elapsedSeconds.toFixed(2)}
            </p>
            <p className="text-xl text-gray-400 font-medium mb-2">วินาที</p>
            {isPerfect ? (
              <p className="text-emerald-400 font-bold text-lg mb-6">ตรงเป้า!</p>
            ) : (
              <p className="text-gray-500 text-sm mb-6">
                {diff > 0 ? `เกินเป้า ${diff.toFixed(2)} วินาที` : `ไม่ถึงเป้า ${(-diff).toFixed(2)} วินาที`}
              </p>
            )}
            <button
              type="button"
              onClick={resetGame}
              className="w-full py-4 px-6 rounded-2xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 transition-colors mb-4"
            >
              เล่นอีกครั้ง
            </button>
            <Link
              to="/"
              className="block w-full py-3 px-6 rounded-2xl font-medium bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-colors text-center"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Game10Timeout;
