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

const HINO_LOGO = 'https://www.hinomanufacturing.co.th/th/_content_images/website/logo.png?vs=20260124080023';
const HINO_RED = '#CC0000';
const HINO_GRAY = '#4D4D4D';

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
      className="hino-tb-row absolute px-[0.55vw] py-[0.45vh]"
      style={{
        top: `${(slot * 100) / perCol}%`,
        left: `${(col * 100) / cols}%`,
        width: `${100 / cols}%`,
        height: `${100 / perCol}%`,
      }}
    >
      <div
        className={`hino-tb-card relative flex h-full items-center gap-[1.2vw] overflow-hidden px-[1.3vw] ${
          isLeader ? 'hino-tb-leader' : ''
        } ${climbed ? 'hino-tb-climb' : ''}`}
        style={{ ['--team' as string]: team.color || HINO_RED }}
      >
        <div
          className="hino-tb-fill pointer-events-none absolute inset-y-0 left-0"
          style={{ width: `${pct}%` }}
          aria-hidden
        />

        <div
          className="hino-tb-badge relative z-10 flex shrink-0 items-center justify-center font-black"
          style={{ width: badgeSize, height: badgeSize, fontSize: `calc(${badgeSize} * 0.42)` }}
        >
          {team.rank}
        </div>

        <div className="relative z-10 min-w-0 flex-1">
          <p className="truncate font-black leading-tight text-[#1A1A1A]" style={{ fontSize: nameSize }}>
            {team.name}
          </p>
          {podium && (
            <p className="mt-[0.25vh] text-[min(1.05vw,1.55vh)] font-bold tracking-[0.22em] text-[#CC0000]">
              {team.rank === 1 ? 'อันดับ 1 · LEADER' : team.rank === 2 ? 'อันดับ 2' : 'อันดับ 3'}
            </p>
          )}
        </div>

        <div className="relative z-10 flex shrink-0 items-end gap-[0.75vw]">
          {delta && (
            <span
              key={delta.key}
              className={`hino-tb-delta px-[0.75vw] py-[0.35vh] font-black ${
                delta.value > 0 ? 'bg-[#CC0000] text-white' : 'bg-[#4D4D4D] text-white'
              }`}
              style={{ fontSize: `calc(${scoreSize} * 0.4)` }}
            >
              {delta.value > 0 ? `+${formatScore(delta.value)}` : formatScore(delta.value)}
            </span>
          )}
          <span className="flex flex-col items-end leading-none">
            <span
              className="tabular-nums font-black text-[#1A1A1A]"
              style={{ fontSize: scoreSize }}
            >
              {formatScore(Math.round(shown * 10) / 10)}
            </span>
            <span className="mt-[0.35vh] text-[min(0.85vw,1.25vh)] font-bold tracking-[0.28em] text-[#4D4D4D]">
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
    <div className="hino-tb-stage relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden text-[#1A1A1A]">
      <div className="hino-tb-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="hino-tb-pattern pointer-events-none absolute inset-0" aria-hidden />
      <div className="hino-tb-redline pointer-events-none absolute inset-x-0 top-0 h-[0.55vh]" aria-hidden />

      <header className="relative z-20 flex shrink-0 items-center justify-between gap-4 border-b border-[#D8D8D8] bg-white/90 px-[2.2vw] py-[1.6vh] backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-[1.2vw]">
          <img
            src={HINO_LOGO}
            alt="Hino Motors Manufacturing (Thailand)"
            className="hino-tb-logo h-[min(5.2vh,3.6vw)] w-auto object-contain"
          />
          <span className="hidden h-[3.2vh] w-px bg-[#D0D0D0] sm:block" />
          <div className="min-w-0">
            <p className="truncate text-[min(1vw,1.55vh)] font-bold uppercase tracking-[0.22em] text-[#CC0000]">
              Hino Motors Manufacturing (Thailand) Ltd.
            </p>
            <h1 className="truncate text-[min(2.6vw,4.2vh)] font-black leading-none tracking-tight text-[#1A1A1A]">
              Teambuilding Scoreboard
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-[0.7vw]">
          <span
            className={`flex items-center gap-2 rounded-md px-[0.95vw] py-[0.55vh] text-[min(0.9vw,1.45vh)] font-bold tracking-[0.18em] ${
              liveConnected
                ? 'border border-[#CC0000]/35 bg-[#CC0000]/08 text-[#CC0000]'
                : 'border border-[#CFCFCF] text-[#4D4D4D]'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${liveConnected ? 'hino-tb-live-dot bg-[#CC0000]' : 'bg-[#9A9A9A]'}`}
            />
            {liveConnected ? 'LIVE' : 'SYNC'}
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-md border border-[#CFCFCF] bg-white px-[0.95vw] py-[0.55vh] text-[min(0.9vw,1.45vh)] font-bold tracking-[0.14em] text-[#4D4D4D] transition hover:border-[#CC0000] hover:bg-[#CC0000] hover:text-white"
          >
            {isFullscreen ? 'EXIT' : 'FULLSCREEN'}
          </button>
        </div>
      </header>

      <main className="relative z-10 min-h-0 flex-1 px-[1.8vw] py-[1.6vh]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="hino-tb-spinner h-[7.5vmin] w-[7.5vmin] rounded-full border-4" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <p className="rounded-xl border border-[#CC0000]/40 bg-white px-8 py-6 text-[min(1.8vw,2.8vh)] font-semibold text-[#CC0000] shadow-sm">
              {error}
            </p>
          </div>
        ) : ranked.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[min(1.1vw,1.8vh)] font-bold tracking-[0.35em] text-[#CC0000]">HINO · STANDBY</p>
            <p className="mt-[1.6vh] text-[min(2.4vw,4vh)] font-black text-[#1A1A1A]">รอทีมเข้าสู่กิจกรรม…</p>
            <p className="mt-[0.8vh] text-[min(1.3vw,2.2vh)] text-[#4D4D4D]">
              เพิ่มทีมได้ที่หน้า Admin → Dashboard Teambuilding
            </p>
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

      <footer className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-t border-[#D8D8D8] bg-white/85 px-[2.2vw] py-[1vh] text-[min(0.85vw,1.35vh)] text-[#4D4D4D]">
        <p className="truncate font-semibold tracking-wide">
          ผู้ผลิตรถยนต์บรรทุก รถยนต์โดยสารฮีโน่ และชิ้นส่วนรถยนต์ ในประเทศไทย
        </p>
        <p className="hidden shrink-0 font-bold tracking-[0.16em] text-[#CC0000] sm:block">HINO RED · #CC0000</p>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@600;700;800;900&family=Barlow+Condensed:wght@600;700;800&display=swap');

        .hino-tb-stage {
          --hino-red: ${HINO_RED};
          --hino-gray: ${HINO_GRAY};
          background: #F3F3F3;
          font-family: "Noto Sans Thai", "Sarabun", "Anuphan", ui-sans-serif, system-ui, sans-serif;
        }
        .hino-tb-logo,
        .hino-tb-badge,
        .tabular-nums {
          font-family: "Barlow Condensed", "Noto Sans Thai", sans-serif;
        }
        .hino-tb-bg {
          background:
            radial-gradient(ellipse 55% 40% at 0% 0%, rgba(204,0,0,0.10), transparent 60%),
            radial-gradient(ellipse 45% 35% at 100% 100%, rgba(77,77,77,0.08), transparent 55%),
            linear-gradient(180deg, #FAFAFA 0%, #F0F0F0 55%, #EAEAEA 100%);
        }
        .hino-tb-pattern {
          opacity: 0.35;
          background-image:
            linear-gradient(rgba(77,77,77,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(77,77,77,0.06) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(180deg, #000 0%, transparent 88%);
        }
        .hino-tb-redline {
          background: linear-gradient(90deg, #CC0000 0%, #E03333 45%, #CC0000 100%);
        }

        .hino-tb-row {
          transition: top 0.9s cubic-bezier(0.22, 1, 0.36, 1), left 0.9s cubic-bezier(0.22, 1, 0.36, 1);
          animation: hinoTbIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .hino-tb-card {
          background: linear-gradient(180deg, #FFFFFF 0%, #F7F7F7 100%);
          border: 1px solid #D6D6D6;
          border-radius: 14px;
          box-shadow:
            inset 0.42vw 0 0 var(--team),
            0 10px 28px rgba(26,26,26,0.06);
        }
        .hino-tb-fill {
          background: linear-gradient(
            90deg,
            color-mix(in srgb, var(--team) 38%, white),
            color-mix(in srgb, var(--team) 12%, transparent) 88%
          );
          transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .hino-tb-badge {
          background: var(--team);
          color: #111;
          border-radius: 10px;
          box-shadow: 0 6px 16px color-mix(in srgb, var(--team) 45%, transparent);
        }
        .hino-tb-leader {
          border-color: color-mix(in srgb, var(--team) 65%, #CC0000);
          box-shadow:
            inset 0.55vw 0 0 var(--team),
            0 0 0 1px color-mix(in srgb, var(--team) 35%, transparent),
            0 14px 34px color-mix(in srgb, var(--team) 22%, transparent);
        }
        .hino-tb-climb { animation: hinoTbClimb 1.25s ease-out; }
        .hino-tb-delta {
          border-radius: 8px;
          animation: hinoTbPop 1.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .hino-tb-live-dot { animation: hinoTbPulse 1.4s ease-in-out infinite; }
        .hino-tb-spinner {
          animation: hinoTbSpin 0.9s linear infinite;
          border-color: rgba(77,77,77,0.18);
          border-top-color: #CC0000;
        }

        @keyframes hinoTbIn {
          from { opacity: 0; transform: translateY(1vh); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hinoTbClimb {
          0% { transform: scale(1); }
          28% { transform: scale(1.012); }
          100% { transform: scale(1); }
        }
        @keyframes hinoTbPop {
          0% { opacity: 0; transform: translateY(35%) scale(0.7); }
          15% { opacity: 1; transform: translateY(0) scale(1.08); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-70%); }
        }
        @keyframes hinoTbPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(204,0,0,0.55); }
          50% { box-shadow: 0 0 0 7px rgba(204,0,0,0); }
        }
        @keyframes hinoTbSpin { to { transform: rotate(360deg); } }

        @media (prefers-reduced-motion: reduce) {
          .hino-tb-row, .hino-tb-fill, .hino-tb-climb, .hino-tb-delta, .hino-tb-live-dot, .hino-tb-spinner {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TeambuildingScoreboardPage;
