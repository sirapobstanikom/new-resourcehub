import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
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
  fetchAccuracyHallOfFame,
  fetchFastestHallOfFame,
  registerHiddenFoxPlayer,
  saveHiddenFoxRun,
  type HallOfFameEntry,
} from '../../services/hiddenFoxSupabase';
import { isSupabaseConfigured } from '../../lib/supabase';

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
  const [fastestHof, setFastestHof] = useState<HallOfFameEntry[]>([]);
  const [accuracyHof, setAccuracyHof] = useState<HallOfFameEntry[]>([]);
  const [hofLoading, setHofLoading] = useState(false);
  const [hofError, setHofError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [resultSaved, setResultSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const lastFoxesFoundRef = useRef(0);
  const savingRunRef = useRef(false);

  const loadHallOfFame = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setHofError('ยังไม่ได้ตั้งค่า Supabase');
      return;
    }
    setHofLoading(true);
    setHofError(null);
    try {
      const [fastest, accuracy] = await Promise.all([
        fetchFastestHallOfFame(10),
        fetchAccuracyHallOfFame(10),
      ]);
      setFastestHof(fastest);
      setAccuracyHof(accuracy);
    } catch (e) {
      setHofError(e instanceof Error ? e.message : 'โหลด Hall of Fame ไม่สำเร็จ');
    } finally {
      setHofLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHallOfFame();
  }, [loadHallOfFame]);

  useEffect(() => {
    if (phase !== 'playing' || timeLeft <= 0) return;
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
  }, [phase, timeLeft]);

  const persistRun = useCallback(
    async (payload: {
      completed: boolean;
      completionTimeSec: number | null;
      foxesFound: number;
      accuracyPercent: number;
    }) => {
      if (!isSupabaseConfigured) return;
      try {
        await saveHiddenFoxRun({
          playerId,
          registration,
          completionTimeSec: payload.completionTimeSec,
          accuracyPercent: payload.accuracyPercent,
          foxesFound: payload.foxesFound,
          foxesTotal: HIDDEN_FOX_COUNT,
          completed: payload.completed,
        });
        setResultSaved(true);
        setSaveError(null);
        await loadHallOfFame();
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'บันทึกผลไม่สำเร็จ');
      }
    },
    [loadHallOfFame, playerId, registration]
  );

  const startRound = useCallback(() => {
    setActiveWolves(generateFoxSpawns(HIDDEN_FOX_COUNT));
    setGuesses([]);
    setRoundResult(null);
    setMissionComplete(false);
    setRoundStartMs(Date.now());
    setPhase('playing');
    setResultSaved(false);
    setSaveError(null);
    savingRunRef.current = false;
    setTimeLeft(GAME_TIME_LIMIT_SEC);
    setFoundWolfIndices([]);
    lastFoxesFoundRef.current = 0;
    setTotalScore(0);
  }, []);

  const beginGame = useCallback(() => {
    startRound();
  }, [startRound]);

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registration.name || !registration.email || !registration.company) return;

    setRegisterError(null);
    if (isSupabaseConfigured) {
      setRegistering(true);
      try {
        const player = await registerHiddenFoxPlayer(registration);
        setPlayerId(player.id);
      } catch (err) {
        setRegisterError(err instanceof Error ? err.message : 'ลงทะเบียนไม่สำเร็จ');
        setRegistering(false);
        return;
      }
      setRegistering(false);
    }

    beginGame();
  };

  const handleMapClick = useCallback((x: number, y: number, aspect: number) => {
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
  }, []);

  const submitFind = useCallback(() => {
    if (guesses.length === 0 || activeWolves.length === 0 || roundStartMs === null) return;

    const matched = [...foundWolfIndices];
    let roundScore = 0;
    let allCorrect = true;
    let closestDist = 0;

    for (const guess of guesses) {
      const aspect = guess.aspect ?? 1;
      let bestIdx = -1;
      let bestDist = Infinity;

      activeWolves.forEach((wolf, idx) => {
        if (matched.includes(idx)) return;
        const dx = guess.x - wolf.x;
        const dy = (guess.y - wolf.y) / aspect;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });

      if (bestIdx !== -1 && bestDist < HIT_PRECISION) {
        matched.push(bestIdx);
        roundScore += Math.max(10, timeLeft * 5);
        closestDist = bestDist;
      } else {
        allCorrect = false;
        break;
      }
    }

    lastFoxesFoundRef.current = matched.length;

    if (allCorrect) {
      setFoundWolfIndices(matched);
      setTotalScore((s) => s + roundScore);

      if (matched.length === activeWolves.length) {
        const elapsedSec = Math.floor((Date.now() - roundStartMs) / 1000);
        const bonus = timeLeft * 10;
        const finalRoundScore = roundScore + bonus;
        setTotalScore((s) => s + bonus);
        setRoundResult({
          isCorrect: true,
          distance: closestDist,
          time: elapsedSec,
          score: finalRoundScore,
        });
        setPhase('submitted');
      }
    } else {
      setPhase('gameover');
    }
  }, [activeWolves, foundWolfIndices, guesses, roundStartMs, timeLeft]);

  useEffect(() => {
    if (phase !== 'gameover' || resultSaved || savingRunRef.current) return;
    savingRunRef.current = true;

    const foxesFound = missionComplete
      ? HIDDEN_FOX_COUNT
      : Math.max(foundWolfIndices.length, lastFoxesFoundRef.current);

    const accuracyPercent = missionComplete ? 100 : (foxesFound / HIDDEN_FOX_COUNT) * 100;
    const completionTimeSec =
      missionComplete && roundResult
        ? roundResult.time
        : roundStartMs
          ? Math.floor((Date.now() - roundStartMs) / 1000)
          : null;

    void persistRun({
      completed: missionComplete,
      completionTimeSec,
      foxesFound,
      accuracyPercent,
    });
  }, [phase, missionComplete, resultSaved, foundWolfIndices, roundResult, roundStartMs, persistRun]);

  const goHome = useCallback(() => {
    if (phase === 'playing' || phase === 'submitted') {
      if (
        !window.confirm('ต้องการออกจากภารกิจหรือไม่? ผลการเล่นจะถูกบันทึก')
      ) {
        return;
      }
      setPhase('gameover');
      return;
    }
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
    savingRunRef.current = false;
  }, [phase]);

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
                  <header>
                    <h1 className="game-title-v5">
                      HIDDEN
                      <br />
                      <span className="gold">FOX</span>
                    </h1>
                  </header>
                  <div className="character-preview-v5" style={{ margin: '30px 0' }}>
                    <img src={FOX_IMAGE} alt="Fox" />
                  </div>
                  <footer>
                    <button type="button" className="btn-execute-v5" onClick={() => setPhase('registering')}>
                      PLAY
                    </button>
                  </footer>
                </div>
                <div className="home-right-section">
                  <LeaderboardPanel
                    fastest={fastestHof}
                    accuracy={accuracyHof}
                    loading={hofLoading}
                    error={hofError}
                  />
                </div>
              </div>
            )}

            {phase === 'registering' && (
              <div className="idle-screen-v4 registration-mode">
                <div className="home-right-section registration-container">
                  <div className="alert-card-v5 registration-card">
                    <h2 className="registration-title">REGISTRATION</h2>
                    <form onSubmit={handleRegistration} className="registration-form">
                      <input
                        type="text"
                        required
                        className="reg-input"
                        placeholder="FULL NAME"
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
                        placeholder="COMPANY"
                        value={registration.company}
                        onChange={(e) => setRegistration({ ...registration, company: e.target.value })}
                      />
                      {registerError ? (
                        <p style={{ color: 'var(--red)', fontSize: '0.85rem', margin: 0 }}>{registerError}</p>
                      ) : null}
                      <div className="registration-actions">
                        <button type="button" className="btn-tactical-v5 secondary" onClick={() => setPhase('idle')}>
                          CANCEL
                        </button>
                        <button type="submit" className="btn-tactical-v5" disabled={registering}>
                          {registering ? 'กำลังลงทะเบียน...' : 'START'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {(phase === 'playing' || phase === 'submitted' || phase === 'gameover') && (
              <div
                className="gameplay-layout-v5"
                style={{ display: 'flex', flexDirection: 'row', height: '100%', width: '100%', padding: 20 }}
              >
                <div
                  className="gameplay-sidebar"
                  style={{
                    width: 160,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                  }}
                >
                  <button type="button" className="btn-ref-exit" onClick={goHome}>
                    EXIT
                  </button>
                  <div className="ref-timer-container">
                    <div className="ref-timer-label">TIME</div>
                    <div className="ref-timer-value">{timeLeft}</div>
                    <div
                      style={{
                        marginTop: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 5,
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', color: 'var(--purple-light)', fontWeight: 'bold' }}>
                        FOXES: {foundWolfIndices.length}/{HIDDEN_FOX_COUNT}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--purple-light)', fontWeight: 'bold' }}>
                        SCORE: {totalScore.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-ref-find"
                    onClick={submitFind}
                    disabled={guesses.length === 0 || phase !== 'playing'}
                  >
                    FIND!
                  </button>
                </div>
                <div
                  className="map-viewport-wrapper"
                  style={{
                    flex: 1,
                    position: 'relative',
                    borderRadius: 30,
                    overflow: 'hidden',
                    border: '4px solid rgba(255,255,255,0.1)',
                    marginLeft: 20,
                  }}
                >
                  <MapViewport
                    mapUrl={HIDDEN_FOX_MAP_URL}
                    guessPositions={guesses}
                    onMapClick={handleMapClick}
                    gameState={phase}
                    wolfPositions={activeWolves}
                    foundWolfIndices={foundWolfIndices}
                  />
                </div>
              </div>
            )}
          </div>

          {phase === 'submitted' && roundResult && (
            <div className="modal-overlay-v4">
              <div className="alert-card-v5">
                <h2 className="alert-title-v5" style={{ color: 'var(--neon-green)' }}>
                  FOUND IT!
                </h2>
                <div className="stars-container-v5">
                  <div className="star-v5 active">★</div>
                  <div className="star-v5 active">★</div>
                  <div className="star-v5 active">★</div>
                </div>
                <div
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: 15,
                    borderRadius: 15,
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span>SCORE</span>
                    <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>+{roundResult.score}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>TIME</span>
                    <span style={{ color: 'var(--neon-green)', fontWeight: 'bold' }}>{roundResult.time}s</span>
                  </div>
                </div>
                <div className="modal-actions-v5">
                  <button
                    type="button"
                    className="btn-action-v5"
                    style={{ background: 'var(--neon-green)', borderBottomColor: 'var(--neon-green-dark)', color: '#000' }}
                    onClick={() => {
                      setPhase('gameover');
                      setMissionComplete(true);
                    }}
                  >
                    MISSION ACCOMPLISHED
                  </button>
                  <button type="button" className="btn-action-v5 btn-secondary-v5" onClick={goHome}>
                    HOME
                  </button>
                </div>
              </div>
            </div>
          )}

          {phase === 'gameover' && (
            <div className="modal-overlay-v4">
              <div
                className="alert-card-v5 game-over-card"
                style={{ borderColor: missionComplete ? 'var(--gold)' : 'var(--red)' }}
              >
                <h2
                  className="alert-title-v5"
                  style={{ color: missionComplete ? 'var(--gold)' : 'var(--red)', fontSize: '2.5rem' }}
                >
                  {missionComplete ? 'MISSION COMPLETE!' : 'GAME OVER!'}
                </h2>
                <div className="final-score-container">
                  <div className="final-score-label">FINAL SCORE</div>
                  <div className="final-score-value">{totalScore.toLocaleString()}</div>
                  {missionComplete && roundResult ? (
                    <p style={{ color: 'var(--purple-light)', marginTop: 10, fontWeight: 700 }}>
                      เวลา {roundResult.time}s · ความแม่น 100%
                    </p>
                  ) : null}
                </div>
                {resultSaved ? (
                  <div className="score-saved-badge">บันทึกผลแล้ว!</div>
                ) : saveError ? (
                  <p style={{ color: 'var(--red)', textAlign: 'center' }}>{saveError}</p>
                ) : (
                  <div className="score-saved-badge" style={{ opacity: 0.7 }}>
                    กำลังบันทึกผล...
                  </div>
                )}
                <div className="modal-actions-v5">
                  <button type="button" className="btn-action-v5" onClick={beginGame}>
                    TRY AGAIN
                  </button>
                  <button type="button" className="btn-action-v5 btn-secondary-v5" onClick={goHome}>
                    HOME
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
