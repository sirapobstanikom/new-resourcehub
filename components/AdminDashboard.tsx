import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { logoutAdmin } from '../lib/auth';

export type CollectionId = 'strategy_posts' | 'strategy_comments' | 'leadership_entries';

const COLLECTIONS: { id: CollectionId; label: string; description: string }[] = [
  { id: 'strategy_posts', label: 'Strategy Posts', description: 'โพสต์ตาม tool_id' },
  { id: 'strategy_comments', label: 'Strategy Comments', description: 'คอมเมนต์ของแต่ละโพสต์' },
  { id: 'leadership_entries', label: 'Leadership Entries', description: 'ผลแบบประเมินสมรรถนะภาวะผู้นำ' },
];

const AdminDashboard: React.FC = () => {
  const [selectedCollection, setSelectedCollection] = useState<CollectionId | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCollection || !isSupabaseConfigured) return;

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

  return (
    <div className="min-h-screen bg-black text-white bg-grid flex flex-col selection:bg-yellow-400 selection:text-black">
      <header className="flex justify-between items-center px-6 py-6 max-w-6xl mx-auto w-full border-b border-white/10">
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
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="px-4 py-2 rounded-xl font-medium bg-white/10 text-white hover:bg-white/20 border border-white/10"
          >
            กลับหน้าหลัก
          </Link>
          <button
            onClick={() => {
              logoutAdmin();
              window.location.href = '/admin/login';
            }}
            className="px-4 py-2 rounded-xl font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
          >
            ออกจากระบบ
          </button>
        </div>
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
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-bold text-lg">{COLLECTIONS.find((c) => c.id === selectedCollection)?.label}</h3>
                  <span className="text-sm text-gray-500">{rows.length} แถว</span>
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
                          {columns.map((col) => (
                            <th key={col} className="px-4 py-3 font-semibold text-gray-400 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                            {columns.map((col) => (
                              <td key={col} className="px-4 py-3 text-gray-300 max-w-xs truncate" title={String(row[col] ?? '')}>
                                {typeof row[col] === 'object' && row[col] !== null
                                  ? JSON.stringify(row[col])
                                  : String(row[col] ?? '—')}
                              </td>
                            ))}
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
