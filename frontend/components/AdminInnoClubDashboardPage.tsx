import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  formatMoney,
  formatSatisfaction,
  getTeamsBySatisfaction,
  getTopTeamsByMoney,
  INNOCLUB_GAME_SQL,
  INNOCLUB_GAME_TEAM_SELECT,
  INNOCLUB_GAME_TEAMS_TABLE,
  INNOCLUB_SATISFACTION_COLUMN_SQL,
  isInnoClubGameTableMissingError,
  isInnoClubSatisfactionColumnMissingError,
  mapInnoClubGameTeamRow,
  parseMoney,
  type InnoClubGameTeam,
} from '../lib/innoclubGame';

type DashboardTab = 'money' | 'satisfaction';

const AdminInnoClubDashboardPage: React.FC = () => {
  const [tab, setTab] = useState<DashboardTab>('money');
  const [teams, setTeams] = useState<InnoClubGameTeam[]>([]);
  const [name, setName] = useState('');
  const [money, setMoney] = useState('');
  const [satisfaction, setSatisfaction] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [satisfactionColumnMissing, setSatisfactionColumnMissing] = useState(false);

  const top4Money = useMemo(() => getTopTeamsByMoney(teams, 4), [teams]);
  const rankedSatisfaction = useMemo(() => getTeamsBySatisfaction(teams), [teams]);

  const loadTeams = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase');
      return;
    }
    setLoading(true);
    setError(null);
    let { data, error: loadError } = await supabase
      .from(INNOCLUB_GAME_TEAMS_TABLE)
      .select(INNOCLUB_GAME_TEAM_SELECT)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (loadError && isInnoClubSatisfactionColumnMissingError(loadError.message)) {
      setSatisfactionColumnMissing(true);
      const fallback = await supabase
        .from(INNOCLUB_GAME_TEAMS_TABLE)
        .select('id, name, money, sort_order, is_active, created_at, updated_at')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      data = fallback.data;
      loadError = fallback.error;
    } else {
      setSatisfactionColumnMissing(false);
    }

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
      satisfaction: parseMoney(satisfaction),
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
    setSatisfaction('');
    setMessage('เพิ่มทีมแล้ว');
    void loadTeams();
  };

  const updateTeam = async (
    id: string,
    patch: Partial<Pick<InnoClubGameTeam, 'name' | 'money' | 'satisfaction' | 'is_active' | 'sort_order'>>
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
    <div className="flex flex-col min-h-full text-gray-900">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 sm:px-6 py-4 sm:py-6 border-b border-[#D6D4CC]">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-yellow-700/80">InnoClub Game</p>
          <h1 className="text-xl sm:text-2xl font-bold text-yellow-800 mt-1">กรอกทีม & คะแนน</h1>
          <p className="text-sm text-gray-600 mt-1">
            ใช้ชื่อทีมชุดเดียวกัน — สลับแท็บเพื่อกรอกคะแนนเงิน หรือ Satisfaction
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadTeams()}
            className="rounded-xl border border-[#D6D4CC] bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-100"
          >
            รีเฟรช
          </button>
          <Link
            to={tab === 'satisfaction' ? '/evaluation/innoclub-satisfaction' : '/evaluation/innoclub-game'}
            target="_blank"
            className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-bold text-black hover:bg-yellow-300"
          >
            {tab === 'satisfaction' ? 'เปิดจอ Satisfaction' : 'เปิดหน้าผลลัพธ์เงิน'}
          </Link>
        </div>
      </header>

      <div className="flex-1 px-4 sm:px-6 py-6 space-y-6">
        <div className="inline-flex rounded-xl border border-[#D6D4CC] bg-white p-1">
          <button
            type="button"
            onClick={() => setTab('money')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === 'money' ? 'bg-yellow-400 text-black' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Dashboard คะแนนเงิน
          </button>
          <button
            type="button"
            onClick={() => setTab('satisfaction')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === 'satisfaction' ? 'bg-yellow-400 text-black' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Dashboard Satisfaction
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            {tableMissing && (
              <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-gray-100 p-3 text-[11px] text-red-800 overflow-x-auto">
                {INNOCLUB_GAME_SQL}
              </pre>
            )}
          </div>
        )}
        {satisfactionColumnMissing && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            ยังไม่มีคอลัมน์ Satisfaction ในตารางทีม — รัน SQL นี้ใน Supabase แล้วกดรีเฟรช
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-3 text-[11px] text-amber-950 overflow-x-auto">
              {INNOCLUB_SATISFACTION_COLUMN_SQL}
            </pre>
          </div>
        )}
        {message && (
          <div className="rounded-xl border border-emerald-600/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        )}

        {tab === 'money' && (
          <>
            <section className="rounded-2xl border border-[#D6D4CC] bg-white p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-yellow-800">เพิ่มทีม</h2>
              <form onSubmit={addTeam} className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px_140px_auto]">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ชื่อทีม"
                  className="rounded-xl border border-[#D6D4CC] bg-gray-100 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500"
                />
                <input
                  value={money}
                  onChange={(e) => setMoney(e.target.value)}
                  placeholder="เงิน (คะแนน)"
                  inputMode="decimal"
                  className="rounded-xl border border-[#D6D4CC] bg-gray-100 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500"
                />
                <input
                  value={satisfaction}
                  onChange={(e) => setSatisfaction(e.target.value)}
                  placeholder="Satisfaction"
                  inputMode="decimal"
                  className="rounded-xl border border-[#D6D4CC] bg-gray-100 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-500"
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

            <section className="rounded-2xl border border-yellow-300 bg-gradient-to-br from-yellow-500/10 to-transparent p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-yellow-800">พรีวิว Top 4 (คะแนนเงิน)</h2>
              {top4Money.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">ยังไม่มีทีม</p>
              ) : (
                <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {top4Money.map((team) => (
                    <li
                      key={team.id}
                      className="rounded-xl border border-[#D6D4CC] bg-gray-100 px-3 py-3"
                    >
                      <p className="text-[11px] text-yellow-900/80">#{team.rank}</p>
                      <p className="mt-1 font-semibold text-gray-900">{team.name}</p>
                      <p className="mt-1 text-sm text-amber-900">฿{formatMoney(team.money)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </>
        )}

        {tab === 'satisfaction' && (
          <section className="rounded-2xl border border-sky-300 bg-gradient-to-br from-sky-500/10 to-transparent p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-sky-900">พรีวิวอันดับ Satisfaction</h2>
            <p className="mt-1 text-xs text-gray-600">ชื่อทีมเดียวกับ Dashboard คะแนนเงิน — กรอกคะแนน Satisfaction ได้ด้านล่าง</p>
            {rankedSatisfaction.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">ยังไม่มีทีม</p>
            ) : (
              <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {rankedSatisfaction.slice(0, 8).map((team) => (
                  <li
                    key={team.id}
                    className="rounded-xl border border-[#D6D4CC] bg-white px-3 py-3"
                  >
                    <p className="text-[11px] text-sky-800/80">#{team.rank}</p>
                    <p className="mt-1 font-semibold text-gray-900">{team.name}</p>
                    <p className="mt-1 text-sm font-bold text-sky-900">
                      {formatSatisfaction(team.satisfaction)} <span className="text-xs font-medium text-gray-500">pts</span>
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-[#D6D4CC] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-yellow-800">
              {tab === 'money' ? `ทีมทั้งหมด (${teams.length})` : `กรอก Satisfaction ตามทีม (${teams.length})`}
            </h2>
            {loading && <p className="text-xs text-gray-500">กำลังโหลด...</p>}
          </div>

          {teams.length === 0 && !loading ? (
            <p className="mt-4 text-sm text-gray-500">ยังไม่มีทีม — เพิ่มทีมที่แท็บ Dashboard คะแนนเงิน</p>
          ) : (
            <div className="mt-4 space-y-3">
              {(tab === 'satisfaction' ? rankedSatisfaction : teams).map((team) => (
                <div
                  key={`${tab}-${team.id}`}
                  className={`grid gap-3 rounded-xl border border-[#D6D4CC] bg-gray-50 p-3 ${
                    tab === 'money' ? 'sm:grid-cols-[1fr_160px_auto]' : 'sm:grid-cols-[auto_1fr_160px_auto]'
                  }`}
                >
                  {tab === 'satisfaction' && (
                    <div className="flex items-center justify-center rounded-lg bg-sky-100 px-3 py-2 text-sm font-bold text-sky-900">
                      #{team.rank}
                    </div>
                  )}
                  <input
                    defaultValue={team.name}
                    key={`${team.id}-name-${team.updated_at || team.name}`}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (!next || next === team.name) return;
                      void updateTeam(team.id, { name: next });
                    }}
                    className="rounded-lg border border-[#D6D4CC] bg-gray-100 px-3 py-2 text-sm text-gray-900"
                  />
                  {tab === 'money' ? (
                    <input
                      defaultValue={String(team.money)}
                      key={`${team.id}-money-${team.updated_at || team.money}`}
                      inputMode="decimal"
                      onBlur={(e) => {
                        const next = parseMoney(e.target.value);
                        if (next === team.money) return;
                        void updateTeam(team.id, { money: next });
                      }}
                      className="rounded-lg border border-[#D6D4CC] bg-gray-100 px-3 py-2 text-sm text-gray-900"
                      aria-label={`เงินทีม ${team.name}`}
                    />
                  ) : (
                    <input
                      defaultValue={String(team.satisfaction)}
                      key={`${team.id}-satisfaction-${team.updated_at || team.satisfaction}`}
                      inputMode="decimal"
                      onBlur={(e) => {
                        const next = parseMoney(e.target.value);
                        if (next === team.satisfaction) return;
                        void updateTeam(team.id, { satisfaction: next });
                      }}
                      className="rounded-lg border border-sky-300 bg-white px-3 py-2 text-sm font-semibold text-sky-950"
                      aria-label={`Satisfaction ทีม ${team.name}`}
                      placeholder="คะแนน Satisfaction"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void updateTeam(team.id, { is_active: !team.is_active })}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                        team.is_active
                          ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-700'
                          : 'border border-[#D6D4CC] bg-white text-gray-400'
                      }`}
                    >
                      {team.is_active ? 'ใช้งาน' : 'ปิด'}
                    </button>
                    {tab === 'money' && (
                      <button
                        type="button"
                        onClick={() => void deleteTeam(team)}
                        className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        ลบ
                      </button>
                    )}
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
