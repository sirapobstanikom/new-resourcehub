import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  formatScore,
  isTeambuildingTableMissingError,
  mapTeambuildingRow,
  rankTeams,
  TEAMBUILDING_SELECT,
  TEAMBUILDING_TEAMS_TABLE,
  type RankedTeambuildingTeam,
  type TeambuildingTeam,
} from '../lib/teambuilding';

function useAnimatedNumber(target: number, durationMs = 750): number {
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
  team: RankedTeambuildingTeam;
  index: number;
  maxScore: number;
  rowVh: number;
  cols: number;
  perCol: number;
};

const ScoreRow: React.FC<RowProps> = ({ team, index, maxScore, rowVh, cols, perCol }) => {
  const shown = useAnimatedNumber(team.score);
  const prevScore = useRef(team.score);
  const prevIndex = useRef(index);
  const [delta, setDelta] = useState<{ value: number; key: number } | null>(null);
  const [climbed, setClimbed] = useState(0);

  useEffect(() => {
    const diff = team.score - prevScore.current;
    prevScore.current = team.score;
    if (diff === 0) return;
    setDelta({ value: diff, key: Date.now() });
    const t = window.setTimeout(() => setDelta(null), 1900);
    return () => window.clearTimeout(t);
  }, [team.score]);

  useEffect(() => {
    if (index < prevIndex.current) {
      setClimbed(Date.now());
      const t = window.setTimeout(() => setClimbed(0), 1400);
      prevIndex.current = index;
      return () => window.clearTimeout(t);
    }
    prevIndex.current = index;
  }, [index]);

  const col = Math.floor(index / perCol);
  const slot = index % perCol;
  const pct = maxScore > 0 ? Math.max(0, Math.min(100, (team.score / maxScore) * 100)) : 0;
  const isLeader = team.rank === 1 && team.score > 0;
  const podium = team.rank <= 3 && team.score > 0;
  const nameSize = `min(${cols === 1 ? 4.2 : 2.6}vw, ${(rowVh * 0.36).toFixed(2)}vh)`;
  const scoreSize = `min(${cols === 1 ? 5.4 : 3.2}vw, ${(rowVh * 0.5).toFixed(2)}vh)`;
  const badgeSize = `min(${cols === 1 ? 7 : 4.5}vw, ${(rowVh * 0.72).toFixed(2)}vh)`;

  return (
    <div
      className="tb-row absolute px-[0.6vw] py-[0.5vh]"
      style={{
        top: `${(slot * 100) / perCol}%`,
        left: `${(col * 100) / cols}%`,
        width: `${100 / cols}%`,
        height: `${100 / perCol}%`,
      }}
    >
      <div
        className={`tb-card relative flex h-full items-center gap-[1.4vw] overflow-hidden rounded-[10px] border px-[1.4vw] ${
          isLeader ? 'tb-leader border-[#E60012]' : 'border-[#D9D9D9]'
        } ${climbed ? 'tb-climb' : ''}`}
        style={{ ['--team' as string]: team.color }}
      >
        <div
          className="tb-fill pointer-events-none absolute inset-y-0 left-0"
          style={{ width: `${pct}%` }}
          aria-hidden
        />

        <div
          className="tb-badge relative z-10 flex shrink-0 items-center justify-center rounded-[8px] font-black"
          style={{ width: badgeSize, height: badgeSize, fontSize: `calc(${badgeSize} * 0.42)` }}
        >
          {isLeader ? <span className="tb-crown">👑</span> : team.rank}
        </div>

        <div className="relative z-10 min-w-0 flex-1">
          <p
            className="truncate font-black leading-tight text-[#1A1A1A]"
            style={{ fontSize: nameSize }}
          >
            {team.name}
          </p>
          {podium && (
            <p className="tb-mono mt-[0.2vh] text-[min(1.1vw,1.6vh)] font-bold tracking-[0.22em] text-[#E60012]">
              {team.rank === 1 ? 'LEADER' : team.rank === 2 ? '2ND PLACE' : '3RD PLACE'}
            </p>
          )}
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-[0.8vw]">
          {delta && (
            <span
              key={delta.key}
              className={`tb-delta tb-mono rounded-[10px] px-[0.8vw] py-[0.3vh] font-black ${
                delta.value > 0 ? 'bg-[#E60012] text-white' : 'bg-[#1A1A1A] text-white'
              }`}
              style={{ fontSize: `calc(${scoreSize} * 0.45)` }}
            >
              {delta.value > 0 ? `+${formatScore(delta.value)}` : formatScore(delta.value)}
            </span>
          )}
          <span
            className="tb-mono tabular-nums font-black text-[#1A1A1A]"
            style={{ fontSize: scoreSize }}
          >
            {formatScore(Math.round(shown * 10) / 10)}
          </span>
        </div>
      </div>
    </div>
  );
};

