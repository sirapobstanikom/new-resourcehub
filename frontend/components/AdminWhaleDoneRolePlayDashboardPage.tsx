import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type TabId = 'conflict_canvas' | 'commitment';

type ConflictCanvasRow = {
  id: string;
  created_at: string;
  page_version: string | null;
  case_key: string | null;
  case_no: string | null;
  case_title: string | null;
  participant_name: string | null;
  at_stake: string | null;
  emotion_a: string | null;
  emotion_b: string | null;
  worked_well: string | null;
  differently: string | null;
  agreement: string | null;
  real_person: string | null;
  real_conflict: string | null;
  first_step: string | null;
};

type CommitmentRow = {
  id: string;
  created_at: string;
  page_version: string | null;
  participant_name: string | null;
  commitment_date: string | null;
  who_text: string | null;
  behavior: string | null;
  impact: string | null;
  when_text: string | null;
  start_doing: string | null;
  stop_doing: string | null;
  continue_doing: string | null;
};

function formatThaiTime(val: string | null | undefined): string {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function display(val: string | null | undefined): string {
  const t = (val ?? '').trim();
  return t || '—';
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="text-sm text-zinc-200 whitespace-pre-wrap break-words leading-relaxed">{display(value)}</p>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 ${accent ?? ''}`}>
      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-black text-white tabular-nums">{value}</p>
    </div>
  );
}

const AdminWhaleDoneRolePlayDashboardPage: React.FC = () => {
  const [tab, setTab] = useState<TabId>('conflict_canvas');
  const [canvasRows, setCanvasRows] = useState<ConflictCanvasRow[]>([]);
  const [commitmentRows, setCommitmentRows] = useState<CommitmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [caseFilter, setCaseFilter] = useState('');
  const [versionFilter, setVersionFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase');
      return;
    }
    setLoading(true);
    setError(null);

    const [canvasRes, commitmentRes] = await Promise.all([
      supabase
        .from('whale_done_conflict_canvas_responses')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('whale_done_accountability_commitments')
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    setLoading(false);

    if (canvasRes.error || commitmentRes.error) {
      const msg = canvasRes.error?.message || commitmentRes.error?.message || 'โหลดข้อมูลไม่สำเร็จ';
      setError(msg);
      setCanvasRows([]);
      setCommitmentRows([]);
      return;
    }

    setCanvasRows((canvasRes.data as ConflictCanvasRow[]) || []);
    setCommitmentRows((commitmentRes.data as CommitmentRow[]) || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredCanvas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return canvasRows.filter((r) => {
      if (caseFilter && r.case_key !== caseFilter) return false;
      if (versionFilter && (r.page_version || '') !== versionFilter) return false;
      if (!q) return true;
      const hay = [
        r.participant_name,
        r.case_title,
        r.case_no,
        r.at_stake,
        r.real_person,
        r.real_conflict,
        r.agreement,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [canvasRows, search, caseFilter, versionFilter]);

  const filteredCommitments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return commitmentRows.filter((r) => {
      if (versionFilter && (r.page_version || '') !== versionFilter) return false;
      if (!q) return true;
      const hay = [
        r.participant_name,
        r.who_text,
        r.behavior,
        r.impact,
        r.when_text,
        r.start_doing,
        r.stop_doing,
        r.continue_doing,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [commitmentRows, search, versionFilter]);

  const canvasByCase = useMemo(() => {
    const map: Record<string, number> = { case1: 0, case2: 0, case3: 0, case4: 0 };
    for (const r of canvasRows) {
      const k = r.case_key || 'unknown';
      map[k] = (map[k] || 0) + 1;
    }
    return map;
  }, [canvasRows]);

  const versions = useMemo(() => {
    const set = new Set<string>();
    for (const r of canvasRows) if (r.page_version) set.add(r.page_version);
    for (const r of commitmentRows) if (r.page_version) set.add(r.page_version);
    return Array.from(set).sort();
  }, [canvasRows, commitmentRows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-violet-400/90">Admin · Whale Done</p>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Whale Done Role Play Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-400 max-w-2xl">
            ดูคำตอบที่ผู้เข้าร่วมกรอกจาก Conflict Canvas และ Participant Commitment Card
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? 'กำลังโหลด…' : 'รีเฟรช'}
          </button>
          <Link
            to="/admin"
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/10"
          >
            กลับฐานข้อมูล
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Conflict Canvas" value={canvasRows.length} />
        <StatCard label="Commitment Cards" value={commitmentRows.length} />
        <StatCard label="Case 01–02" value={(canvasByCase.case1 || 0) + (canvasByCase.case2 || 0)} />
        <StatCard label="Case 03–04" value={(canvasByCase.case3 || 0) + (canvasByCase.case4 || 0)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'conflict_canvas' as const, label: 'Conflict Canvas' },
            { id: 'commitment' as const, label: 'Commitment Card' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setExpandedId(null);
            }}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.id
                ? 'border-violet-400/60 bg-violet-500/20 text-violet-100'
                : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block min-w-0">
            <span className="block text-xs text-zinc-500 mb-1.5">ค้นหา</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ชื่อ / ข้อความที่กรอก…"
              className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-400/70"
            />
          </label>
          {tab === 'conflict_canvas' && (
            <label className="block min-w-0">
              <span className="block text-xs text-zinc-500 mb-1.5">Case</span>
              <select
                value={caseFilter}
                onChange={(e) => setCaseFilter(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-400/70"
              >
                <option value="">ทั้งหมด</option>
                <option value="case1">Case 01</option>
                <option value="case2">Case 02</option>
                <option value="case3">Case 03</option>
                <option value="case4">Case 04</option>
              </select>
            </label>
          )}
          <label className="block min-w-0">
            <span className="block text-xs text-zinc-500 mb-1.5">Version</span>
            <select
              value={versionFilter}
              onChange={(e) => setVersionFilter(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-400/70"
            >
              <option value="">ทั้งหมด</option>
              {versions.map((v) => (
                <option key={v} value={v}>
                  {v.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="text-xs text-zinc-500">
          แสดง{' '}
          {tab === 'conflict_canvas' ? filteredCanvas.length : filteredCommitments.length} รายการ
          {loading ? ' · กำลังโหลด…' : ''}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <p className="font-medium">{error}</p>
          {(error.toLowerCase().includes('does not exist') ||
            error.toLowerCase().includes('schema cache') ||
            error.toLowerCase().includes('42p01')) && (
            <p className="mt-2 text-xs text-red-200/80">
              รันไฟล์{' '}
              <code className="text-yellow-300/90">backend/supabase/migrations/whale_done_role_play_forms.sql</code>{' '}
              ใน Supabase SQL Editor ก่อน
            </p>
          )}
        </div>
      )}

      {tab === 'conflict_canvas' && (
        <div className="space-y-3">
          {filteredCanvas.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center text-sm text-zinc-500">
              ยังไม่มีข้อมูล Conflict Canvas
            </div>
          ) : (
            filteredCanvas.map((row) => {
              const open = expandedId === row.id;
              return (
                <article
                  key={row.id}
                  className="rounded-2xl border border-violet-500/25 bg-violet-950/15 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : row.id)}
                    className="w-full text-left px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">
                        {display(row.participant_name)}
                      </p>
                      <p className="text-xs text-violet-200/80 mt-0.5 truncate">
                        Case {row.case_no || '—'} · {row.case_title || row.case_key || '—'}
                        {row.page_version ? ` · ${row.page_version.toUpperCase()}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-zinc-500">{formatThaiTime(row.created_at)}</span>
                      <span className="text-xs text-violet-300">{open ? 'ซ่อน' : 'ดูรายละเอียด'}</span>
                    </div>
                  </button>
                  {open && (
                    <div className="border-t border-white/10 px-4 sm:px-5 py-5 grid gap-5 sm:grid-cols-2">
                      <Field label="1. What was at stake" value={row.at_stake} />
                      <Field label="2. Role A felt" value={row.emotion_a} />
                      <Field label="2. Role B felt" value={row.emotion_b} />
                      <Field label="3. What worked well" value={row.worked_well} />
                      <Field label="4. Do differently" value={row.differently} />
                      <Field label="5. Agreement reached" value={row.agreement} />
                      <Field label="6. Real person" value={row.real_person} />
                      <Field label="6. Conflict avoided" value={row.real_conflict} />
                      <Field label="6. First step" value={row.first_step} />
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}

      {tab === 'commitment' && (
        <div className="space-y-3">
          {filteredCommitments.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center text-sm text-zinc-500">
              ยังไม่มีข้อมูล Commitment Card
            </div>
          ) : (
            filteredCommitments.map((row) => {
              const open = expandedId === row.id;
              return (
                <article
                  key={row.id}
                  className="rounded-2xl border border-amber-500/25 bg-amber-950/10 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : row.id)}
                    className="w-full text-left px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">
                        {display(row.participant_name)}
                      </p>
                      <p className="text-xs text-amber-200/80 mt-0.5 truncate">
                        Who: {display(row.who_text)}
                        {row.page_version ? ` · ${row.page_version.toUpperCase()}` : ''}
                        {row.commitment_date ? ` · ${row.commitment_date}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-zinc-500">{formatThaiTime(row.created_at)}</span>
                      <span className="text-xs text-amber-300">{open ? 'ซ่อน' : 'ดูรายละเอียด'}</span>
                    </div>
                  </button>
                  {open && (
                    <div className="border-t border-white/10 px-4 sm:px-5 py-5 grid gap-5 sm:grid-cols-2">
                      <Field label="Who" value={row.who_text} />
                      <Field label="Behavior to change" value={row.behavior} />
                      <Field label="Real impact" value={row.impact} />
                      <Field label="When" value={row.when_text} />
                      <Field label="START doing" value={row.start_doing} />
                      <Field label="STOP doing" value={row.stop_doing} />
                      <Field label="CONTINUE doing" value={row.continue_doing} />
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default AdminWhaleDoneRolePlayDashboardPage;
