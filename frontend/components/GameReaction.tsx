import React, { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

type Phase = 'idle' | 'waiting' | 'green' | 'done' | 'foul';

const MIN_DELAY_MS = 1500;
const MAX_DELAY_MS = 4200;

const GameReaction: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const [bestMs, setBestMs] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const greenAtRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startWait = useCallback(() => {
    clearTimer();
    setPhase('waiting');
    setReactionMs(null);
    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      greenAtRef.current = Date.now();
      setPhase('green');
    }, delay);
  }, [clearTimer]);

  const handleGreenClick = useCallback(() => {
    if (phase !== 'green') return;
    const ms = Math.round(Date.now() - greenAtRef.current);
    setReactionMs(ms);
    setBestMs((prev) => (prev == null ? ms : Math.min(prev, ms)));
    setPhase('done');
  }, [phase]);

  const handleEarlyClick = useCallback(() => {
    if (phase === 'waiting') {
      clearTimer();
      setPhase('foul');
    }
  }, [phase, clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setPhase('idle');
    setReactionMs(null);
    setRound((r) => r + 1);
  }, [clearTimer]);

  React.useEffect(() => () => clearTimer(), [clearTimer]);

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col selection:bg-yellow-400 selection:text-black">
      {phase !== 'green' && phase !== 'waiting' && (
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
          {bestMs != null && phase !== 'idle' && (
            <span className="px-3 py-1.5 rounded-lg bg-amber-400/20 text-amber-300 text-sm font-medium">
              บันทึกที่ดีที่สุด {bestMs} ms
            </span>
          )}
        </div>
      )}

      {/* Idle: เริ่มเกม */}
      {phase === 'idle' && (
        <button
          type="button"
          onClick={startWait}
          className="min-h-screen w-full flex flex-col items-center justify-center gap-6 px-6 py-24 transition-all duration-300 bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-[0.98] focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/50"
        >
          <span className="text-amber-200 text-sm font-medium uppercase tracking-[0.2em]">
            เกมวัดความเร็ว
          </span>
          <span className="text-4xl md:text-5xl font-black text-white drop-shadow-lg text-center">
            กดเมื่อสีเขียว
          </span>
          <span className="text-amber-100 text-lg font-medium">
            รอจอเปลี่ยนเป็นสีเขียว แล้วกดทันที — วัดเวลาตอบสนอง (ms)
          </span>
          <span className="text-amber-200/90 text-sm max-w-sm text-center">
            ห้ามกดก่อนสีเขียว มิฉะนั้นถือว่าฟาล์ว
          </span>
          <span className="text-2xl md:text-3xl font-bold text-white mt-4">
            กดเพื่อเริ่ม
          </span>
        </button>
      )}

      {/* Waiting: รอสีเขียว (ห้ามกด) */}
      {phase === 'waiting' && (
        <button
          type="button"
          onClick={handleEarlyClick}
          className="min-h-screen w-full flex flex-col items-center justify-center gap-6 px-6 py-24 transition-all duration-200 bg-red-900/90 hover:bg-red-800/90 active:scale-[0.99] focus:outline-none"
        >
          <span className="text-4xl md:text-5xl font-black text-red-200 drop-shadow-lg">
            รอ...
          </span>
          <span className="text-red-300/80 text-sm">
            จอจะเปลี่ยนเป็นสีเขียวเมื่อไหร่ก็ได้ — แล้วค่อยกด
          </span>
        </button>
      )}

      {/* Green: กดเลย! */}
      {phase === 'green' && (
        <button
          type="button"
          onClick={handleGreenClick}
          className="min-h-screen w-full flex flex-col items-center justify-center gap-6 px-6 py-24 transition-all duration-100 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300"
        >
          <span className="text-4xl md:text-6xl font-black text-white drop-shadow-lg animate-pulse">
            กด!
          </span>
        </button>
      )}

      {/* Foul: กดเร็วไป */}
      {phase === 'foul' && (
        <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-24 bg-red-950/50">
          <div className="max-w-md w-full rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <p className="text-red-400 font-bold text-2xl mb-2">ฟาล์ว!</p>
            <p className="text-red-300/90 text-sm mb-6">
              กดก่อนที่จอจะเปลี่ยนเป็นสีเขียว ลองใหม่อีกครั้ง
            </p>
            <button
              type="button"
              onClick={reset}
              className="w-full py-4 px-6 rounded-2xl font-bold bg-amber-400 text-black hover:bg-amber-300 transition-colors"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      )}

      {/* Done: แสดงผล */}
      {phase === 'done' && (
        <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-24 bg-transparent">
          <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-8 md:p-12 text-center shadow-2xl shadow-emerald-400/5">
            <p className="text-gray-500 text-sm font-medium uppercase tracking-widest mb-1">
              เวลาตอบสนอง
            </p>
            <p className="text-6xl md:text-7xl font-black text-emerald-400 tabular-nums mb-1">
              {reactionMs}
            </p>
            <p className="text-xl text-gray-400 font-medium mb-4">มิลลิวินาที</p>
            {bestMs != null && bestMs === reactionMs && reactionMs !== null && (
              <p className="text-amber-400 font-bold text-lg mb-4">🏆 บันทึกใหม่!</p>
            )}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={startWait}
                className="w-full py-4 px-6 rounded-2xl font-bold bg-emerald-500 text-white hover:bg-emerald-400 transition-colors"
              >
                เล่นอีกครั้ง
              </button>
              <button
                type="button"
                onClick={reset}
                className="w-full py-3 px-6 rounded-2xl font-medium bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-colors"
              >
                เริ่มรอบใหม่
              </button>
              <Link
                to="/"
                className="block w-full py-3 px-6 rounded-2xl font-medium bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-colors text-center"
              >
                กลับหน้าหลัก
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameReaction;
