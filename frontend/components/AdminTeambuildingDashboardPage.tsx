import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  formatScore,
  isTeambuildingTableMissingError,
  mapTeambuildingRow,
  parseScore,
  rankTeams,
  TEAMBUILDING_COLORS,
  TEAMBUILDING_SELECT,
  TEAMBUILDING_SQL_PATH,
  TEAMBUILDING_TEAMS_TABLE,
  type TeambuildingTeam,
} from '../lib/teambuilding';

const ADD_STEPS = [100, 300, 500, 800, 1000] as const;
const SUBTRACT_STEPS = [100, 500, 1000] as const;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function normalizeHex(value: string): string | null {
  const v = value.trim().startsWith('#') ? value.trim() : `#${value.trim()}`;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  }
  return HEX_COLOR.test(v) ? v.toLowerCase() : null;
}

type ColorPickerProps = {
  value: string;
  onChange: (color: string) => void;
  size?: 'sm' | 'md';
};

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, size = 'md' }) => {
  const [hexDraft, setHexDraft] = useState(value);
  const debounceRef = useRef<number | null>(null);
  useEffect(() => setHexDraft(value), [value]);
  useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    },
    []
  );
  const swatch = size === 'sm' ? 'h-5 w-5' : 'h-7 w-7';

  const commitFromNative = (color: string) => {
    setHexDraft(color);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => onChange(color), 350);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {TEAMBUILDING_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`เลือกสี ${c}`}
          className={`${swatch} rounded-full transition-transform ${
            value.toLowerCase() === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black' : 'opacity-60 hover:opacity-100'
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
      <label
        className={`relative ${swatch} cursor-pointer overflow-hidden rounded-full ring-1 ring-white/30`}
        title="เลือกสีเอง"
        style={{ background: 'conic-gradient(#f87171, #facc15, #4ade80, #22d3ee, #a78bfa, #f472b6, #f87171)' }}
      >
        <input
          type="color"
          value={HEX_COLOR.test(hexDraft) ? hexDraft : HEX_COLOR.test(value) ? value : '#22d3ee'}
          onChange={(e) => commitFromNative(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="เลือกสีเอง"
        />
      </label>
      <input
        value={hexDraft}
        onChange={(e) => setHexDraft(e.target.value)}
        onBlur={() => {
          const hex = normalizeHex(hexDraft);
          if (hex) onChange(hex);
          else setHexDraft(value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        maxLength={7}
        spellCheck={false}
        aria-label="รหัสสี (hex)"
        className={`${size === 'sm' ? 'w-20 py-0.5 text-xs' : 'w-24 py-1.5 text-sm'} rounded-lg border border-white/15 bg-black/40 px-2 font-mono uppercase text-white focus:border-yellow-400 focus:outline-none`}
      />
    </div>
  );
};

const AdminTeambuildingDashboardPage: React.FC = () => {
  const [teams, setTeams] = useState<TeambuildingTeam[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(TEAMBUILDING_COLORS[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [customStep, setCustomStep] = useState<Record<string, string>>({});

  const ranked = useMemo(() => rankTeams(teams), [teams]);
  const rankById = useMemo(() => new Map(ranked.map((t) => [t.id, t.rank])), [ranked]);

  const loadTeams = useCallback(async (options?: { silent?: boolean }) => {
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase');
      setLoading(false);
      return;
    }
    if (!options?.silent) setLoading(true);
    const { data, error: loadError } = await supabase
      .from(TEAMBUILDING_TEAMS_TABLE)
      .select(TEAMBUILDING_SELECT)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (!options?.silent) setLoading(false);
    if (loadError) {
      setError(
        isTeambuildingTableMissingError(loadError.message)
          ? `ยังไม่มีตาราง ${TEAMBUILDING_TEAMS_TABLE} — รัน SQL ใน ${TEAMBUILDING_SQL_PATH}`
          : loadError.message
      );
      return;
    }
    setTeams(((data as Record<string, unknown>[]) || []).map(mapTeambuildingRow));
  }, []);

  useEffect(() => {
    void loadTeams();
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('admin-teambuilding-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: TEAMBUILDING_TEAMS_TABLE }, () => {
        void loadTeams({ silent: true });
      })
      .subscribe((status) => setLiveConnected(status === 'SUBSCRIBED'));
    return () => {
      setLiveConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [loadTeams]);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), 2200);
    return () => window.clearTimeout(t);
  }, [message]);

  const updateTeam = async (id: string, patch: Partial<Omit<TeambuildingTeam, 'id'>>) => {
    setError(null);
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error: updateError } = await supabase
      .from(TEAMBUILDING_TEAMS_TABLE)
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) {
      setError(updateError.message);
      void loadTeams({ silent: true });
    }
  };

  const addScore = (team: TeambuildingTeam, delta: number) => {
    if (!delta) return;
    void updateTeam(team.id, { score: Math.round((team.score + delta) * 10) / 10 });
  };

  const addTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('กรุณาระบุชื่อทีม');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase.from(TEAMBUILDING_TEAMS_TABLE).insert({
      name: trimmed,
      color,
      score: 0,
      sort_order: teams.length + 1,
      is_active: true,
    });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setName('');
    setColor(TEAMBUILDING_COLORS[(teams.length + 1) % TEAMBUILDING_COLORS.length]);
    setMessage(`เพิ่มทีม "${trimmed}" แล้ว`);
    void loadTeams({ silent: true });
  };

  const deleteTeam = async (team: TeambuildingTeam) => {
    if (!window.confirm(`ลบทีม "${team.name}" ?`)) return;
    const { error: deleteError } = await supabase.from(TEAMBUILDING_TEAMS_TABLE).delete().eq('id', team.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setMessage('ลบทีมแล้ว');
    void loadTeams({ silent: true });
  };

  const resetAllScores = async () => {
    if (teams.length === 0) return;
    if (!window.confirm('รีเซ็ตคะแนนทุกทีมเป็น 0 ?')) return;
    const { error: resetError } = await supabase
      .from(TEAMBUILDING_TEAMS_TABLE)
      .update({ score: 0, updated_at: new Date().toISOString() })
      .in(
        'id',
        teams.map((t) => t.id)
      );
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMessage('รีเซ็ตคะแนนแล้ว');
    void loadTeams({ silent: true });
  };

  return (
    <div className="flex flex-col min-h-full text-white">
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-4 sm:px-6 py-4 sm:py-6 border-b border-white/10">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-yellow-400/80">Admin</p>
          <h1 className="text-xl sm:text-2xl font-bold text-yellow-300 mt-1">Dashboard Teambuilding</h1>
          <p className="text-sm text-gray-400 mt-1">เพิ่ม/แก้ไขทีมและคะแนน — หน้าจอแสดงผลอัปเดตทันที</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
              liveConnected
                ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                : 'border border-white/10 bg-white/5 text-zinc-500'
            }`}
          >
            {liveConnected ? '● LIVE' : 'กำลังเชื่อมต่อ...'}
          </span>
          <button
            type="button"
            onClick={() => void resetAllScores()}
            disabled={teams.length === 0}
            className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20 disabled:opacity-40"
          >
            รีเซ็ตคะแนนทั้งหมด
          </button>
          <a
            href="/evaluation/teambuilding"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-yellow-400 px-3 py-2 text-xs font-bold text-black hover:bg-yellow-300"
          >
            เปิดจอแสดงผล ↗
          </a>
        </div>
      </header>

      <div className="flex-1 px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        )}
        {message && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-yellow-300">เพิ่มทีม</h2>
          <form onSubmit={addTeam} className="mt-3 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1">
                <span className="mb-1 block text-xs text-gray-400">ชื่อทีม</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น ทีมเสือ, Team Alpha"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-yellow-400 focus:outline-none"
                />
              </label>
              <div
                className="flex h-[42px] items-center gap-2 rounded-xl border border-white/10 px-3 text-sm font-bold text-black"
                style={{ backgroundColor: color }}
              >
                {name.trim() || 'ตัวอย่างทีม'}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-50"
              >
                {saving ? 'กำลังบันทึก...' : '+ เพิ่มทีม'}
              </button>
            </div>
            <div>
              <span className="mb-1 block text-xs text-gray-400">สีทีม — เลือกจากชุดสี กดวงกลมสีรุ้งเพื่อเลือกสีเอง หรือพิมพ์รหัสสี</span>
              <ColorPicker value={color} onChange={setColor} />
            </div>
          </form>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-yellow-300">ทีมทั้งหมด ({teams.length})</h2>
            {loading && <p className="text-xs text-gray-500">กำลังโหลด...</p>}
          </div>

          {!loading && teams.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-12 text-center text-sm text-gray-500">
              ยังไม่มีทีม — เพิ่มทีมด้านบนเพื่อเริ่มเกม
            </div>
          )}

          <div className="grid gap-3 xl:grid-cols-2">
            {teams.map((team) => (
              <article
                key={team.id}
                className={`rounded-2xl border bg-black/30 p-4 transition-opacity ${team.is_active ? 'border-white/10' : 'border-white/5 opacity-50'}`}
                style={{ boxShadow: `inset 4px 0 0 ${team.color}` }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black text-black"
                    style={{ backgroundColor: team.color }}
                  >
                    {team.is_active ? `#${rankById.get(team.id) ?? '-'}` : '—'}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <label className="block">
                      <span className="mb-0.5 block text-[10px] uppercase tracking-wider text-gray-500">ชื่อทีม ✎</span>
                      <input
                        key={`${team.id}-name-${team.name}`}
                        defaultValue={team.name}
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (next && next !== team.name) void updateTeam(team.id, { name: next });
                          else e.target.value = team.name;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                        className="w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-base font-bold text-white focus:border-yellow-400 focus:outline-none"
                      />
                    </label>
                    <div>
                      <span className="mb-0.5 block text-[10px] uppercase tracking-wider text-gray-500">สีทีม</span>
                      <ColorPicker
                        size="sm"
                        value={team.color}
                        onChange={(c) => {
                          if (c.toLowerCase() !== team.color.toLowerCase()) void updateTeam(team.id, { color: c });
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500">คะแนน</p>
                    <input
                      key={`${team.id}-score-${team.score}`}
                      defaultValue={String(team.score)}
                      inputMode="decimal"
                      onBlur={(e) => {
                        const next = parseScore(e.target.value);
                        if (next !== team.score) void updateTeam(team.id, { score: next });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      className="w-24 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-right text-2xl font-black text-white focus:border-yellow-400 focus:outline-none"
                      aria-label={`คะแนนทีม ${team.name}: ${formatScore(team.score)}`}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="w-8 text-xs font-semibold text-emerald-300">เพิ่ม</span>
                  {ADD_STEPS.map((step) => (
                    <button
                      key={`add-${step}`}
                      type="button"
                      onClick={() => addScore(team, step)}
                      className="min-w-[4rem] rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-200 transition-transform hover:bg-emerald-500/20 active:scale-95"
                    >
                      +{step.toLocaleString('th-TH')}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="w-8 text-xs font-semibold text-red-300">ลด</span>
                  {SUBTRACT_STEPS.map((step) => (
                    <button
                      key={`sub-${step}`}
                      type="button"
                      onClick={() => addScore(team, -step)}
                      className="min-w-[4rem] rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-200 transition-transform hover:bg-red-500/20 active:scale-95"
                    >
                      −{step.toLocaleString('th-TH')}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <form
                    className="flex items-center gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      addScore(team, parseScore(customStep[team.id]));
                      setCustomStep((prev) => ({ ...prev, [team.id]: '' }));
                    }}
                  >
                    <input
                      value={customStep[team.id] ?? ''}
                      onChange={(e) => setCustomStep((prev) => ({ ...prev, [team.id]: e.target.value }))}
                      placeholder="±"
                      inputMode="decimal"
                      className="w-24 rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-sm text-white placeholder:text-gray-600"
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10"
                    >
                      บวก
                    </button>
                  </form>
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void updateTeam(team.id, { is_active: !team.is_active })}
                      className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-white/10"
                    >
                      {team.is_active ? 'ซ่อน' : 'แสดง'}
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
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminTeambuildingDashboardPage;
