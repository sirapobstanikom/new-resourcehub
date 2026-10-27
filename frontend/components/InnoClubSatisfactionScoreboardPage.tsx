import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  formatSatisfaction,
  getTeamsBySatisfaction,
  INNOCLUB_GAME_TEAM_SELECT,
  INNOCLUB_GAME_TEAMS_TABLE,
  INNOCLUB_SATISFACTION_COLUMN_SQL,
  isInnoClubGameTableMissingError,
  isInnoClubSatisfactionColumnMissingError,
  mapInnoClubGameTeamRow,
  parseMoney,
  type InnoClubGameTeam,
  type InnoClubRankedTeam,
} from '../lib/innoclubGame';

function useAnimatedNumber(target: number, durationMs = 800): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (target - from) * eased;
      setValue(next);
      fromRef.current = next;
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

type RowProps = {
  team: InnoClubRankedTeam;
  index: number;
  maxScore: number;
};

const ScoreRow: React.FC<RowProps> = ({ team, index, maxScore }) => {
  const shown = useAnimatedNumber(team.satisfaction);
  const prevScore = useRef(team.satisfaction);
  const prevRank = useRef(team.rank);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);
  const [climbed, setClimbed] = useState(0);

  useEffect(() => {
    const diff = team.satisfaction - prevScore.current;
    prevScore.current = team.satisfaction;
    if (diff === 0) return;
    setDelta({ value: diff, key: Date.now() });
    const t = window.setTimeout(() => setDelta(null), 1800);
    return () => window.clearTimeout(t);
  }, [team.satisfaction]);

  useEffect(() => {
    if (team.rank < prevRank.current) {
      setClimbed(Date.now());
      const t = window.setTimeout(() => setClimbed(0), 1200);
      prevRank.current = team.rank;
      return () => window.clearTimeout(t);
    }
    prevRank.current = team.rank;
  }, [team.rank]);

  const pct = maxScore > 0 ? Math.max(8, Math.min(100, (team.satisfaction / maxScore) * 100)) : 8;
  const isLeader = team.rank === 1 && team.satisfaction > 0;

  return (
    <div
      className={`ics-row relative overflow-hidden rounded-[14px] border px-[1.4vw] py-[1.3vh] ${
        isLeader ? 'ics-leader border-sky-400 bg-sky-500/15' : 'border-white/15 bg-white/5'
      } ${climbed ? 'ics-climb' : ''}`}
      style={{ animationDelay: `${80 + index * 90}ms` }}
    >
      <div
        className="ics-fill pointer-events-none absolute inset-y-0 left-0"
        style={{ width: `${pct}%` }}
        aria-hidden
      />
      {isLeader && <div className="ics-leader-glow pointer-events-none absolute inset-0" aria-hidden />}

      <div className="relative z-10 flex items-center gap-[1.2vw]">
        <div
          className={`ics-badge flex h-[min(7vw,8vh)] w-[min(7vw,8vh)] shrink-0 items-center justify-center rounded-[12px] text-[min(2.4vw,3.2vh)] font-black ${
            isLeader ? 'bg-sky-400 text-black' : 'bg-white/15 text-white'
          }`}
        >
          {team.rank}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[min(2.6vw,3.6vh)] font-black leading-tight">
            {team.name}
          </p>
          {isLeader && (
            <p className="ics-leader-label mt-0.5 text-[min(1vw,1.5vh)] font-bold tracking-[0.28em] text-sky-300">
              LEADER
            </p>
          )}
        </div>
        <div className="relative flex shrink-0 items-end gap-[0.7vw]">
          {delta && (
            <span
              key={delta.key}
              className={`ics-delta rounded-[10px] px-[0.7vw] py-[0.25vh] text-[min(1.4vw,2vh)] font-black ${
                delta.value > 0 ? 'bg-sky-400 text-black' : 'bg-white text-black'
              }`}
            >
              {delta.value > 0 ? `+${formatSatisfaction(delta.value)}` : formatSatisfaction(delta.value)}
            </span>
          )}
          <div className="text-right">
            <p className="ics-score text-[min(3.2vw,4.4vh)] font-black tabular-nums leading-none">
              {formatSatisfaction(Math.round(shown * 10) / 10)}
            </p>
            <p className="mt-1 text-[min(0.9vw,1.3vh)] font-bold tracking-[0.28em] text-white/55">
              SATISFACTION
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const InnoClubSatisfactionScoreboardPage: React.FC = () => {
  const [teams, setTeams] = useState<InnoClubGameTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveConnected, setLiveConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const loadTeams = useCallback(async (options?: { silent?: boolean }) => {
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase');
      setLoading(false);
      return;
    }
    if (!options?.silent) setLoading(true);
    const { data, error: fetchError } = await supabase
      .from(INNOCLUB_GAME_TEAMS_TABLE)
      .select(INNOCLUB_GAME_TEAM_SELECT)
      .eq('is_active', true);
    if (!options?.silent) setLoading(false);
    if (fetchError) {
      if (isInnoClubSatisfactionColumnMissingError(fetchError.message)) {
        setError(
          `ยังไม่มีคอลัมน์ satisfaction — ให้แอดมินรัน SQL นี้ใน Supabase ก่อน:\n\n${INNOCLUB_SATISFACTION_COLUMN_SQL}`
        );
        return;
      }
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
    const refresh = () => void loadTeams({ silent: true });
    const channel = supabase
      .channel('innoclub-satisfaction-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: INNOCLUB_GAME_TEAMS_TABLE }, refresh)
      .subscribe((status) => setLiveConnected(status === 'SUBSCRIBED'));
    const pollId = window.setInterval(refresh, 6000);
    return () => {
      window.clearInterval(pollId);
      setLiveConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [loadTeams]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const ranked = useMemo(() => getTeamsBySatisfaction(teams), [teams]);
  const maxScore = useMemo(
    () => Math.max(0, ...ranked.map((t) => parseMoney(t.satisfaction))),
    [ranked]
  );
  const stableOrder = useMemo(
    () => [...ranked].sort((a, b) => a.id.localeCompare(b.id)),
    [ranked]
  );
  const indexById = useMemo(() => new Map(ranked.map((t, i) => [t.id, i])), [ranked]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  return (
    <div className="ics-stage relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#07080c] text-white">
      <div className="ics-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="ics-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="ics-scan pointer-events-none absolute inset-x-0" aria-hidden />

      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-[2.5vw] py-[2vh]">
        <div className="ics-header-in min-w-0">
          <p className="text-[min(1.1vw,1.8vh)] font-bold tracking-[0.35em] text-sky-300">
            INNOCLUB · SATISFACTION
          </p>
          <h1 className="truncate text-[min(3.2vw,5.2vh)] font-black leading-none">
            LIVE SCOREBOARD
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-[10px] px-3 py-1.5 text-[min(0.95vw,1.5vh)] font-bold tracking-widest ${
              liveConnected
                ? 'bg-sky-500 text-white'
                : 'border border-white/25 bg-white/5 text-white/60'
            }`}
          >
            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${liveConnected ? 'ics-live-dot bg-white' : 'bg-white/40'}`} />
            {liveConnected ? 'LIVE' : 'SYNC'}
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-[10px] border border-white/30 bg-white/5 px-3 py-1.5 text-[min(0.95vw,1.5vh)] font-bold tracking-widest text-white transition hover:bg-sky-500"
          >
            {isFullscreen ? 'EXIT' : 'FULLSCREEN'}
          </button>
        </div>
      </header>

      <main className="relative z-10 min-h-0 flex-1 overflow-auto px-[2vw] py-[2vh]">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-white/70">
            <div className="ics-spinner h-12 w-12 rounded-full border-2 border-white/15 border-t-sky-400" />
            <p>กำลังโหลด...</p>
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <p className="max-w-xl whitespace-pre-wrap rounded-2xl border border-red-400/40 bg-red-500/10 px-6 py-5 text-center text-[min(1.6vw,2.4vh)] text-red-100">
              {error}
            </p>
          </div>
        ) : ranked.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[min(2.4vw,4vh)] font-black">รอทีมเข้าสู่สนาม…</p>
            <p className="mt-2 text-[min(1.3vw,2vh)] text-white/60">
              เพิ่มทีมและกรอก Satisfaction ที่ Admin → InnoClub Dashboard
            </p>
          </div>
        ) : (
          <div className="relative mx-auto h-full max-w-6xl">
            {stableOrder.map((team) => {
              const index = indexById.get(team.id) ?? 0;
              const rowH = 100 / Math.max(ranked.length, 1);
              return (
                <div
                  key={team.id}
                  className="ics-slot absolute left-0 right-0 px-0"
                  style={{
                    top: `${index * rowH}%`,
                    height: `${rowH}%`,
                    paddingBottom: '0.6vh',
                  }}
                >
                  <ScoreRow team={team} index={index} maxScore={maxScore} />
                </div>
              );
            })}
          </div>
        )}
      </main>

      <style>{`
        .ics-glow {
          background:
            radial-gradient(ellipse 70% 45% at 50% -10%, rgba(14,165,233,0.3), transparent 70%),
            radial-gradient(ellipse 40% 30% at 100% 100%, rgba(14,165,233,0.12), transparent 70%);
          animation: icsGlowPulse 6s ease-in-out infinite;
        }
        .ics-grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: linear-gradient(180deg, #000 0%, transparent 90%);
        }
        .ics-scan {
          height: 24vh;
          background: linear-gradient(180deg, transparent, rgba(14,165,233,0.08), transparent);
          animation: icsScan 8s linear infinite;
        }
        .ics-header-in { animation: icsFadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .ics-slot {
          transition: top 0.85s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ics-row {
          height: 100%;
          display: flex;
          align-items: center;
          animation: icsRowIn 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
          box-shadow: 0 12px 28px rgba(0,0,0,0.25);
        }
        .ics-fill {
          background: linear-gradient(90deg, rgba(56,189,248,0.35), transparent 92%);
          transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ics-leader {
          box-shadow: 0 0 0 1px rgba(56,189,248,0.35), 0 0 32px rgba(14,165,233,0.28);
        }
        .ics-leader-glow {
          background: radial-gradient(ellipse at 20% 50%, rgba(56,189,248,0.18), transparent 55%);
          animation: icsLeaderGlow 2.4s ease-in-out infinite;
        }
        .ics-leader-label { animation: icsBlink 1.6s ease-in-out infinite; }
        .ics-badge { transition: transform 0.35s ease, background-color 0.35s ease; }
        .ics-leader .ics-badge { animation: icsBadgePulse 2s ease-in-out infinite; }
        .ics-score { text-shadow: 0 0 18px rgba(125,211,252,0.25); }
        .ics-climb { animation: icsClimb 1.1s ease-out; }
        .ics-delta { animation: icsPop 1.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .ics-live-dot { animation: icsPulse 1.4s ease-in-out infinite; }
        .ics-spinner { animation: icsSpin 0.9s linear infinite; }

        @keyframes icsGlowPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.72; }
        }
        @keyframes icsScan {
          from { top: -30%; }
          to { top: 110%; }
        }
        @keyframes icsFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes icsRowIn {
          from { opacity: 0; transform: translateY(1.4vh) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes icsLeaderGlow {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        @keyframes icsBadgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes icsClimb {
          0% { transform: scale(1); }
          30% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
        @keyframes icsPop {
          0% { opacity: 0; transform: translateY(40%) scale(0.7); }
          15% { opacity: 1; transform: translateY(0) scale(1.12); }
          30% { transform: scale(1); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-70%); }
        }
        @keyframes icsPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(255,255,255,0.55); }
          50% { opacity: 0.35; box-shadow: 0 0 0 7px rgba(255,255,255,0); }
        }
        @keyframes icsBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes icsSpin { to { transform: rotate(360deg); } }

        @media (prefers-reduced-motion: reduce) {
          .ics-glow, .ics-scan, .ics-header-in, .ics-row, .ics-fill, .ics-slot,
          .ics-leader-glow, .ics-leader-label, .ics-badge, .ics-climb, .ics-delta,
          .ics-live-dot, .ics-spinner {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InnoClubSatisfactionScoreboardPage;