const TeambuildingScoreboardPage: React.FC = () => {
  const [teams, setTeams] = useState<TeambuildingTeam[]>([]);
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
      .from(TEAMBUILDING_TEAMS_TABLE)
      .select(TEAMBUILDING_SELECT)
      .eq('is_active', true);
    if (!options?.silent) setLoading(false);
    if (fetchError) {
      setError(
        isTeambuildingTableMissingError(fetchError.message)
          ? 'ยังไม่มีตารางทีม — ให้แอดมินตั้งค่าในหน้า Admin ก่อน'
          : fetchError.message
      );
      return;
    }
    setError('');
    setTeams(((data as Record<string, unknown>[]) || []).map(mapTeambuildingRow));
  }, []);

  useEffect(() => {
    void loadTeams();
    if (!isSupabaseConfigured) return;
    const refresh = () => void loadTeams({ silent: true });
    const channel = supabase
      .channel('teambuilding-scoreboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: TEAMBUILDING_TEAMS_TABLE }, refresh)
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

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  const ranked = useMemo(() => rankTeams(teams), [teams]);
  const maxScore = useMemo(() => Math.max(0, ...ranked.map((t) => t.score)), [ranked]);
  const indexById = useMemo(() => new Map(ranked.map((t, i) => [t.id, i])), [ranked]);
  const stableOrder = useMemo(
    () => [...ranked].sort((a, b) => a.id.localeCompare(b.id)),
    [ranked]
  );

  const cols = ranked.length > 10 ? 2 : 1;
  const perCol = Math.max(1, Math.ceil(ranked.length / cols));
  const rowVh = Math.min(16, 78 / perCol);

  return (
    <div className="tb-stage relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden text-[#1A1A1A]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[6px] bg-[#E60012]" aria-hidden />

      <header className="relative z-20 flex shrink-0 items-center justify-between gap-4 border-b border-[#E6E6E6] bg-white px-[2.5vw] pt-[2.4vh] pb-[1.4vh]">
        <div className="min-w-0">
          <p className="tb-mono text-[min(1.1vw,1.8vh)] font-bold tracking-[0.38em] text-[#E60012]">
            HONDA · TEAMBUILDING
          </p>
          <h1 className="tb-title truncate text-[min(3.4vw,5.6vh)] font-black leading-none text-[#1A1A1A]">
            LIVE SCOREBOARD
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-[0.8vw]">
          <span
            className={`tb-mono flex items-center gap-2 rounded-[10px] px-[1vw] py-[0.6vh] text-[min(0.95vw,1.6vh)] font-bold tracking-widest ${
              liveConnected
                ? 'bg-[#E60012] text-white'
                : 'border border-[#D9D9D9] bg-[#F5F5F5] text-[#666]'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${liveConnected ? 'tb-live-dot bg-white' : 'bg-[#999]'}`} />
            {liveConnected ? 'LIVE' : 'SYNC…'}
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="tb-mono rounded-[10px] border border-[#1A1A1A] bg-white px-[1vw] py-[0.6vh] text-[min(0.95vw,1.6vh)] font-bold tracking-widest text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white"
          >
            {isFullscreen ? 'EXIT FULL' : 'FULLSCREEN'}
          </button>
        </div>
      </header>

      <main className="relative z-10 min-h-0 flex-1 px-[1.9vw] pb-[2vh]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="tb-spinner h-[8vmin] w-[8vmin] rounded-full border-4" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <p className="rounded-2xl border border-red-300 bg-red-50 px-8 py-6 text-[min(2vw,3vh)] text-red-700">
              {error}
            </p>
          </div>
        ) : ranked.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[min(5vw,8vh)]">🎯</p>
            <p className="mt-[2vh] text-[min(2.6vw,4.5vh)] font-black">รอทีมเข้าสู่สนาม…</p>
            <p className="mt-[1vh] text-[min(1.4vw,2.4vh)] text-[#666]">เพิ่มทีมได้ที่หน้า Admin → Dashboard Teambuilding</p>
          </div>
        ) : (
          <div className="relative h-full w-full">
            {stableOrder.map((team) => (
              <ScoreRow
                key={team.id}
                team={team}
                index={indexById.get(team.id) ?? 0}
                maxScore={maxScore}
                rowVh={rowVh}
                cols={cols}
                perCol={perCol}
              />
            ))}
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@500;700;800;900&display=swap');

        .tb-stage {
          background: #f4f4f4;
          font-family: "Prompt", "Anuphan", ui-sans-serif, system-ui, sans-serif;
        }
        .tb-mono { font-family: "Prompt", "Anuphan", ui-sans-serif, system-ui, sans-serif; letter-spacing: 0.08em; }
        .tb-title { letter-spacing: -0.03em; }

        .tb-row {
          transition: top 0.9s cubic-bezier(0.22, 1, 0.36, 1), left 0.9s cubic-bezier(0.22, 1, 0.36, 1);
          animation: tbRowIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .tb-card {
          background: #fff;
          box-shadow: inset 0.35vw 0 0 var(--team), 0 8px 22px rgba(0,0,0,0.06);
        }
        .tb-fill {
          background: linear-gradient(90deg, color-mix(in srgb, var(--team) 28%, white), color-mix(in srgb, var(--team) 8%, white));
          transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .tb-badge {
          background: var(--team);
          color: #111;
          box-shadow: none;
        }
        .tb-leader {
          box-shadow: inset 0.35vw 0 0 #E60012, 0 10px 24px rgba(230,0,18,0.12);
        }
        .tb-crown { display: inline-block; }
        .tb-climb { animation: tbClimb 1.3s ease-out; }
        .tb-delta { animation: tbPop 1.9s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .tb-live-dot { animation: tbPulse 1.4s ease-in-out infinite; }
        .tb-spinner { animation: tbSpin 0.9s linear infinite; border-color: #e6e6e6; border-top-color: #E60012; }

        @keyframes tbRowIn {
          from { opacity: 0; transform: translateY(1vh); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes tbClimb {
          0% { transform: scale(1); }
          25% { transform: scale(1.015); }
          100% { transform: scale(1); }
        }
        @keyframes tbPop {
          0% { opacity: 0; transform: translateY(40%) scale(0.6); }
          15% { opacity: 1; transform: translateY(0) scale(1.15); }
          30% { transform: scale(1); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-80%); }
        }
        @keyframes tbPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes tbSpin { to { transform: rotate(360deg); } }

        @media (prefers-reduced-motion: reduce) {
          .tb-row, .tb-fill, .tb-climb, .tb-delta, .tb-live-dot {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TeambuildingScoreboardPage;
