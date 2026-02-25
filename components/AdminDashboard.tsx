import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export type CollectionId = 'strategy_posts' | 'strategy_comments' | 'leadership_entries';

const COLLECTIONS: { id: CollectionId; label: string; description: string }[] = [
  { id: 'strategy_posts', label: 'Strategy Posts', description: 'โพสต์ตาม tool_id' },
  { id: 'strategy_comments', label: 'Strategy Comments', description: 'คอมเมนต์ของแต่ละโพสต์' },
  { id: 'leadership_entries', label: 'Leadership Entries', description: 'ผลแบบประเมินสมรรถนะภาวะผู้นำ' },
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

const AdminDashboard: React.FC = () => {
  const [selectedCollection, setSelectedCollection] = useState<CollectionId | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCollection || !isSupabaseConfigured) return;
    setSortColumn(null);
    setLoading(true);
    setError(null);
    supabase
      .from(selectedCollection)
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        setLoading(false);
        if (err) {
          setError(err.message);
          setRows([]);
          return;
        }
        setRows((data as Record<string, unknown>[]) || []);
      });
  }, [selectedCollection]);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const DISPLAY_COLUMN_COUNT = 10;
  const displayColumns = columns.slice(0, DISPLAY_COLUMN_COUNT);

  const sortedRows = useMemo(() => {
    if (!sortColumn || columns.length === 0) return rows;
    return [...rows].sort((a, b) => compare(a[sortColumn], b[sortColumn]));
  }, [rows, sortColumn, columns.length]);

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

  return (
    <div className="flex flex-col min-h-full">
        <header className="flex justify-between items-center px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center glow-yellow">
                <span className="text-black font-black text-xl">M</span>
              </div>
              <span className="text-xl font-bold tracking-tighter">MindDoJo</span>
            </Link>
            <span className="text-gray-500">|</span>
            <span className="text-yellow-400 font-semibold">Admin — ดูข้อมูล Supabase</span>
          </div>
          <Link
            to="/"
            className="px-4 py-2 rounded-xl font-medium bg-white/10 text-white hover:bg-white/20 border border-white/10"
          >
            กลับหน้าหลัก
          </Link>
        </header>

        <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {!isSupabaseConfigured ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
            <p className="font-medium">ยังไม่ได้ตั้งค่า Supabase</p>
            <p className="text-sm text-gray-400 mt-1">
              ใส่ VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-300 mb-4">เลือก Collection (ตาราง)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
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
              <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h3 className="font-bold text-lg">{COLLECTIONS.find((c) => c.id === selectedCollection)?.label}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {rows.length} แถว · แสดง {displayColumns.length}{columns.length > DISPLAY_COLUMN_COUNT ? ` จาก ${columns.length}` : ''} คอลัมน์
                      </span>
                      <button
                        type="button"
                        onClick={downloadExcel}
                        disabled={sortedRows.length === 0}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ดาวน์โหลด Excel
                      </button>
                    </div>
                  </div>
                  {columns.length > 0 && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="text-sm text-gray-400">เรียงตาม</label>
                      <select
                        value={sortColumn ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSortColumn(v || null);
                        }}
                        className="px-3 py-2 rounded-lg bg-white border border-white/20 text-black text-sm focus:outline-none focus:border-yellow-400 min-w-[160px]"
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
                </div>

                {loading ? (
                  <div className="p-12 text-center text-gray-400">กำลังโหลด...</div>
                ) : error ? (
                  <div className="p-6 bg-red-500/10 text-red-400 rounded-xl mx-6 my-4">{error}</div>
                ) : rows.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">ไม่มีข้อมูลใน collection นี้</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          {displayColumns.map((col) => (
                            <th key={col} className="px-4 py-3 font-semibold text-gray-400 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleSort(col)}
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
                        {sortedRows.map((row, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                            {displayColumns.map((col) => {
                              const val = row[col];
                              const display =
                                col === 'created_at'
                                  ? formatThaiTime(val)
                                  : typeof val === 'object' && val !== null
                                    ? JSON.stringify(val)
                                    : String(val ?? '—');
                              return (
                                <td key={col} className="px-4 py-3 text-gray-300 max-w-xs truncate" title={col === 'created_at' ? formatThaiTime(val) : String(val ?? '')}>
                                  {display}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        </main>
    </div>
  );
};

export default AdminDashboard;
