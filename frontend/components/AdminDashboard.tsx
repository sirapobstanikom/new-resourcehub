import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import AdminDatabaseSummaryDashboard from './AdminDatabaseSummaryDashboard';

export type CollectionId =
  | 'leadership_entries'
  | 'innoclub_evaluation_responses'
  | 'innoclub_second_reflections'
  | 'innoclub_second_votes'
  | 'innoclub_second_vote_options'
  | 'leave_requests'
  | 'persuasion_results'
  | 'reactive_proactive_mindset_results'
  | 'conflict_management_style_results'
  | 'key_principles_results'
  | 'innovation_evaluatees'
  | 'innovation_evaluation_responses';

const COLLECTIONS: { id: CollectionId; label: string; description: string }[] = [
  { id: 'leadership_entries', label: 'Leadership Entries', description: 'ผลแบบประเมินสมรรถนะภาวะผู้นำ' },
  { id: 'innoclub_evaluation_responses', label: 'แบบประเมิน INNO Club', description: 'ความพึงพอใจ PTT GROUP INNO Club' },
  {
    id: 'innoclub_second_reflections',
    label: 'InnoClub ครั้งที่ 2 — Reflection',
    description: 'คำตอบ Post-Activity Reflection Questions',
  },
  {
    id: 'innoclub_second_votes',
    label: 'InnoClub ครั้งที่ 2 — Vote',
    description: 'ผลโหวต Stop Motion & AI Video Creation Vote',
  },
  {
    id: 'innoclub_second_vote_options',
    label: 'InnoClub ครั้งที่ 2 — Vote Options',
    description: 'รายชื่อทีม/ผลงานที่เปิดให้โหวต',
  },
  { id: 'leave_requests', label: 'คำขอลา (Leave Requests)', description: 'คำขอลาทุกประเภท รวมลากิจ ลาป่วย Work from Home ลาพักร้อน ลาไม่รับเงิน' },
  {
    id: 'persuasion_results',
    label: 'Persuasion Test',
    description: 'ผลแบบประเมิน Persuasion (คะแนนช่องทางโน้มน้าวใจ dominant_channels)',
  },
  {
    id: 'reactive_proactive_mindset_results',
    label: 'Reactive vs Proactive Mindset',
    description: 'ผลแบบประเมิน Reactive vs Proactive (คะแนนรวม 20–100, คะแนนมิติ dimension_scores)',
  },
  {
    id: 'conflict_management_style_results',
    label: 'Conflict Management Style',
    description: 'ผลแบบประเมินรูปแบบการจัดการความขัดแย้ง (คะแนน 5 รูปแบบใน style_scores ข้อละ 3–12)',
  },
  {
    id: 'key_principles_results',
    label: 'Key Principles',
    description:
      'ผลแบบประเมิน Key Principles (ชื่อ, บริษัท, answers คะแนนข้อ 1–25, principle_scores ต่อส่วน, total_score รวม 125)',
  },
  {
    id: 'innovation_evaluatees',
    label: 'Innovation — รายชื่อผู้ถูกประเมิน',
    description: 'รายชื่อผู้ถูกประเมินแบบ Innovation',
  },
  {
    id: 'innovation_evaluation_responses',
    label: 'Innovation — คะแนนประเมิน',
    description: 'คะแนนจาก Dr. Keita Ono และ Jeerawat Yaowanich ตามเกณฑ์ 5 ข้อ',
  },
];

function cellValue(val: unknown): string | number {
  if (val == null) return '—';
  if (typeof val === 'object') return JSON.stringify(val);
  return typeof val === 'string' || typeof val === 'number' ? val : String(val);
}

