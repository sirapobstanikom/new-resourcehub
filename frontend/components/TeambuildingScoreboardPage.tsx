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
        className={`tb-card relative flex h-full items-center gap-[1.4vw] overflow-hidden px-[1.4vw] ${
          isLeader ? 'tb-leader' : ''
        } ${climbed ? 'tb-climb' : ''}`}
        style={{ ['--team' as string]: team.color }}
      >
        <span className="tb-corner tb-corner-tr" aria-hidden />
        <span className="tb-corner tb-corner-bl" aria-hidden />
        <div
          className="tb-fill pointer-events-none absolute inset-y-0 left-0"
          style={{ width: `${pct}%` }}
          aria-hidden
        />

        <div
          className="tb-badge relative z-10 flex shrink-0 items-center justify-center font-black"
          style={{ width: badgeSize, height: badgeSize, fontSize: `calc(${badgeSize} * 0.42)` }}
        >
          {team.rank}
        </div>

        <div className="relative z-10 min-w-0 flex-1">
          <p
            className="truncate font-black leading-tight text-white"
            style={{ fontSize: nameSize }}
          >
            {team.name}
          </p>
          {podium && (
            <p className="tb-mono mt-[0.2vh] text-[min(1.1vw,1.6vh)] font-bold tracking-[0.28em] text-[#ff4d5a]">
              {team.rank === 1 ? 'P1  LEADER' : team.rank === 2 ? 'P2  PLACE' : 'P3  PLACE'}
            </p>
          )}
        </div>

        <div className="relative z-10 flex shrink-0 items-end gap-[0.8vw]">
          {delta && (
            <span
              key={delta.key}
              className={`tb-delta tb-mono px-[0.8vw] py-[0.3vh] font-black ${
                delta.value > 0 ? 'bg-[#E60012] text-white' : 'bg-white text-[#111]'
              }`}
              style={{ fontSize: `calc(${scoreSize} * 0.42)` }}
            >
              {delta.value > 0 ? `+${formatScore(delta.value)}` : formatScore(delta.value)}
            </span>
          )}
          <span className="flex flex-col items-end leading-none">
            <span
              className="tb-score tabular-nums font-bold text-white"
              style={{ fontSize: scoreSize }}
            >
              {formatScore(Math.round(shown * 10) / 10)}
            </span>
            <span className="tb-mono mt-[0.4vh] text-[min(0.85vw,1.3vh)] font-bold tracking-[0.32em] text-white/55">
              PTS
            </span>
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
    <div className="tb-stage relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden text-white">
      <div className="tb-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="tb-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="tb-scan pointer-events-none absolute inset-x-0" aria-hidden />

      <header className="relative z-20 flex shrink-0 items-center justify-between gap-4 px-[2.5vw] pt-[2.2vh] pb-[1.6vh]">
        <div className="flex min-w-0 items-center gap-[1.1vw]">
          <div className="tb-mark" aria-hidden>H</div>
          <div className="min-w-0">
            <p className="tb-mono text-[min(1.05vw,1.7vh)] font-bold tracking-[0.42em] text-[#ff4d5a]">
              HONDA // TEAMBUILDING
            </p>
            <h1 className="tb-title truncate text-[min(3.2vw,5.4vh)] font-black leading-none text-white">
              LIVE SCOREBOARD
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-[0.8vw]">
          <span
            className={`tb-mono flex items-center gap-2 px-[1vw] py-[0.6vh] text-[min(0.95vw,1.6vh)] font-bold tracking-[0.28em] ${
              liveConnected ? 'tb-live text-white' : 'border border-white/25 text-white/60'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${liveConnected ? 'tb-live-dot bg-[#E60012]' : 'bg-white/40'}`} />
            {liveConnected ? 'LIVE' : 'SYNC'}
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="tb-mono border border-white/30 bg-white/5 px-[1vw] py-[0.6vh] text-[min(0.95vw,1.6vh)] font-bold tracking-[0.22em] text-white hover:border-[#E60012] hover:bg-[#E60012]"
          >
            {isFullscreen ? 'EXIT' : 'FULLSCREEN'}
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
            <p className="border border-[#E60012]/50 bg-[#E60012]/10 px-8 py-6 text-[min(2vw,3vh)] text-white">
              {error}
            </p>
          </div>
        ) : ranked.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="tb-mono text-[min(1.2vw,2vh)] tracking-[0.4em] text-[#ff4d5a]">STANDBY</p>
            <p className="mt-[2vh] text-[min(2.6vw,4.5vh)] font-black">รอทีมเข้าสู่สนาม…</p>
            <p className="mt-[1vh] text-[min(1.4vw,2.4vh)] text-white/60">เพิ่มทีมได้ที่หน้า Admin → Dashboard Teambuilding</p>
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
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@600;700&family=Prompt:wght@600;700;800;900&display=swap');

        .tb-stage {
          background: #070709;
          font-family: "Prompt", "Anuphan", ui-sans-serif, system-ui, sans-serif;
        }
        .tb-mono, .tb-score, .tb-mark {
          font-family: "Chakra Petch", "Prompt", sans-serif;
        }
        .tb-title { letter-spacing: -0.03em; }
        .tb-mark {
          width: min(4.4vw, 7.2vh);
          height: min(4.4vw, 7.2vh);
          display: grid;
          place-items: center;
          flex-shrink: 0;
          background: #E60012;
          color: #fff;
          font-weight: 700;
          font-size: min(2vw, 3.2vh);
          clip-path: polygon(16% 0, 100% 0, 100% 84%, 84% 100%, 0 100%, 0 16%);
          box-shadow: 0 0 28px rgba(230,0,18,0.45);
        }
        .tb-glow {
          background:
            radial-gradient(ellipse 50vw 28vh at 8% -4%, rgba(230,0,18,0.38), transparent 70%),
            radial-gradient(ellipse 40vw 30vh at 100% 110%, rgba(230,0,18,0.16), transparent 70%);
        }
        .tb-grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: linear-gradient(180deg, #000 0%, transparent 92%);
        }
        .tb-scan {
          height: 22vh;
          background: linear-gradient(180deg, transparent, rgba(230,0,18,0.07), transparent);
          animation: tbScan 9s linear infinite;
        }
        .tb-live {
          border: 1px solid rgba(230,0,18,0.85);
          background: rgba(230,0,18,0.16);
          box-shadow: 0 0 18px rgba(230,0,18,0.35);
        }

        .tb-row {
          transition: top 0.9s cubic-bezier(0.22, 1, 0.36, 1), left 0.9s cubic-bezier(0.22, 1, 0.36, 1);
          animation: tbRowIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .tb-card {
          background:
            linear-gradient(180deg, rgba(32,32,36,0.96), rgba(12,12,14,0.96));
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: inset 0.38vw 0 0 var(--team), 0 16px 40px rgba(0,0,0,0.35);
          clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px);
        }
        .tb-corner {
          position: absolute;
          z-index: 2;
          width: 16px;
          height: 16px;
          pointer-events: none;
        }
        .tb-corner-tr { top: 8px; right: 8px; border-top: 2px solid rgba(255,255,255,0.7); border-right: 2px solid rgba(255,255,255,0.7); }
        .tb-corner-bl { bottom: 8px; left: 10px; border-bottom: 2px solid #E60012; border-left: 2px solid #E60012; }
        .tb-fill {
          background: linear-gradient(90deg, color-mix(in srgb, var(--team) 42%, transparent), transparent 92%);
          transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .tb-badge {
          background: var(--team);
          color: #111;
          clip-path: polygon(14% 0, 100% 0, 100% 86%, 86% 100%, 0 100%, 0 14%);
          box-shadow: 0 0 18px color-mix(in srgb, var(--team) 55%, transparent);
        }
        .tb-score { text-shadow: 0 0 18px rgba(255,255,255,0.18); }
        .tb-leader {
          border-color: rgba(230,0,18,0.85);
          box-shadow:
            inset 0.38vw 0 0 #E60012,
            0 0 0 1px rgba(230,0,18,0.35),
            0 0 28px rgba(230,0,18,0.28);
        }
        .tb-climb { animation: tbClimb 1.3s ease-out; }
        .tb-delta { animation: tbPop 1.9s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .tb-live-dot { animation: tbPulse 1.4s ease-in-out infinite; }
        .tb-spinner { animation: tbSpin 0.9s linear infinite; border-color: rgba(255,255,255,0.15); border-top-color: #E60012; }

        @keyframes tbScan {
          from { top: -24%; }
          to { top: 110%; }
        }
        @keyframes tbRowIn {
          from { opacity: 0; transform: translateY(1.2vh); }
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
          0%, 100% { box-shadow: 0 0 0 0 rgba(230,0,18,0.7); }
          50% { box-shadow: 0 0 0 7px rgba(230,0,18,0); }
        }
        @keyframes tbSpin { to { transform: rotate(360deg); } }

        @media (prefers-reduced-motion: reduce) {
          .tb-row, .tb-fill, .tb-climb, .tb-delta, .tb-live-dot, .tb-scan {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TeambuildingScoreboardPage;
