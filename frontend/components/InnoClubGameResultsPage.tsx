import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  formatMoney,
  getTopTeamsByMoney,
  INNOCLUB_GAME_TEAMS_TABLE,
  isInnoClubGameTableMissingError,
  mapInnoClubGameTeamRow,
  parseMoney,
  type InnoClubGameTeam,
  type InnoClubRankedTeam,
} from '../lib/innoclubGame';
import { innoclubGameAudio } from '../lib/innoclubGameAudio';

type RevealStage = 'finalists' | 'champion';

function useCountUp(target: number, active: boolean, durationMs = 1800): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, durationMs]);

  return value;
}

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${(i * 37) % 100}%`,
  delay: `${(i % 9) * 0.35}s`,
  duration: `${7 + (i % 6)}s`,
  size: 2 + (i % 4),
}));

const InnoClubGameResultsPage: React.FC = () => {
  const [teams, setTeams] = useState<InnoClubGameTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stage, setStage] = useState<RevealStage>('finalists');
  const [liveConnected, setLiveConnected] = useState(false);
  const [championEntered, setChampionEntered] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [audioReady, setAudioReady] = useState(false);

  const loadTeams = useCallback(async (options?: { silent?: boolean }) => {
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase');
      setLoading(false);
      return;
    }
    if (!options?.silent) setLoading(true);
    const { data, error: fetchError } = await supabase
      .from(INNOCLUB_GAME_TEAMS_TABLE)
      .select('id, name, money, sort_order, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('money', { ascending: false });
    if (!options?.silent) setLoading(false);
    if (fetchError) {
      setError(
        isInnoClubGameTableMissingError(fetchError.message)
          ? 'ยังไม่มีตารางทีมเกม — ให้แอดมินรัน SQL ในหน้ากรอกทีมก่อน'
          : fetchError.message
      );
      return;
    }
    setError('');
    setTeams(((data as Record<string, unknown>[]) || []).map(mapInnoClubGameTeamRow));
  }, []);

  useEffect(() => {
    void loadTeams();
    if (!isSupabaseConfigured) return;

    const refresh = () => {
      void loadTeams({ silent: true });
    };

    const channel = supabase
      .channel('innoclub-game-results-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: INNOCLUB_GAME_TEAMS_TABLE },
        refresh
      )
      .subscribe((status) => {
        setLiveConnected(status === 'SUBSCRIBED');
      });

    const pollId = window.setInterval(refresh, 8000);

    return () => {
      window.clearInterval(pollId);
      setLiveConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [loadTeams]);

  const top4 = useMemo(() => getTopTeamsByMoney(teams, 4), [teams]);
  const champion = top4[0] as InnoClubRankedTeam | undefined;
  const runnersUp = top4.slice(1);
  const countedMoney = useCountUp(parseMoney(champion?.money ?? 0), stage === 'champion' && championEntered);

  useEffect(() => {
    if (stage !== 'champion') {
      setChampionEntered(false);
      return;
    }
    const t = window.setTimeout(() => setChampionEntered(true), 280);
    return () => window.clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    return () => {
      innoclubGameAudio.dispose();
    };
  }, []);

  useEffect(() => {
    if (!audioReady || !soundOn) {
      innoclubGameAudio.stopSuspense(200);
      return;
    }
    if (stage === 'finalists' && top4.length > 0) {
      void innoclubGameAudio.startSuspense();
    } else {
      innoclubGameAudio.stopSuspense(300);
    }
  }, [audioReady, soundOn, stage, top4.length]);

  const enableAudio = useCallback(async () => {
    await innoclubGameAudio.unlock();
    innoclubGameAudio.setMuted(!soundOn);
    setAudioReady(true);
    if (soundOn && stage === 'finalists') {
      await innoclubGameAudio.startSuspense();
    }
  }, [soundOn, stage]);

  const toggleSound = useCallback(async () => {
    const next = !soundOn;
    setSoundOn(next);
    if (!audioReady) {
      await innoclubGameAudio.unlock();
      setAudioReady(true);
    }
    innoclubGameAudio.setMuted(!next);
    if (next && stage === 'finalists' && top4.length > 0) {
      await innoclubGameAudio.startSuspense();
    } else if (!next) {
      innoclubGameAudio.stopSuspense(150);
    }
  }, [soundOn, audioReady, stage, top4.length]);

  const goNext = useCallback(() => {
    if (stage !== 'finalists' || top4.length === 0) return;
    const run = async () => {
      if (!audioReady) {
        await innoclubGameAudio.unlock();
        innoclubGameAudio.setMuted(!soundOn);
        setAudioReady(true);
      }
      setStage('champion');
      if (soundOn) {
        await innoclubGameAudio.playReveal();
      }
    };
    void run();
  }, [stage, top4.length, audioReady, soundOn]);

  const goBack = useCallback(() => {
    if (stage !== 'champion') return;
    setStage('finalists');
    if (audioReady && soundOn) {
      void innoclubGameAudio.startSuspense();
    }
  }, [stage, audioReady, soundOn]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        if (!audioReady) void enableAudio();
        goNext();
      }
      if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'PageUp') {
        e.preventDefault();
        goBack();
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        void toggleSound();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goBack, toggleSound, audioReady, enableAudio]);

  return (
    <div className="icg-stage relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden text-white">
      {/* Atmosphere layers */}
      <div className="icg-aurora pointer-events-none absolute inset-0" aria-hidden />
      <div className="icg-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="icg-scanlines pointer-events-none absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {PARTICLES.map((p) => (
          <span
            key={p.id}
            className="icg-particle absolute rounded-full bg-cyan-300/70"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      <header className="relative z-20 shrink-0 border-b border-cyan-400/15 bg-black/40 px-[clamp(1rem,3vw,2.5rem)] py-[clamp(0.55rem,1.3vh,1.1rem)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="icg-mono text-[clamp(0.6rem,1.1vw,0.8rem)] font-bold uppercase tracking-[0.35em] text-cyan-300/90">
              InnoClub · Innovation Arena
            </p>
            <h1 className="icg-display truncate text-[clamp(1.25rem,3vw,2.4rem)] font-black tracking-wide text-white">
              {stage === 'finalists' ? 'FINALISTS SIGNAL' : 'CHAMPION UNLOCKED'}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => void toggleSound()}
              className={`icg-mono rounded-full px-3 py-1.5 text-[clamp(0.55rem,0.95vw,0.72rem)] font-bold tracking-widest transition-colors ${
                soundOn
                  ? 'border border-amber-300/40 bg-amber-400/10 text-amber-100'
                  : 'border border-white/15 bg-white/5 text-zinc-400'
              }`}
              title="กด M เพื่อเปิด/ปิดเสียง"
            >
              {soundOn ? '♪ SOUND ON' : 'MUTE'}
            </button>
            <span
              className={`icg-mono rounded-full px-3 py-1.5 text-[clamp(0.55rem,0.95vw,0.72rem)] font-bold tracking-widest ${
                liveConnected
                  ? 'border border-cyan-400/40 bg-cyan-400/10 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                  : 'border border-white/10 bg-white/5 text-zinc-500'
              }`}
            >
              {liveConnected ? '● LIVE FEED' : 'SYNC…'}
            </span>
            {stage === 'champion' && (
              <button
                type="button"
                onClick={goBack}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-[clamp(0.75rem,1.3vw,0.95rem)] font-semibold text-white/90 hover:bg-white/10"
              >
                ย้อนกลับ
              </button>
            )}
          </div>
        </div>
      </header>

      {!audioReady && top4.length > 0 && !loading && !error && (
        <div className="relative z-30 flex shrink-0 justify-center px-4 py-2">
          <button
            type="button"
            onClick={() => void enableAudio()}
            className="icg-cta rounded-2xl px-6 py-3 text-[clamp(0.9rem,1.8vw,1.2rem)] font-black text-black shadow-[0_0_30px_rgba(34,211,238,0.35)]"
          >
            เปิดเสียงระทึกใจ
          </button>
        </div>
      )}

      <main className="relative z-20 mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col px-[clamp(1rem,3vw,2.5rem)] py-[clamp(0.65rem,1.8vh,1.5rem)]">
        {loading ? (
          <div className="m-auto flex flex-col items-center gap-4">
            <div className="icg-loader h-14 w-14 rounded-full border-2 border-cyan-400/20 border-t-cyan-300" />
            <p className="icg-mono text-[clamp(0.9rem,2vw,1.2rem)] tracking-[0.2em] text-cyan-100/70">
              LOADING MATRIX…
            </p>
          </div>
        ) : error ? (
          <div className="m-auto max-w-3xl rounded-2xl border border-red-400/40 bg-red-500/10 px-6 py-5 text-[clamp(1rem,2vw,1.3rem)] text-red-200">
            {error}
          </div>
        ) : top4.length === 0 ? (
          <div className="m-auto rounded-3xl border border-cyan-400/20 bg-white/5 px-8 py-12 text-center backdrop-blur">
            <p className="text-[clamp(1.2rem,2.8vw,1.9rem)] font-bold text-white">ยังไม่มีทีมที่มีคะแนน</p>
            <p className="mt-3 text-[clamp(0.9rem,1.6vw,1.15rem)] text-white/55">
              ให้แอดมินกรอกทีมและเงินในหน้า Admin ก่อน
            </p>
          </div>
        ) : stage === 'finalists' ? (
          <section className="flex min-h-0 flex-1 flex-col gap-[clamp(0.6rem,1.8vh,1.25rem)]">
            <div className="shrink-0 text-center">
              <div className="icg-badge mx-auto inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-1.5">
                <span className="icg-pulse-dot h-2 w-2 rounded-full bg-amber-300" />
                <span className="icg-mono text-[clamp(0.65rem,1.1vw,0.85rem)] font-bold tracking-[0.28em] text-amber-200">
                  TOP SIGNAL · 4 TEAMS
                </span>
              </div>
              <h2 className="icg-display mt-3 text-[clamp(1.5rem,4.2vw,3.1rem)] font-black leading-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-amber-200">
                4 ทีมที่ทำเงินได้สูงสุด
              </h2>
              <p className="mt-2 text-[clamp(0.8rem,1.4vw,1.05rem)] text-white/50">
                กดถัดไปเพื่อปลดล็อกอันดับ 1 และจำนวนเงิน
              </p>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-[clamp(0.55rem,1.4vh,1rem)] sm:grid-cols-2 sm:grid-rows-2">
              {top4.map((team, index) => (
                <article
                  key={team.id}
                  className="icg-card group relative flex min-h-0 flex-col justify-center overflow-hidden rounded-[clamp(1rem,2vw,1.75rem)] border border-cyan-300/25 bg-black/35 px-[clamp(1rem,2.4vw,2rem)] py-[clamp(0.8rem,1.8vh,1.35rem)] backdrop-blur-md"
                  style={{ animationDelay: `${120 + index * 140}ms` }}
                >
                  <div className="icg-card-sheen pointer-events-none absolute inset-0" />
                  <div className="icg-card-ring pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full border border-cyan-400/20" />
                  <p className="icg-mono relative z-10 text-[clamp(0.65rem,1.15vw,0.9rem)] font-bold tracking-[0.24em] text-cyan-300/85">
                    NODE 0{index + 1}
                  </p>
                  <p className="relative z-10 mt-[clamp(0.3rem,0.9vh,0.65rem)] break-words text-[clamp(1.4rem,4vw,3.2rem)] font-black leading-[1.12] text-white">
                    {team.name}
                  </p>
                  <div className="relative z-10 mt-3 h-[2px] w-full overflow-hidden rounded bg-white/10">
                    <div className="icg-bar h-full w-2/3 bg-gradient-to-r from-cyan-400 via-amber-300 to-transparent" />
                  </div>
                </article>
              ))}
            </div>

            <div className="flex shrink-0 justify-center pb-1">
              <button
                type="button"
                onClick={goNext}
                className="icg-cta relative overflow-hidden rounded-2xl px-[clamp(1.4rem,3.8vw,3.2rem)] py-[clamp(0.8rem,2vh,1.25rem)] text-[clamp(1rem,2.3vw,1.6rem)] font-black text-black"
              >
                <span className="relative z-10">ถัดไป — เปิดอันดับ 1</span>
              </button>
            </div>
          </section>
        ) : (
          <section className="flex min-h-0 flex-1 flex-col gap-[clamp(0.55rem,1.6vh,1.2rem)]">
            {champion && (
              <div
                className={`icg-champion relative flex min-h-0 flex-[1.4] flex-col items-center justify-center overflow-hidden rounded-[clamp(1.2rem,2.4vw,2.2rem)] border border-amber-300/40 bg-black/45 px-[clamp(1rem,3vw,2.5rem)] py-[clamp(0.9rem,2.2vh,1.75rem)] text-center backdrop-blur-md ${
                  championEntered ? 'icg-champion-in' : 'opacity-0'
                }`}
              >
                <div className="icg-champion-burst pointer-events-none absolute inset-0" aria-hidden />
                <div className="icg-rings pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
                  <span className="icg-ring icg-ring-a" />
                  <span className="icg-ring icg-ring-b" />
                  <span className="icg-ring icg-ring-c" />
                </div>

                <p className="icg-mono relative z-10 text-[clamp(0.7rem,1.3vw,0.95rem)] font-bold tracking-[0.4em] text-amber-200">
                  SYSTEM LOCK · RANK #01
                </p>
                <p className="icg-display relative z-10 mt-2 text-[clamp(2rem,5.8vw,5rem)] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-100 to-amber-300">
                  อันดับ 1
                </p>
                <p className="relative z-10 mt-[clamp(0.7rem,1.8vh,1.35rem)] max-w-[94%] break-words text-[clamp(1.6rem,5.2vw,4.4rem)] font-black leading-tight text-cyan-100 drop-shadow-[0_0_30px_rgba(34,211,238,0.35)]">
                  {champion.name}
                </p>
                <p className="icg-mono relative z-10 mt-[clamp(0.8rem,2vh,1.4rem)] text-[clamp(0.75rem,1.4vw,1.05rem)] tracking-[0.28em] text-white/55">
                  CAPITAL IN GAME
                </p>
                <p className="icg-display relative z-10 mt-1 text-[clamp(2.4rem,7.5vw,6rem)] font-black leading-none text-amber-300 drop-shadow-[0_0_40px_rgba(251,191,36,0.45)]">
                  ฿{formatMoney(countedMoney)}
                </p>
              </div>
            )}

            {runnersUp.length > 0 && (
              <div className="grid min-h-0 shrink-0 grid-cols-1 gap-[clamp(0.45rem,1.1vh,0.8rem)] sm:grid-cols-3">
                {runnersUp.map((team, i) => (
                  <article
                    key={team.id}
                    className="icg-runner relative overflow-hidden rounded-[clamp(0.8rem,1.4vw,1.15rem)] border border-white/12 bg-white/[0.05] px-4 py-[clamp(0.55rem,1.4vh,0.95rem)] text-center backdrop-blur"
                    style={{ animationDelay: `${220 + i * 120}ms` }}
                  >
                    <p className="icg-mono text-[clamp(0.65rem,1.1vw,0.85rem)] font-bold tracking-[0.2em] text-cyan-300/80">
                      RANK #{team.rank}
                    </p>
                    <p className="mt-1 break-words text-[clamp(0.95rem,2.1vw,1.5rem)] font-bold leading-tight text-white">
                      {team.name}
                    </p>
                    <p className="mt-1 text-[clamp(0.9rem,1.9vw,1.35rem)] font-semibold text-amber-200">
                      ฿{formatMoney(team.money)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <p className="icg-mono relative z-20 shrink-0 pb-2 text-center text-[clamp(0.55rem,0.95vw,0.7rem)] tracking-[0.18em] text-white/30">
        → / ENTER = NEXT · ← = BACK · M = SOUND
      </p>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;800;900&family=Prompt:wght@400;500;600;700;800;900&display=swap');

        .icg-stage {
          --icg-cyan: #22d3ee;
          --icg-amber: #fbbf24;
          --icg-ink: #04070f;
          background:
            radial-gradient(1200px 700px at 15% -10%, rgba(34, 211, 238, 0.16), transparent 55%),
            radial-gradient(900px 600px at 90% 10%, rgba(251, 191, 36, 0.14), transparent 50%),
            radial-gradient(800px 500px at 50% 110%, rgba(14, 165, 233, 0.12), transparent 45%),
            linear-gradient(160deg, #030712 0%, #07101f 45%, #05080f 100%);
          font-family: "Prompt", "Anuphan", ui-sans-serif, system-ui, sans-serif;
        }
        .icg-display { font-family: "Orbitron", "Prompt", sans-serif; }
        .icg-mono { font-family: "Orbitron", "Prompt", sans-serif; }

        .icg-aurora {
          background:
            conic-gradient(from 120deg at 50% 40%, rgba(34,211,238,0.08), transparent 25%, rgba(251,191,36,0.08), transparent 55%, rgba(56,189,248,0.08), transparent 80%);
          animation: icgSpin 28s linear infinite;
          filter: blur(40px);
          opacity: 0.85;
        }
        .icg-grid {
          background-image:
            linear-gradient(rgba(34, 211, 238, 0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 211, 238, 0.07) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: radial-gradient(ellipse at center, black 20%, transparent 75%);
          animation: icgGridDrift 22s linear infinite;
        }
        .icg-scanlines {
          background: repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 3px,
            rgba(255,255,255,0.015) 4px
          );
          mix-blend-mode: overlay;
          animation: icgScan 7s linear infinite;
        }
        .icg-particle {
          bottom: -10px;
          box-shadow: 0 0 10px rgba(34, 211, 238, 0.8);
          animation-name: icgFloatUp;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        .icg-card {
          animation: icgCardIn 0.75s cubic-bezier(0.16, 1, 0.3, 1) both;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            0 20px 50px rgba(0,0,0,0.35),
            0 0 0 1px rgba(34,211,238,0.08);
          transition: transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease;
        }
        .icg-card:hover {
          transform: translateY(-4px) scale(1.01);
          border-color: rgba(34, 211, 238, 0.55);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.12),
            0 24px 60px rgba(0,0,0,0.4),
            0 0 40px rgba(34,211,238,0.18);
        }
        .icg-card-sheen {
          background: linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.08) 45%, transparent 70%);
          transform: translateX(-120%);
          animation: icgSheen 3.8s ease-in-out infinite;
        }
        .icg-card-ring {
          animation: icgPulseRing 3.2s ease-out infinite;
        }
        .icg-bar {
          animation: icgBarSweep 2.4s ease-in-out infinite;
        }

        .icg-cta {
          background: linear-gradient(90deg, #22d3ee, #fbbf24 55%, #fde68a);
          box-shadow: 0 0 40px rgba(34, 211, 238, 0.35), 0 0 60px rgba(251, 191, 36, 0.2);
          animation: icgCtaPulse 2.2s ease-in-out infinite;
        }
        .icg-cta::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%);
          transform: translateX(-120%);
          animation: icgSheen 2.8s ease-in-out infinite;
        }
        .icg-cta:hover { filter: brightness(1.06); }

        .icg-champion-in { animation: icgChampionIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .icg-champion {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.1),
            0 0 80px rgba(251, 191, 36, 0.18),
            0 30px 80px rgba(0,0,0,0.45);
        }
        .icg-champion-burst {
          background:
            radial-gradient(circle at 50% 45%, rgba(251,191,36,0.28), transparent 42%),
            radial-gradient(circle at 50% 50%, rgba(34,211,238,0.18), transparent 55%);
          animation: icgBurst 2.8s ease-in-out infinite;
        }
        .icg-ring {
          position: absolute;
          border-radius: 9999px;
          border: 1px solid rgba(34, 211, 238, 0.25);
        }
        .icg-ring-a { width: min(42vw, 280px); height: min(42vw, 280px); animation: icgOrbit 8s linear infinite; }
        .icg-ring-b { width: min(58vw, 400px); height: min(58vw, 400px); border-color: rgba(251,191,36,0.2); animation: icgOrbit 12s linear infinite reverse; }
        .icg-ring-c { width: min(72vw, 520px); height: min(72vw, 520px); animation: icgOrbit 16s linear infinite; opacity: 0.6; }

        .icg-runner {
          animation: icgCardIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .icg-loader { animation: icgSpin 0.9s linear infinite; }
        .icg-pulse-dot { animation: icgBlink 1.4s ease-in-out infinite; }

        @keyframes icgSpin { to { transform: rotate(360deg); } }
        @keyframes icgGridDrift {
          from { background-position: 0 0; }
          to { background-position: 56px 56px; }
        }
        @keyframes icgScan {
          from { transform: translateY(0); }
          to { transform: translateY(8px); }
        }
        @keyframes icgFloatUp {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          15% { opacity: 0.9; }
          100% { transform: translateY(-110vh) scale(1); opacity: 0; }
        }
        @keyframes icgCardIn {
          from { opacity: 0; transform: translateY(28px) scale(0.96); filter: blur(6px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes icgSheen {
          0%, 55% { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
        @keyframes icgPulseRing {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes icgBarSweep {
          0%, 100% { transform: translateX(-30%); opacity: 0.5; }
          50% { transform: translateX(40%); opacity: 1; }
        }
        @keyframes icgCtaPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(34,211,238,0.35), 0 0 60px rgba(251,191,36,0.2); }
          50% { transform: scale(1.03); box-shadow: 0 0 55px rgba(34,211,238,0.5), 0 0 80px rgba(251,191,36,0.3); }
        }
        @keyframes icgChampionIn {
          0% { opacity: 0; transform: scale(0.86); filter: blur(10px); }
          60% { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes icgBurst {
          0%, 100% { opacity: 0.75; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes icgOrbit {
          from { transform: rotate(0deg) scale(1); opacity: 0.35; }
          50% { opacity: 0.7; }
          to { transform: rotate(360deg) scale(1.04); opacity: 0.35; }
        }
        @keyframes icgBlink {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(251,191,36,0.5); }
          50% { opacity: 0.45; box-shadow: 0 0 0 8px rgba(251,191,36,0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .icg-aurora, .icg-grid, .icg-scanlines, .icg-particle,
          .icg-card, .icg-card-sheen, .icg-card-ring, .icg-bar,
          .icg-cta, .icg-cta::after, .icg-champion-burst, .icg-ring,
          .icg-runner, .icg-loader, .icg-pulse-dot, .icg-champion-in {
            animation: none !important;
          }
          .icg-champion-in, .icg-card, .icg-runner { opacity: 1; transform: none; filter: none; }
        }
      `}</style>
    </div>
  );
};

export default InnoClubGameResultsPage;