function formatThaiTime(val: unknown): string {
  if (val == null) return '—';
  const d = new Date(val as string | number | Date);
  if (Number.isNaN(d.getTime())) return String(val);
  return d.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function compare(a: unknown, b: unknown): number {
  const av = a == null ? '' : typeof a === 'object' ? JSON.stringify(a) : a;
  const bv = b == null ? '' : typeof b === 'object' ? JSON.stringify(b) : b;
  if (typeof av === 'number' && typeof bv === 'number') return av - bv;
  return String(av).localeCompare(String(bv));
}

const PER_PAGE = 10;
const DATE_COLUMN = 'created_at'; // คอลัมน์ที่ใช้กรองช่วงเวลา

const AdminDashboard: React.FC = () => {
  const [selectedCollection, setSelectedCollection] = useState<CollectionId | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    if (!selectedCollection || !isSupabaseConfigured) return;
    setShowDashboard(false);
    setSortColumn(null);
    setPage(1);
    setLoading(true);
    setError(null);
    let query = supabase
      .from(selectedCollection)
      .select('*')
      .order(DATE_COLUMN, { ascending: false });

    if (dateFrom) {
      const fromISO = new Date(dateFrom).toISOString();
      query = query.gte(DATE_COLUMN, fromISO);
    }
    if (dateTo) {
      const toISO = new Date(dateTo).toISOString();
      query = query.lte(DATE_COLUMN, toISO);
    }

    query.then(({ data, error: err }) => {
        setLoading(false);
        if (err) {
          setError(err.message);
          setRows([]);
          return;
        }
        setRows((data as Record<string, unknown>[]) || []);
      });
  }, [selectedCollection, dateFrom, dateTo]);

  const isPermissionError = error?.toLowerCase().includes('policy') || error?.toLowerCase().includes('permission') || error?.toLowerCase().includes('row-level security') || error?.toLowerCase().includes('rlspolicy');

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const displayColumns = columns;

  const sortedRows = useMemo(() => {
    if (!sortColumn || columns.length === 0) return rows;
    return [...rows].sort((a, b) => compare(a[sortColumn], b[sortColumn]));
  }, [rows, sortColumn, columns.length]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = sortedRows.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const handleSort = (col: string) => {
    setSortColumn((prev) => (prev === col ? null : col));
  };

  const downloadExcel = () => {
    if (sortedRows.length === 0 || columns.length === 0) return;
    const sheetData = sortedRows.map((row) => {
      const obj: Record<string, string | number> = {};
      columns.forEach((col) => {
        obj[col] = col === 'created_at' ? formatThaiTime(row[col]) : cellValue(row[col]);
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedCollection || 'Sheet1');
    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${selectedCollection}_${date}.xlsx`);
  };

  const deleteRow = async (rowId: string | number) => {
    if (!selectedCollection || !isSupabaseConfigured) {
      throw new Error('ยังไม่ได้ตั้งค่า Supabase');
    }
    const { error: deleteError } = await supabase.from(selectedCollection).delete().eq('id', rowId);
    if (deleteError) throw new Error(deleteError.message);
    setRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  return (
    <div className="flex flex-col min-h-full">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-4 sm:px-6 py-4 sm:py-6 border-b border-white/10">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
            <Link to="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-yellow-400 rounded-lg flex items-center justify-center glow-yellow">
                <span className="text-black font-semibold text-lg sm:text-xl">M</span>
              </div>
              <span className="text-base sm:text-xl font-semibold tracking-tighter">MindDoJo</span>
            </Link>
            <span className="hidden sm:inline text-gray-500">|</span>
            <span className="text-yellow-400 font-semibold text-sm sm:text-base truncate">Admin — ดูข้อมูล Database</span>
          </div>
          <Link
            to="/"
            className="min-h-[44px] flex items-center justify-center px-4 py-3 rounded-xl font-medium bg-white/10 text-white hover:bg-white/20 border border-white/10 w-full sm:w-auto text-center"
          >
            กลับหน้าหลัก
          </Link>
        </header>

        <main className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-6 py-5 sm:py-8">
        {!isSupabaseConfigured ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
            <p className="font-medium">ยังไม่ได้ตั้งค่า Supabase</p>
            <p className="text-sm text-gray-400 mt-1">
              ใส่ VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env
            </p>
          </div>
        ) : (
          <>
            <section className="mb-8 rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-4 sm:p-5">
              <h2 className="text-lg font-bold text-yellow-300 mb-1">แบบประเมิน Innovation</h2>
              <p className="text-sm text-gray-400 mb-4">
                ผู้ประเมิน 2 คน · เกณฑ์ 5 ข้อ · คะแนนรวม 100 · Dashboard เฉลี่ย 50/50
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/evaluation/innovation"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-black hover:bg-yellow-300"
                >
                  เปิดแบบประเมิน
                </a>
                <Link
                  to="/admin/innovation-evaluatees"
                  className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-2.5 text-sm font-medium text-yellow-200 hover:bg-yellow-400/20"
                >
                  จัดการรายชื่อผู้ถูกประเมิน
                </Link>
                <a
                  href="/evaluation/innovation/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10"
                >
                  Dashboard สรุปคะแนน
                </a>
              </div>
            </section>

            <h2 className="text-lg font-bold text-gray-300 mb-4">เลือก Collection (ตาราง)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10">
              {COLLECTIONS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setSelectedCollection(col.id)}
                  className={`rounded-2xl border p-6 text-left transition-all ${
                    selectedCollection === col.id
                      ? 'border-yellow-400 bg-yellow-400/10 text-yellow-400'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="font-bold mb-1">{col.label}</div>
                  <div className="text-sm text-gray-500">{col.description}</div>
                </button>
              ))}
            </div>

            {selectedCollection && (
              <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-white/10 space-y-3">
                  <div className="flex flex-col gap-3">
                    <h3 className="font-bold text-lg">{COLLECTIONS.find((c) => c.id === selectedCollection)?.label}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-wrap">
                      <span className="text-sm text-gray-500">
                        {sortedRows.length} แถว · {displayColumns.length} คอลัมน์ · หน้า {currentPage}/{totalPages}
                      </span>
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <button
                          type="button"
                          onClick={() => setShowDashboard(true)}
                          disabled={sortedRows.length === 0}
                          className="px-4 py-2 rounded-xl text-sm font-medium bg-yellow-400/15 text-yellow-300 hover:bg-yellow-400/25 border border-yellow-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
                        >
                          สร้าง Dashboard
                        </button>
                        <button
                          type="button"
                          onClick={downloadExcel}
                          disabled={sortedRows.length === 0}
                          className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
                        >
                          ดาวน์โหลด Excel
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {columns.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <label className="text-sm text-gray-400 w-full sm:w-auto">เรียงตาม</label>
                        <select
                          value={sortColumn ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSortColumn(v || null);
                            setPage(1);
                          }}
                          className="px-3 py-2 rounded-lg bg-white border border-white/20 text-black text-sm focus:outline-none focus:border-yellow-400 min-w-0 flex-1 sm:min-w-[160px] sm:flex-none"
                        >
                          <option value="">— ไม่เรียง</option>
                          {columns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 sm:border-l sm:border-white/10 sm:pl-4">
                      <span className="text-sm text-gray-400">ช่วงเวลา (คอลัมน์ {DATE_COLUMN})</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="datetime-local"
                          value={dateFrom}
                          onChange={(e) => {
                            setDateFrom(e.target.value);
                            setPage(1);
                          }}
                          className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-yellow-400 min-w-0 flex-1"
                        />
                        <span className="text-gray-500 text-sm">ถึง</span>
                        <input
                          type="datetime-local"
                          value={dateTo}
                          onChange={(e) => {
                            setDateTo(e.target.value);
                            setPage(1);
                          }}
                          className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-yellow-400 min-w-0 flex-1"
                        />
                        {(dateFrom || dateTo) && (
                          <button
                            type="button"
                            onClick={() => {
                              setDateFrom('');
                              setDateTo('');
                              setPage(1);
                            }}
                            className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10"
                          >
                            ล้างช่วง
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {showDashboard && !loading && !error && sortedRows.length > 0 ? (
                  <div className="p-4 sm:p-6">
                    <AdminDatabaseSummaryDashboard
                      collectionId={selectedCollection}
                      collectionLabel={COLLECTIONS.find((c) => c.id === selectedCollection)?.label || selectedCollection}
                      rows={sortedRows}
                      columns={displayColumns}
                      dateFrom={dateFrom}
                      dateTo={dateTo}
                      onBack={() => setShowDashboard(false)}
                      onDeleteRow={deleteRow}
                    />
                  </div>
                ) : loading ? (
                  <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
                ) : error ? (
                  <div className="p-6 mx-6 my-4 space-y-2">
                    <div className="bg-red-500/10 text-red-400 rounded-xl p-4">{error}</div>
                    {isPermissionError && selectedCollection === 'innoclub_evaluation_responses' && (
                      <div className="bg-amber-500/10 text-amber-200 rounded-xl p-4 text-sm">
                        <p className="font-medium mb-1">ให้เห็นข้อมูลแบบประเมิน INNO Club:</p>
                        <p className="text-gray-400 mb-2">ไปที่ Supabase → SQL Editor แล้วรัน:</p>
                        <code className="block bg-black/30 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre">
{`drop policy if exists "Allow read innoclub_evaluation" on public.innoclub_evaluation_responses;
create policy "Allow read innoclub_evaluation"
  on public.innoclub_evaluation_responses for select using (true);`}
                        </code>
                      </div>
                    )}
                    {isPermissionError && selectedCollection === 'persuasion_results' && (
                      <div className="bg-amber-500/10 text-amber-200 rounded-xl p-4 text-sm">
                        <p className="font-medium mb-1">ให้เห็นข้อมูล Persuasion Test:</p>
                        <p className="text-gray-400 mb-2">ไปที่ Supabase → SQL Editor แล้วเพิ่ม policy ให้ role ที่ใช้ดูแอดมิน (ตัวอย่างอ่านได้ทุกแถว):</p>
                        <code className="block bg-black/30 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre">
{`drop policy if exists "Allow read persuasion_results admin" on public.persuasion_results;
create policy "Allow read persuasion_results admin"
  on public.persuasion_results for select using (true);`}
                        </code>
                      </div>
                    )}
                    {isPermissionError && selectedCollection === 'reactive_proactive_mindset_results' && (
                      <div className="bg-amber-500/10 text-amber-200 rounded-xl p-4 text-sm">
                        <p className="font-medium mb-1">ให้เห็นข้อมูล Reactive vs Proactive:</p>
                        <p className="text-gray-400 mb-2">
                          รัน migration ในโฟลเดอร์ <code className="text-yellow-400/90">backend/supabase/migrations</code> หรือเพิ่ม policy ใน SQL Editor:
                        </p>
                        <code className="block bg-black/30 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre">
{`drop policy if exists "Allow read reactive proactive mindset results" on public.reactive_proactive_mindset_results;
create policy "Allow read reactive proactive mindset results"
  on public.reactive_proactive_mindset_results for select using (true);`}
                        </code>
                      </div>
                    )}
                    {isPermissionError && selectedCollection === 'conflict_management_style_results' && (
                      <div className="bg-amber-500/10 text-amber-200 rounded-xl p-4 text-sm">
                        <p className="font-medium mb-1">ให้เห็นข้อมูล Conflict Management Style:</p>
                        <p className="text-gray-400 mb-2">
                          รัน migration ในโฟลเดอร์ <code className="text-yellow-400/90">backend/supabase/migrations</code> หรือเพิ่ม policy ใน SQL Editor:
                        </p>
                        <code className="block bg-black/30 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre">
{`drop policy if exists "Allow read conflict management style results" on public.conflict_management_style_results;
create policy "Allow read conflict management style results"
  on public.conflict_management_style_results for select using (true);`}
                        </code>
                      </div>
                    )}
                    {isPermissionError && selectedCollection === 'key_principles_results' && (
                      <div className="bg-amber-500/10 text-amber-200 rounded-xl p-4 text-sm">
                        <p className="font-medium mb-1">ให้เห็นข้อมูล Key Principles:</p>
                        <p className="text-gray-400 mb-2">
                          รัน migration ในโฟลเดอร์ <code className="text-yellow-400/90">backend/supabase/migrations</code> หรือเพิ่ม policy ใน SQL Editor:
                        </p>
                        <code className="block bg-black/30 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre">
{`drop policy if exists "Allow read key principles results" on public.key_principles_results;
create policy "Allow read key principles results"
  on public.key_principles_results for select using (true);`}
                        </code>
                      </div>
                    )}
                  </div>
                ) : rows.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">ไม่มีข้อมูลใน collection นี้{dateFrom || dateTo ? ' ในช่วงเวลาที่เลือก' : ''}</div>
                ) : (
                  <>
                  <p className="sm:hidden text-xs text-gray-500 mb-2 px-1">เลื่อนซ้าย-ขวาเพื่อดูตาราง</p>
                  <div className="overflow-x-auto -mx-1 sm:mx-0">
                    <table className="w-full text-left text-sm min-w-[600px]">
                      <thead>
                        <tr className="border-b border-white/10">
                          {displayColumns.map((col) => (
                            <th key={col} className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  handleSort(col);
                                  setPage(1);
                                }}
                                className="flex items-center gap-1.5 text-left hover:text-yellow-400 transition-colors w-full"
                              >
                                {col}
                                {sortColumn === col && (
                                  <span className="text-yellow-400" aria-hidden>↑</span>
                                )}
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.map((row, i) => (
                          <tr key={(currentPage - 1) * PER_PAGE + i} className="border-b border-white/5 hover:bg-white/5">
                            {displayColumns.map((col) => {
                              const val = row[col];
                              const display =
                                col === 'created_at'
                                  ? formatThaiTime(val)
                                  : typeof val === 'object' && val !== null
                                    ? JSON.stringify(val)
                                    : String(val ?? '—');
                              return (
                                <td key={col} className="px-3 sm:px-4 py-2 sm:py-3 text-gray-300 max-w-[200px] sm:max-w-xs truncate" title={col === 'created_at' ? formatThaiTime(val) : String(val ?? '')}>
                                  {display}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div className="px-4 sm:px-6 py-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <span className="text-sm text-gray-500">
                        แถว {(currentPage - 1) * PER_PAGE + 1}–{Math.min(currentPage * PER_PAGE, sortedRows.length)} จาก {sortedRows.length}
                      </span>
                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                          className="px-3 sm:px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10"
                        >
                          ← ก่อนหน้า
                        </button>
                        <span className="text-sm text-gray-400 px-1 sm:px-2">
                          หน้า {currentPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className="px-3 sm:px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10"
                        >
                          ถัดไป →
                        </button>
                      </div>
                    </div>
                  )}
                  </>
                )}
              </div>
              </div>
            )}
          </>
        )}
        </main>
    </div>
  );
};

export default AdminDashboard;
