import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import AdminPanel from './AdminPanel';
import LeaderboardPanel from './LeaderboardPanel';
import MapViewport from './MapViewport';
import {
  DEFAULT_SETTINGS,
  LEADERBOARD_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  FOX_IMAGE,
  normalizeSettings,
} from './constants';
import type {
  GameMap,
  GamePhase,
  GameSettings,
  GuessPosition,
  LeaderboardEntry,
  RegistrationInfo,
  RoundResult,
  WolfPosition,
} from './types';

const HiddenFoxGame: React.FC = () => {
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [missionComplete, setMissionComplete] = useState(false);
  const [registration, setRegistration] = useState<RegistrationInfo>({ name: '', email: '', company: '' });
  const [activeWolves, setActiveWolves] = useState<WolfPosition[]>([]);
  const [guesses, setGuesses] = useState<GuessPosition[]>([]);
  const [roundStartMs, setRoundStartMs] = useState<number | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [foundWolfIndices, setFoundWolfIndices] = useState<number[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [savedAgentName, setSavedAgentName] = useState('');
  const [scoreSaved, setScoreSaved] = useState(false);

  const mapIndex = Math.min(currentRound - 1, settings.maps.length - 1);
  const currentMapUrl = settings.maps[mapIndex]?.url ?? DEFAULT_SETTINGS.maps[0].url;
  const isLastRound = currentRound >= settings.maps.length;

  useEffect(() => {
    const lb = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (lb) {
      try {
        setLeaderboard(JSON.parse(lb) as LeaderboardEntry[]);
      } catch (e) {
        console.error('Failed to load leaderboard', e);
      }
    }
    const st = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (st) {
      try {
        setSettings(normalizeSettings(JSON.parse(st) as Partial<GameSettings>));
      } catch (e) {
        console.error('Failed to load admin settings', e);
      }
    }
  }, []);

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

  const pickWolves = useCallback(
    (map: GameMap | undefined): WolfPosition[] => {
      if (!map) return [];
      return [...map.wolfPositions]
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(settings.wolfCount, map.wolfPositions.length));
    },
    [settings.wolfCount]
  );

  const startRound = useCallback(
    (map: GameMap, round: number) => {
      setActiveWolves(pickWolves(map));
      setGuesses([]);
      setRoundResult(null);
      setMissionComplete(false);
      setRoundStartMs(Date.now());
      setPhase('playing');
      setScoreSaved(false);
      setCurrentRound(round);
      setTimeLeft(settings.timeLimit);
      setFoundWolfIndices([]);
    },
    [pickWolves, settings.timeLimit]
  );

  const beginGame = useCallback(() => {
    const firstMap = settings.maps[0];
    if (!firstMap) return;
    setTotalScore(0);
    startRound(firstMap, 1);
  }, [settings.maps, startRound]);

  const handleRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (registration.name && registration.email && registration.company) {
      setSavedAgentName(registration.name);
      beginGame();
    }
  };

  const nextLevel = useCallback(() => {
    const nextRound = currentRound + 1;
    const map = settings.maps[Math.min(nextRound - 1, settings.maps.length - 1)];
    if (map) startRound(map, nextRound);
  }, [currentRound, settings.maps, startRound]);

  const handleMapClick = useCallback(
    (x: number, y: number, aspect: number) => {
      setGuesses((prev) => {
        const dup = prev.findIndex((g) => {
          const dx = g.x - x;
          const dy = (g.y - y) / (g.aspect ?? 1);
          return Math.sqrt(dx * dx + dy * dy) < 3;
        });
        if (dup > -1) return prev.filter((_, i) => i !== dup);
        if (prev.length >= settings.wolfCount) return prev;
        return [...prev, { x, y, aspect }];
      });
    },
    [settings.wolfCount]
  );

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

      if (bestIdx !== -1 && bestDist < settings.precision) {
        matched.push(bestIdx);
        roundScore += Math.max(10, timeLeft * 5);
        closestDist = bestDist;
      } else {
        allCorrect = false;
        break;
      }
    }

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
  }, [activeWolves, foundWolfIndices, guesses, roundStartMs, settings.precision, timeLeft]);

  const saveScore = () => {
    const name = registration.name || savedAgentName;
    if (!name.trim() || scoreSaved) return;
    const entry: LeaderboardEntry = {
      name: name.trim().toUpperCase(),
      time: totalScore,
      date: new Date().toISOString(),
    };
    const next = [...leaderboard, entry].sort((a, b) => b.time - a.time).slice(0, 10);
    setLeaderboard(next);
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(next));
    setScoreSaved(true);
  };

  const updateSettings = (next: GameSettings) => {
    const normalized = normalizeSettings(next);
    setSettings(normalized);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  };

  const deleteLeaderboardEntry = (index: number) => {
    const next = leaderboard.filter((_, i) => i !== index);
    setLeaderboard(next);
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(next));
  };

  const resetLeaderboard = () => {
    if (!window.confirm('Are you sure you want to clear all leaderboard data?')) return;
    setLeaderboard([]);
    localStorage.removeItem(LEADERBOARD_STORAGE_KEY);
  };

  const goHome = useCallback(() => {
    if (phase === 'playing' || phase === 'submitted') {
      if (
        !window.confirm(
          'Are you sure you want to end the mission? Your current score will be finalized.'
        )
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
    setCurrentRound(1);
    setTimeLeft(0);
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
                    <div style={{ marginTop: 20 }}>
                      <button
                        type="button"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--purple-light)',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                        }}
                        onClick={() => setShowAdmin(true)}
                      >
                        SETTINGS
                      </button>
                    </div>
                  </footer>
                </div>
                <div className="home-right-section">
                  <LeaderboardPanel entries={leaderboard} />
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
                      <div className="registration-actions">
                        <button type="button" className="btn-tactical-v5 secondary" onClick={() => setPhase('idle')}>
                          CANCEL
                        </button>
                        <button type="submit" className="btn-tactical-v5">
                          START
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
                        ROUND: {currentRound}
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
                    mapUrl={currentMapUrl}
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

          {showAdmin && (
            <AdminPanel
              settings={settings}
              leaderboard={leaderboard}
              onClose={() => setShowAdmin(false)}
              onUpdateSettings={updateSettings}
              onDeleteLeaderboardEntry={deleteLeaderboardEntry}
              onResetLeaderboard={resetLeaderboard}
            />
          )}

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
                  {isLastRound ? (
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
                  ) : (
                    <button type="button" className="btn-action-v5" onClick={nextLevel}>
                      NEXT LEVEL
                    </button>
                  )}
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
                </div>
                {scoreSaved ? (
                  <div className="score-saved-badge">SCORE SAVED!</div>
                ) : (
                  <div className="save-score-section">
                    <div style={{ color: 'var(--purple-light)', marginBottom: 15, fontWeight: 'bold' }}>
                      AGENT: {registration.name.toUpperCase()}
                    </div>
                    <button type="button" onClick={saveScore} className="btn-save-score">
                      SAVE SCORE
                    </button>
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
