import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PrizeCatchCanvas } from './prizeCatch/PrizeCatchCanvas';
import { PRIZE_CATCH_BG_URL, PRIZE_CATCH_THEME } from './prizeCatch/theme';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  GROUP_COUNT,
  assignGroupNumber,
  fetchNumberPool,
  pickBalancedNumber,
  resetNumberPool,
  subscribeNumberPool,
  type NumberPoolStatus,
} from '../services/worktechExpoNumbers';

const GamePrizeCatch: React.FC = () => {
  const [singleHit, setSingleHit] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [coinsCount, setCoinsCount] = useState(0);
  const [pool, setPool] = useState<NumberPoolStatus | null>(null);
  const [currentNumber, setCurrentNumber] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPool = useCallback((next: NumberPoolStatus, keepCurrent = false) => {
    setPool(next);
    if (keepCurrent) return;
    setCurrentNumber(pickBalancedNumber(next));
  }, []);

  const loadPool = useCallback(
    async (keepCurrent = false) => {
      try {
        const next = await fetchNumberPool();
        applyPool(next, keepCurrent);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'โหลดกองเลขไม่สำเร็จ');
      }
    },
    [applyPool]
  );

  useEffect(() => {
    void loadPool();
    return subscribeNumberPool(() => {
      void loadPool(true);
    });
  }, [loadPool]);

  const handleWin = useCallback(async (preferred: number) => {
    const result = await assignGroupNumber(preferred);
    setPool(result.status);
    return result.number;
  }, []);

  const handleNeedNext = useCallback(async () => {
    const next = await fetchNumberPool();
    applyPool(next);
  }, [applyPool]);

  const handleResetPool = async () => {
    if (!window.confirm('ล้างเลขที่แจกไปแล้ว แล้วเริ่มเฉลี่ยใหม่จากศูนย์?')) return;
    setBusy(true);
    try {
      const next = await resetNumberPool();
      applyPool(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'รีเซ็ตกองเลขไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  const minCount = pool?.minCount ?? 0;
  const assignedCount = pool?.assigned.length ?? 0;

  return (
    <div
      className="min-h-screen text-amber-50 selection:bg-amber-400 selection:text-black relative overflow-x-hidden bg-black"
      style={{
        backgroundImage: `url('${PRIZE_CATCH_BG_URL}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className={`absolute inset-0 pointer-events-none ${PRIZE_CATCH_THEME.pageOverlay}`} />

      <div className="relative z-10">
        <div className="fixed top-4 left-4 z-40">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-black/55 px-4 py-2 text-sm font-medium text-amber-100 backdrop-blur-md hover:bg-amber-400/10"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            หน้าหลัก
          </Link>
        </div>

        <main className="max-w-6xl mx-auto p-2 sm:p-4 pt-16 sm:pt-20">
          <div className="mb-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-white/90">
              MindDoJo Gamification
            </p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
              เกมกระโดดรับของรางวัล
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Minddojo WorkTech Expo — โหม่ง 3 ครั้ง แล้วกระโดดตามถึงเส้นชัย ตกหลุม = FAIL
            </p>
          </div>

          <div className={`mb-4 p-4 ${PRIZE_CATCH_THEME.glassPanel}`}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={PRIZE_CATCH_THEME.labelGold}>กองเลขกลุ่ม</p>
                <p className={`mt-1 text-sm ${PRIZE_CATCH_THEME.textBody}`}>
                  แจกไปแล้ว {assignedCount} คน · ทีมที่น้อยสุดมี {minCount} คน
                </p>
                {!isSupabaseConfigured ? (
                  <p className="mt-1 text-[11px] text-amber-200/70">
                    ยังไม่ได้ตั้งค่าฐานข้อมูล — เก็บในเครื่องนี้ชั่วคราว
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => void handleResetPool()}
                disabled={busy}
                className={PRIZE_CATCH_THEME.btnGhost}
              >
                รีเซ็ตกองเลข
              </button>
            </div>
            {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}

            <div className="mt-4 grid grid-cols-3 gap-2 max-w-md">
              {Array.from({ length: GROUP_COUNT }, (_, i) => i + 1).map((n) => {
                const used = pool?.usedByNumber[n] ?? 0;
                const isNext = used === minCount;
                return (
                  <div
                    key={n}
                    className={`rounded-xl border px-1 py-3 text-center transition-all ${
                      currentNumber === n
                        ? PRIZE_CATCH_THEME.cardActive
                        : isNext
                          ? PRIZE_CATCH_THEME.cardNext
                          : PRIZE_CATCH_THEME.cardIdle
                    }`}
                  >
                    <p className="text-2xl font-black">#{n}</p>
                    <p className="text-[10px] opacity-80">{used} คน</p>
                  </div>
                );
              })}
            </div>
          </div>

          <PrizeCatchCanvas
            singleHit={singleHit}
            setSingleHit={setSingleHit}
            cameraOn={cameraOn}
            setCameraOn={setCameraOn}
            debugMode={debugMode}
            setDebugMode={setDebugMode}
            coinsCount={coinsCount}
            setCoinsCount={setCoinsCount}
            currentNumber={currentNumber}
            assignedHistory={pool?.assigned ?? []}
            onWin={handleWin}
            onNeedNextNumber={handleNeedNext}
          />
        </main>
      </div>
    </div>
  );
};

export default GamePrizeCatch;
