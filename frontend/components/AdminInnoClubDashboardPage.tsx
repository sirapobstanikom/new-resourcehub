import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  formatMoney,
  getTopTeamsByMoney,
  INNOCLUB_GAME_SQL,
  INNOCLUB_GAME_TEAMS_TABLE,
  isInnoClubGameTableMissingError,
  mapInnoClubGameTeamRow,
  parseMoney,
  type InnoClubGameTeam,
} from '../lib/innoclubGame';

const AdminInnoClubDashboardPage: React.FC = () => {
  const [teams, setTeams] = useState<InnoClubGameTeam[]>([]);
  const [name, setName] = useState('');
  const [money, setMoney] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  const top4 = useMemo(() => getTopTeamsByMoney(teams, 4), [teams]);

  const loadTeams = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase');
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from(INNOCLUB_GAME_TEAMS_TABLE)
      .select('id, name, money, sort_order, is_active, created_at, updated_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setLoading(false);
    if (loadError) {
      setTableMissing(isInnoClubGameTableMissingError(loadError.message));
      setError(loadError.message);
      setTeams([]);
      return;
    }
    setTableMissing(false);
    setTeams(((data as Record<string, unknown>[]) || []).map(mapInnoClubGameTeamRow));
  }, []);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  const addTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('กรุณาระบุชื่อทีม');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    const { error: saveError } = await supabase.from(INNOCLUB_GAME_TEAMS_TABLE).insert({
      name: trimmed,
      money: parseMoney(money),
      sort_order: teams.length + 1,
      is_active: true,
    });
    setSaving(false);
    if (saveError) {
      setTableMissing(isInnoClubGameTableMissingError(saveError.message));
      setError(saveError.message);
      return;
    }
    setName('');
    setMoney('');
    setMessage('เพิ่มทีมแล้ว');
    void loadTeams();
  };

  const updateTeam = async (
    id: string,
    patch: Partial<Pick<InnoClubGameTeam, 'name' | 'money' | 'is_active' | 'sort_order'>>
  ) => {
    setError(null);
    setMessage(null);
    const { error: updateError } = await supabase
      .from(INNOCLUB_GAME_TEAMS_TABLE)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage('บันทึกแล้ว');
    void loadTeams();
  };

  const deleteTeam = async (team: InnoClubGameTeam) => {
    if (!window.confirm(`ลบทีม "${team.name}" ?`)) return;
    setError(null);
    setMessage(null);
    const { error: deleteError } = await supabase.from(INNOCLUB_GAME_TEAMS_TABLE).delete().eq('id', team.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setMessage('ลบทีมแล้ว');
    void loadTeams();
  };

  return (
    <div className="flex flex-col min-h-full text-white">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 sm:px-6 py-4 sm:py-6 border-b border-white/10">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-yellow-400/80">InnoClub Game</p>
          <h1 className="text-xl sm:text-2xl font-bold text-yellow-300 mt-1">กรอกทีม & คะแนนเงิน</h1>
          <p className="text-sm text-gray-400 mt-1">
            คะแนน = เงินในเกมพัฒนาธุรกิจ · หน้าผลลัพธ์จะโชว์ Top 4 แล้วเปิดอันดับ 1
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadTeams()}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-white/10"
          >
            รีเฟรช
          </button>
          <Link
            to="/evaluation/innoclub-game"
            target="_blank"
            className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-bold text-black hover:bg-yellow-300"
          >
            เปิดหน้าผลลัพธ์
          </Link>
        </div>
      </header>

      <div className="flex-1 px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
            {tableMissing && (
              <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-black/40 p-3 text-[11px] text-red-100/90 overflow-x-auto">
                {INNOCLUB_GAME_SQL}
              </pre>
            )}
          </div>
        )}
        {message && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-yellow-300">เพิ่มทีม</h2>
          <form onSubmit={addTeam} className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อทีม"
              className="rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-gray-500"
            />
            <input
              value={money}
              onChange={(e) => setMoney(e.target.value)}
              placeholder="เงิน (คะแนน)"
              inputMode="decimal"
              className="rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-gray-500"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'เพิ่มทีม'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-yellow-300/20 bg-gradient-to-br from-yellow-500/10 to-transparent p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-yellow-300">พรีวิว Top 4 (หน้าผลลัพธ์)</h2>
          {top4.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">ยังไม่มีทีม</p>
          ) : (
            <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {top4.map((team) => (
                <li
                  key={team.id}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-3"
                >
                  <p className="text-[11px] text-yellow-200/80">#{team.rank}</p>
                  <p className="mt-1 font-semibold text-white">{team.name}</p>
                  <p className="mt-1 text-sm text-amber-200">฿{formatMoney(team.money)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-yellow-300">ทีมทั้งหมด ({teams.length})</h2>
            {loading && <p className="text-xs text-gray-500">กำลังโหลด...</p>}
          </div>

          {teams.length === 0 && !loading ? (
            <p className="mt-4 text-sm text-gray-500">ยังไม่มีทีม — เพิ่มทีมด้านบน</p>
          ) : (
            <div className="mt-4 space-y-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="grid gap-3 rounded-xl border border-white/10 bg-black/25 p-3 sm:grid-cols-[1fr_160px_auto]"
                >
                  <input
                    defaultValue={team.name}
                    key={`${team.id}-name-${team.updated_at || team.name}`}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (!next || next === team.name) return;
                      void updateTeam(team.id, { name: next });
                    }}
                    className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                  />
                  <input
                    defaultValue={String(team.money)}
                    key={`${team.id}-money-${team.updated_at || team.money}`}
                    inputMode="decimal"
                    onBlur={(e) => {
                      const next = parseMoney(e.target.value);
                      if (next === team.money) return;
                      void updateTeam(team.id, { money: next });
                    }}
                    className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void updateTeam(team.id, { is_active: !team.is_active })}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                        team.is_active
                          ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                          : 'border border-white/15 bg-white/5 text-gray-400'
                      }`}
                    >
                      {team.is_active ? 'ใช้งาน' : 'ปิด'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteTeam(team)}
                      className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminInnoClubDashboardPage;
