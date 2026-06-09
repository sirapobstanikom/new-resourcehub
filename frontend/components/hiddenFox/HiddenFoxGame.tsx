import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import LeaderboardPanel from './LeaderboardPanel';
import MapViewport from './MapViewport';
import {
  FOX_IMAGE,
  GAME_TIME_LIMIT_SEC,
  generateFoxSpawns,
  HIDDEN_FOX_COUNT,
  HIDDEN_FOX_MAP_URL,
  HIT_PRECISION,
} from './constants';
import type { GamePhase, GuessPosition, RegistrationInfo, RoundResult, WolfPosition } from './types';
import {
  fetchBestRunForIdentity,
  fetchScoreHallOfFame,
  loadStoredRegistration,
  registerHiddenFoxPlayer,
  saveHiddenFoxRun,
  storeRegistration,
  type BestRunSummary,
  type HallOfFameEntry,
  type SaveRunOutcome,
} from '../../services/hiddenFoxSupabase';
import { isSupabaseConfigured } from '../../lib/supabase';

function distanceToWolf(guess: GuessPosition, wolf: WolfPosition) {
  const aspect = guess.aspect ?? 1;
  const dx = guess.x - wolf.x;
  const dy = (guess.y - wolf.y) / aspect;
  return Math.sqrt(dx * dx + dy * dy);
}

function evaluateGuesses(
  foundWolfIndices: number[],
  guesses: GuessPosition[],
  activeWolves: WolfPosition[],
) {
  const isGuessOnFoundFox = (guess: GuessPosition) =>
    foundWolfIndices.some((idx) => distanceToWolf(guess, activeWolves[idx]) < HIT_PRECISION);

  const newGuesses = guesses.filter((guess) => !isGuessOnFoundFox(guess));
  const matched = [...foundWolfIndices];
  let allCorrect = true;
  let closestDist = 0;

  for (const guess of newGuesses) {
    let bestIdx = -1;
    let bestDist = Infinity;

    activeWolves.forEach((wolf, idx) => {
      if (matched.includes(idx)) return;
      const dist = distanceToWolf(guess, wolf);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });

    if (bestIdx !== -1 && bestDist < HIT_PRECISION) {
      matched.push(bestIdx);
      closestDist = bestDist;
    } else {
      allCorrect = false;
      break;
    }
  }

  return { matched, allCorrect, newGuesses, closestDist };
}

type CountdownStep = 3 | 2 | 1 | 'go';

