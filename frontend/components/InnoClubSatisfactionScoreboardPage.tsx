import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  type InnoClubGameTeam,
} from '../lib/innoclubGame';

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
    () => Math.max(0, ...ranked.map((t) => t.satisfaction)),
    [ranked]
  );

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[#07080c] text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-10%,rgba(14,165,233,0.28),transparent_70%)]"
        aria-hidden
      />

      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-[2.5vw] py-[2vh]">
        <div className="min-w-0">
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
            {liveConnected ? 'LIVE' : 'SYNC'}
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-[10px] border border-white/30 bg-white/5 px-3 py-1.5 text-[min(0.95vw,1.5vh)] font-bold tracking-widest text-white hover:bg-sky-500"
          >
            {isFullscreen ? 'EXIT' : 'FULLSCREEN'}
          </button>
        </div>
      </header>

      <main className="relative z-10 min-h-0 flex-1 overflow-auto px-[2vw] py-[2vh]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-white/70">กำลังโหลด...</div>
        ) : error ? (
          <div className="flex h-full items-center justify-center">
            <p className="max-w-xl rounded-2xl border border-red-400/40 bg-red-500/10 px-6 py-5 text-center text-[min(1.6vw,2.4vh)] text-red-100">
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
          <div className="mx-auto flex h-full max-w-6xl flex-col gap-[1.2vh]">
            {ranked.map((team) => {
              const pct = maxScore > 0 ? Math.max(8, Math.min(100, (team.satisfaction / maxScore) * 100)) : 8;
              const isLeader = team.rank === 1 && team.satisfaction > 0;
              return (
                <div
                  key={team.id}
                  className={`relative overflow-hidden rounded-[14px] border px-[1.4vw] py-[1.3vh] ${
                    isLeader
                      ? 'border-sky-400 bg-sky-500/15 shadow-[0_0_28px_rgba(14,165,233,0.25)]'
                      : 'border-white/15 bg-white/5'
                  }`}
                >
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 bg-gradient-to-r from-sky-400/25 to-transparent"
                    style={{ width: `${pct}%` }}
                    aria-hidden
                  />
                  <div className="relative z-10 flex items-center gap-[1.2vw]">
                    <div
                      className={`flex h-[min(7vw,8vh)] w-[min(7vw,8vh)] shrink-0 items-center justify-center rounded-[12px] text-[min(2.4vw,3.2vh)] font-black ${
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
                        <p className="mt-0.5 text-[min(1vw,1.5vh)] font-bold tracking-[0.28em] text-sky-300">
                          LEADER
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[min(3.2vw,4.4vh)] font-black tabular-nums leading-none">
                        {formatSatisfaction(team.satisfaction)}
                      </p>
                      <p className="mt-1 text-[min(0.9vw,1.3vh)] font-bold tracking-[0.28em] text-white/55">
                        SATISFACTION
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default InnoClubSatisfactionScoreboardPage;