const HiddenFoxGame: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [missionComplete, setMissionComplete] = useState(false);
  const [registration, setRegistration] = useState<RegistrationInfo>({ name: '', email: '', company: '' });
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [activeWolves, setActiveWolves] = useState<WolfPosition[]>([]);
  const [guesses, setGuesses] = useState<GuessPosition[]>([]);
  const [roundStartMs, setRoundStartMs] = useState<number | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [foundWolfIndices, setFoundWolfIndices] = useState<number[]>([]);
  const [hofEntries, setHofEntries] = useState<HallOfFameEntry[]>([]);
  const [hofLoading, setHofLoading] = useState(false);
  const [hofError, setHofError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [resultSaved, setResultSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [roundSession, setRoundSession] = useState(0);
  const [returningBestRun, setReturningBestRun] = useState<BestRunSummary | null>(null);
  const [isReturningPlayer, setIsReturningPlayer] = useState(false);
  const [countdown, setCountdown] = useState<CountdownStep | null>(null);
  const lastFoxesFoundRef = useRef(0);
  const savingRunRef = useRef(false);
  const completingMissionRef = useRef(false);
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

  useEffect(() => {
    if (phase !== 'idle') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const fireAmbient = () => {
      if (document.visibilityState !== 'visible') return;
      void confetti({
        particleCount: 90,
        spread: 120,
        startVelocity: 42,
        gravity: 0.78,
        ticks: 220,
        scalar: 1.15,
        origin: { x: 0.08 + Math.random() * 0.84, y: 0.02 + Math.random() * 0.1 },
        colors: ['#22d3ee', '#a3e635', '#fbbf24', '#e879f9'],
      });
    };

    fireAmbient();
    const intervalId = window.setInterval(() => {
      fireAmbient();
      fireAmbient();
    }, 650);
    return () => window.clearInterval(intervalId);
  }, [phase]);

  const loadHallOfFame = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setHofError('ยังไม่ได้ตั้งค่า Supabase');
      return;
    }
    setHofLoading(true);
    setHofError(null);
    try {
      const entries = await fetchScoreHallOfFame(10);
      setHofEntries(entries);
    } catch (e) {
      setHofError(e instanceof Error ? e.message : 'โหลด Hall of Fame ไม่สำเร็จ');
    } finally {
      setHofLoading(false);
    }
  }, []);

  type RunSnapshot = {
    completed: boolean;
    completionTimeSec: number;
    foxesFound: number;
    accuracyPercent: number;
  };

  const computeRunSnapshot = useCallback(
    (treatAsWin?: boolean): RunSnapshot | null => {
      if (roundStartMs === null) return null;

      const won =
        treatAsWin ??
        (missionComplete ||
          (phase === 'submitted' && Boolean(roundResult?.isCorrect)));

      const foxesFound = won
        ? HIDDEN_FOX_COUNT
        : Math.max(foundWolfIndices.length, lastFoxesFoundRef.current);

      const accuracyPercent = won ? 100 : (foxesFound / HIDDEN_FOX_COUNT) * 100;

      const completionTimeSec =
        won && roundResult ? roundResult.time : Math.floor((Date.now() - roundStartMs) / 1000);

      return {
        completed: won,
        completionTimeSec,
        foxesFound,
        accuracyPercent,
      };
    },
    [foundWolfIndices.length, missionComplete, phase, roundResult, roundStartMs]
  );

  const saveOutcomeMessage = (outcome: SaveRunOutcome): string => {
    if (outcome === 'updated') return 'อัปเดตสถิติสูงสุดแล้ว!';
    if (outcome === 'unchanged') return 'คะแนนยังไม่เกินสถิติเดิม';
    return 'บันทึกผลแล้ว!';
  };

  const saveRunOnce = useCallback(
    async (treatAsWin?: boolean): Promise<boolean> => {
      if (!isSupabaseConfigured) return false;
      if (resultSaved || savingRunRef.current) return resultSaved;

      const snapshot = computeRunSnapshot(treatAsWin);
      if (!snapshot) return false;
      if (!registration.name.trim() || !registration.email.trim()) return false;

      savingRunRef.current = true;
      try {
        const outcome = await saveHiddenFoxRun({
          playerId,
          registration,
          totalScore,
          completionTimeSec: snapshot.completionTimeSec,
          accuracyPercent: snapshot.accuracyPercent,
          foxesFound: snapshot.foxesFound,
          foxesTotal: HIDDEN_FOX_COUNT,
          completed: snapshot.completed,
        });
        setResultSaved(true);
        setSaveError(null);
        setSaveMessage(saveOutcomeMessage(outcome));
        await loadHallOfFame();
        return true;
      } catch (e) {
        savingRunRef.current = false;
        setSaveError(e instanceof Error ? e.message : 'บันทึกผลไม่สำเร็จ');
        setSaveMessage(null);
        return false;
      }
    },
    [computeRunSnapshot, loadHallOfFame, playerId, registration, resultSaved, totalScore]
  );

  useEffect(() => {
    void loadHallOfFame();
  }, [loadHallOfFame]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 'go') {
      const id = window.setTimeout(() => setCountdown(null), 750);
      return () => clearTimeout(id);
    }

    const id = window.setTimeout(() => {
      setCountdown((step) => (step === 3 ? 2 : step === 2 ? 1 : 'go'));
    }, 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  const isGameplayLocked = countdown !== null;

  useEffect(() => {
    if (phase !== 'playing' || !isMapReady || timeLeft <= 0 || isGameplayLocked) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setPhase('gameover');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isGameplayLocked, isMapReady, phase, timeLeft]);

  useEffect(() => {
    if (phase !== 'playing' || !isMapReady || roundStartMs !== null || isGameplayLocked) return;
    setRoundStartMs(Date.now());
  }, [isGameplayLocked, isMapReady, phase, roundStartMs]);

  useEffect(() => {
    if (phase !== 'playing' || isMapReady) return;
    const unlockId = window.setTimeout(() => {
      setIsMapReady(true);
    }, 2500);
    return () => window.clearTimeout(unlockId);
  }, [isMapReady, phase]);

  const startRound = useCallback(() => {
    setRoundSession((s) => s + 1);
    setActiveWolves(generateFoxSpawns(HIDDEN_FOX_COUNT));
    setGuesses([]);
    setRoundResult(null);
    setMissionComplete(false);
    setRoundStartMs(null);
    setPhase('playing');
    setResultSaved(false);
    setSaveError(null);
    setSaveMessage(null);
    savingRunRef.current = false;
    setTimeLeft(GAME_TIME_LIMIT_SEC);
    setFoundWolfIndices([]);
    setIsMapReady(false);
    lastFoxesFoundRef.current = 0;
    completingMissionRef.current = false;
    setCountdown(3);
    setTotalScore(0);
  }, []);

  const beginGame = useCallback(() => {
    startRound();
  }, [startRound]);

  const openRegistration = useCallback(() => {
    const stored = loadStoredRegistration();
    if (stored) {
      setRegistration(stored);
    }
    setRegisterError(null);
    setReturningBestRun(null);
    setIsReturningPlayer(false);
    setPhase('registering');
  }, []);

  useEffect(() => {
    if (phase !== 'registering' || !isSupabaseConfigured) return;
    const { name, email, company } = registration;
    if (!name.trim() || !email.trim() || !company.trim()) {
      setReturningBestRun(null);
      setIsReturningPlayer(false);
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const best = await fetchBestRunForIdentity(registration);
          setReturningBestRun(best);
          setIsReturningPlayer(Boolean(best));
        } catch {
          setReturningBestRun(null);
          setIsReturningPlayer(false);
        }
      })();
    }, 400);

    return () => clearTimeout(timer);
  }, [phase, registration]);

  const handleRegistration = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration.name || !registration.email || !registration.company) return;

    setRegisterError(null);
    storeRegistration(registration);

    if (isSupabaseConfigured) {
      setRegistering(true);
      try {
        const { player, isReturning } = await registerHiddenFoxPlayer(registration);
        setPlayerId(player.id);
        setIsReturningPlayer(isReturning || Boolean(returningBestRun));
      } catch (err) {
        setRegisterError(err instanceof Error ? err.message : 'ลงทะเบียนไม่สำเร็จ');
        setRegistering(false);
        return;
      }
      setRegistering(false);
    }

    beginGame();
  }, [beginGame, registration, returningBestRun]);

  const handleMapClick = useCallback((x: number, y: number, aspect: number) => {
    if (countdown !== null) return;
    setGuesses((prev) => {
      const dup = prev.findIndex((g) => {
        const dx = g.x - x;
        const dy = (g.y - y) / (g.aspect ?? 1);
        return Math.sqrt(dx * dx + dy * dy) < 3;
      });
      if (dup > -1) return prev.filter((_, i) => i !== dup);
      if (prev.length >= HIDDEN_FOX_COUNT) return prev;
      return [...prev, { x, y, aspect }];
    });
  }, [countdown]);

  const completeMission = useCallback(
    (matched: number[], closestDist: number, roundScore: number) => {
      if (roundStartMs === null || completingMissionRef.current) return;
      completingMissionRef.current = true;

      const remainingTime = timeLeftRef.current;
      const elapsedSec = Math.floor((Date.now() - roundStartMs) / 1000);
      const bonus = remainingTime * 10;
      const finalRoundScore = roundScore + bonus;

      lastFoxesFoundRef.current = matched.length;
      setFoundWolfIndices(matched);
      setTotalScore((s) => s + roundScore + bonus);
      setGuesses([]);
      setRoundResult({
        isCorrect: true,
        distance: closestDist,
        time: elapsedSec,
        score: finalRoundScore,
      });
      setPhase('submitted');
    },
    [roundStartMs],
  );

  const submitFind = useCallback(() => {
    if (countdown !== null) return;
    if (guesses.length === 0 || activeWolves.length === 0 || roundStartMs === null) return;

    const { matched, allCorrect, newGuesses, closestDist } = evaluateGuesses(
      foundWolfIndices,
      guesses,
      activeWolves,
    );
    if (newGuesses.length === 0) return;

    const newlyFound = matched.length - foundWolfIndices.length;
    let roundScore = 0;
    for (let i = 0; i < newlyFound; i++) {
      roundScore += Math.max(10, timeLeft * 5);
    }

    lastFoxesFoundRef.current = matched.length;

    if (allCorrect) {
      if (matched.length === activeWolves.length) {
        completeMission(matched, closestDist, roundScore);
        return;
      }

      setFoundWolfIndices(matched);
      setTotalScore((s) => s + roundScore);
      setGuesses((prev) =>
        prev.filter((guess) => !matched.some((idx) => distanceToWolf(guess, activeWolves[idx]) < HIT_PRECISION)),
      );
    } else {
      setFoundWolfIndices(matched);
      setPhase('gameover');
    }
  }, [activeWolves, completeMission, countdown, foundWolfIndices, guesses, roundStartMs, timeLeft]);

  /** วางหมุดครบ 8 ตัวถูกต้องแล้วจบเกมทันที ไม่ต้องกด FIND */
  useEffect(() => {
    if (countdown !== null) return;
    if (phase !== 'playing' || !isMapReady || guesses.length === 0) return;
    if (activeWolves.length === 0 || roundStartMs === null) return;

    const { matched, allCorrect, newGuesses, closestDist } = evaluateGuesses(
      foundWolfIndices,
      guesses,
      activeWolves,
    );
    if (newGuesses.length === 0 || !allCorrect || matched.length !== activeWolves.length) return;

    const remainingTime = timeLeftRef.current;
    const newlyFound = matched.length - foundWolfIndices.length;
    let roundScore = 0;
    for (let i = 0; i < newlyFound; i++) {
      roundScore += Math.max(10, remainingTime * 5);
    }

    completeMission(matched, closestDist, roundScore);
  }, [activeWolves, completeMission, countdown, foundWolfIndices, guesses, isMapReady, phase, roundStartMs]);

  /** บันทึกผลทุกครั้งที่จบรอบ (ชนะ / แพ้ / หมดเวลา / ออกกลางเกม) */
  useEffect(() => {
    if (phase !== 'gameover') return;
    void saveRunOnce();
  }, [phase, saveRunOnce]);

  const resetToIdle = useCallback(() => {
    setPhase('idle');
    setActiveWolves([]);
    setGuesses([]);
    setRoundResult(null);
    setRoundStartMs(null);
    setTotalScore(0);
    setTimeLeft(0);
    setMissionComplete(false);
    setResultSaved(false);
    setSaveError(null);
    setSaveMessage(null);
    savingRunRef.current = false;
    completingMissionRef.current = false;
    setCountdown(null);
  }, []);

  const goHome = useCallback(async () => {
    const inMission = phase === 'playing' || phase === 'submitted';

    if (inMission) {
      if (!window.confirm('ต้องการออกจากภารกิจหรือไม่? ผลการเล่นจะถูกบันทึก')) {
        return;
      }
      const treatAsWin = phase === 'submitted' && Boolean(roundResult?.isCorrect);
      if (treatAsWin) {
        setMissionComplete(true);
      }
      await saveRunOnce(treatAsWin);
      resetToIdle();
      return;
    }

    if (phase === 'gameover') {
      await saveRunOnce();
      resetToIdle();
      return;
    }

    resetToIdle();
  }, [phase, roundResult, resetToIdle, saveRunOnce]);

  return (
    <div className="fox-protocol-app">
      <link
        href="https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Nunito:wght@400;700;900&display=swap"
        rel="stylesheet"
      />

      <div className="orientation-warning">
        <RotateCcw size={48} className="rotate-icon" />
        <h2>PLEASE ROTATE DEVICE</h2>
        <p>This game is best experienced in landscape mode.</p>
      </div>

      <div className="main-layout">
        <div className="game-container">
          <div className="main-action-area">
            {phase === 'idle' && (
              <div className="idle-screen-v4">
                <div className="home-left-section">
                  <span className="hf-hero-badge">🦊 Gamification Challenge</span>
                  <header>
                    <h1 className="game-title-v5">
                      HIDDEN
                      <br />
                      <span className="gold">FOX</span>
                    </h1>
                    <p className="hf-tagline">ล่าจิ้งจอกบนแผนที่ ค้นหาทั้งหมด 8 ตัว ภายในเวลาที่กำหนด</p>
                  </header>
                  <div className="hf-stat-chips">
                    <div className="hf-stat-chip chip-cyan">
                      <strong>{HIDDEN_FOX_COUNT}</strong>
                      <span>จิ้งจอก</span>
                    </div>
                    <div className="hf-stat-chip chip-coral">
                      <strong>{GAME_TIME_LIMIT_SEC}</strong>
                      <span>วินาที</span>
                    </div>
                    <div className="hf-stat-chip chip-violet">
                      <strong>TOP</strong>
                      <span>10 อันดับ</span>
                    </div>
                  </div>
                  <div className="character-preview-v5">
                    <img src={FOX_IMAGE} alt="Fox" />
                  </div>
                  <footer>
                    <button type="button" className="btn-execute-v5" onClick={openRegistration}>
                      START GAME
                    </button>
                  </footer>
                </div>
                <div className="home-right-section">
                  <LeaderboardPanel entries={hofEntries} loading={hofLoading} error={hofError} />
                </div>
              </div>
            )}

            {phase === 'registering' && (
              <div className="idle-screen-v4 registration-mode">
                <div className="home-right-section registration-container">
                  <div className="alert-card-v5 registration-card">
                    <h2 className="registration-title">ลงทะเบียน</h2>
                    <p className="registration-subtitle">กรอกข้อมูลเพื่อบันทึกคะแนนและขึ้น Hall of Fame</p>
                    {isReturningPlayer && returningBestRun ? (
                      <div className="hf-returning-banner">
                        ยินดีต้อนรับกลับ! สถิติสูงสุดของคุณ{' '}
                        <strong>{returningBestRun.totalScore.toLocaleString()}</strong> คะแนน
                        {returningBestRun.completionTimeSec > 0
                          ? ` (${returningBestRun.completionTimeSec}s)`
                          : ''}
                      </div>
                    ) : null}
                    <form onSubmit={handleRegistration} className="registration-form">
                      <input
                        type="text"
                        required
                        className="reg-input"
                        placeholder="ชื่อ-นามสกุล"
                        value={registration.name}
                        onChange={(e) => setRegistration({ ...registration, name: e.target.value })}
                      />
                      <input
                        type="email"
                        required
                        className="reg-input"
                        placeholder="EMAIL"
                        value={registration.email}
                        onChange={(e) => setRegistration({ ...registration, email: e.target.value })}
                      />
                      <input
                        type="text"
                        required
                        className="reg-input"
                        placeholder="บริษัท / หน่วยงาน"
                        value={registration.company}
                        onChange={(e) => setRegistration({ ...registration, company: e.target.value })}
                      />
                      {registerError ? (
                        <p className="hf-form-error">{registerError}</p>
                      ) : null}
                      <div className="registration-actions">
                        <button type="button" className="btn-tactical-v5 secondary" onClick={() => setPhase('idle')}>
                          ยกเลิก
                        </button>
                        <button type="submit" className="btn-tactical-v5" disabled={registering}>
                          {registering ? 'กำลังลงทะเบียน...' : 'เริ่มภารกิจ'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {(phase === 'playing' || phase === 'submitted' || phase === 'gameover') && (
              <div className="gameplay-layout-v5">
                <div className="gameplay-sidebar">
                  <button type="button" className="btn-ref-exit" onClick={goHome} disabled={!isMapReady && phase === 'playing'}>
                    EXIT
                  </button>
                  <div className="ref-timer-container">
                    <div className="ref-timer-label">เวลา</div>
                    <div className={`ref-timer-value ${timeLeft <= 15 && phase === 'playing' ? 'hf-timer-urgent' : ''}`}>
                      {timeLeft}
                    </div>
                    <div className="hf-sidebar-stats">
                      <span className="hf-sidebar-stat">
                        จิ้งจอก <strong>{foundWolfIndices.length}/{HIDDEN_FOX_COUNT}</strong>
                      </span>
                      <span className="hf-sidebar-stat">
                        คะแนน <strong>{totalScore.toLocaleString()}</strong>
                      </span>
                      <span className="hf-sidebar-stat">
                        หมุด <strong>{guesses.length}/{HIDDEN_FOX_COUNT}</strong>
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-ref-find"
                    onClick={submitFind}
                    disabled={guesses.length === 0 || phase !== 'playing' || !isMapReady || isGameplayLocked}
                  >
                    FIND!
                  </button>
                </div>
                <div className="map-viewport-wrapper hf-map-frame">
                  <MapViewport
                    key={roundSession}
                    mapUrl={HIDDEN_FOX_MAP_URL}
                    roundSession={roundSession}
                    guessPositions={guesses}
                    onMapClick={handleMapClick}
                    onMapReadyChange={setIsMapReady}
                    gameState={phase}
                    wolfPositions={activeWolves}
                    foundWolfIndices={foundWolfIndices}
                  />
                </div>
                {phase === 'playing' && countdown !== null ? (
                  <div className="hf-countdown-lock" aria-live="assertive">
                    <div className="hf-countdown-card">
                      <p className="hf-countdown-label">เตรียมตัว!</p>
                      <div
                        key={countdown}
                        className={`hf-countdown-value${countdown === 'go' ? ' hf-countdown-value--go' : ''}`}
                      >
                        {countdown === 'go' ? 'Go!' : countdown}
                      </div>
                    </div>
                  </div>
                ) : null}
                {phase === 'playing' && !isMapReady && countdown === null ? (
                  <div className="hf-loading-lock" aria-live="polite">
                    <div className="hf-loading-lock-card">
                      <div className="hf-loading-spinner" />
                      <p>กำลังโหลดแผนที่ กรุณารอสักครู่...</p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {phase === 'submitted' && roundResult && (
            <div className="modal-overlay-v4">
              <div className="alert-card-v5">
                <h2 className="alert-title-v5" style={{ color: 'var(--hf-lime)' }}>
                  เจอครบแล้ว!
                </h2>
                <div className="stars-container-v5">
                  <div className="star-v5 active">★</div>
                  <div className="star-v5 active">★</div>
                  <div className="star-v5 active">★</div>
                </div>
                <div className="hf-result-stats">
                  <div className="hf-result-row">
                    <span>คะแนน</span>
                    <span className="val-lime">+{roundResult.score.toLocaleString()}</span>
                  </div>
                  <div className="hf-result-row">
                    <span>เวลา</span>
                    <span className="val-cyan">{roundResult.time}s</span>
                  </div>
                </div>
                <div className="modal-actions-v5">
                  <button
                    type="button"
                    className="btn-action-v5 hf-btn-win"
                    onClick={() => {
                      setMissionComplete(true);
                      setPhase('gameover');
                    }}
                  >
                    ภารกิจสำเร็จ
                  </button>
                  <button type="button" className="btn-action-v5 btn-secondary-v5" onClick={goHome}>
                    กลับหน้าหลัก
                  </button>
                </div>
              </div>
            </div>
          )}

          {phase === 'gameover' && (
            <div className="modal-overlay-v4">
              <div className={`alert-card-v5 game-over-card ${missionComplete ? 'hf-win' : 'hf-lose'}`}>
                <h2
                  className="alert-title-v5"
                  style={{ color: missionComplete ? 'var(--hf-gold)' : 'var(--hf-danger)', fontSize: '2.2rem' }}
                >
                  {missionComplete ? 'ภารกิจสำเร็จ!' : 'หมดเวลา / แพ้!'}
                </h2>
                <div className="final-score-container">
                  <div className="final-score-label">คะแนนรวม</div>
                  <div className="final-score-value">{totalScore.toLocaleString()}</div>
                  {missionComplete && roundResult ? (
                    <p className="hf-mission-meta">
                      เวลา {roundResult.time}s · ความแม่น 100%
                    </p>
                  ) : null}
                </div>
                {resultSaved ? (
                  <div
                    className={`score-saved-badge${
                      saveMessage?.includes('ยังไม่เกิน') ? ' hf-unchanged' : ''
                    }`}
                  >
                    {saveMessage ?? 'บันทึกผลแล้ว!'}
                  </div>
                ) : saveError ? (
                  <p className="hf-form-error hf-form-error-center">{saveError}</p>
                ) : (
                  <div className="score-saved-badge hf-saving">กำลังบันทึกผล...</div>
                )}
                <div className="modal-actions-v5">
                  <button type="button" className="btn-action-v5" onClick={beginGame}>
                    เล่นอีกครั้ง
                  </button>
                  <button type="button" className="btn-action-v5 btn-secondary-v5" onClick={goHome}>
                    กลับหน้าหลัก
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HiddenFoxGame;
