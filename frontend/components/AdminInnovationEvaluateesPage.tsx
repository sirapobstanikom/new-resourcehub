import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { INNOVATION_EVALUATION_SQL, type InnovationEvaluatee } from '../lib/innovationEvaluation';

const AdminInnovationEvaluateesPage: React.FC = () => {
  const [evaluatees, setEvaluatees] = useState<InnovationEvaluatee[]>([]);
  const [name, setName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeCount = useMemo(() => evaluatees.filter((item) => item.is_active).length, [evaluatees]);

  const loadEvaluatees = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from('innovation_evaluatees')
      .select('id, name, team_name, sort_order, is_active, created_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setLoading(false);
    if (loadError) {
      setError(loadError.message);
      setEvaluatees([]);
      return;
    }
    setEvaluatees((data as InnovationEvaluatee[]) || []);
  }, []);

  useEffect(() => {
    loadEvaluatees();
  }, [loadEvaluatees]);

  const addEvaluatee = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('กรุณาระบุชื่อผู้ถูกประเมิน');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    const parsedSort = sortOrder.trim() ? Number(sortOrder) : evaluatees.length + 1;
    const { error: saveError } = await supabase.from('innovation_evaluatees').insert({
      name: trimmed,
      team_name: teamName.trim() || null,
      sort_order: Number.isFinite(parsedSort) ? parsedSort : evaluatees.length + 1,
      is_active: true,
    });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setName('');
    setTeamName('');
    setSortOrder('');
    setMessage('เพิ่มรายชื่อผู้ถูกประเมินแล้ว');
    loadEvaluatees();
  };

  const updateEvaluatee = async (
    id: string,
    patch: Partial<Pick<InnovationEvaluatee, 'name' | 'team_name' | 'is_active' | 'sort_order'>>,
  ) => {
    setError(null);
    setMessage(null);
    const { error: updateError } = await supabase
      .from('innovation_evaluatees')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage('อัปเดตรายชื่อแล้ว');
    loadEvaluatees();
  };

  const deleteEvaluatee = async (evaluatee: InnovationEvaluatee) => {
    if (!window.confirm(`ลบ "${evaluatee.name}" และคะแนนที่เกี่ยวข้อง?`)) return;
    setError(null);
    setMessage(null);
    const { error: deleteError } = await supabase.from('innovation_evaluatees').delete().eq('id', evaluatee.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setMessage('ลบรายชื่อแล้ว');
    loadEvaluatees();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-gray-500">Admin Innovation</p>
          <h1 className="text-xl sm:text-2xl font-bold text-white">จัดการรายชื่อผู้ถูกประเมิน</h1>
          <p className="mt-1 text-sm text-gray-400">
            สร้างรายชื่อสำหรับแบบประเมิน Innovation · เปิดใช้งาน {activeCount} คน
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/evaluation/innovation"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm font-medium text-yellow-200 hover:bg-yellow-400/20"
          >
            เปิดแบบประเมิน
          </a>
          <a
            href="/evaluation/innovation/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            Dashboard
          </a>
          <Link to="/admin" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5">
            กลับ Admin
          </Link>
        </div>
      </div>

      {!isSupabaseConfigured ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
          <p className="font-medium">ยังไม่ได้ตั้งค่า Supabase</p>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
              {error.includes('innovation_evaluatees') && (
                <p className="mt-2 text-xs text-red-200/80">รัน SQL: {INNOVATION_EVALUATION_SQL}</p>
              )}
            </div>
          )}
          {message && (
            <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {message}
            </div>
          )}

          <form onSubmit={addEvaluatee} className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
            <h2 className="mb-4 font-semibold text-white">เพิ่มผู้ถูกประเมิน</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-gray-400">ชื่อผู้ถูกประเมิน *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="เช่น ทีม Alpha / ชื่อผู้นำเสนอ"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-yellow-400/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">ทีม / หน่วยงาน (ไม่บังคับ)</label>
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="เช่น Innovation Lab"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-yellow-400/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">ลำดับแสดงผล</label>
                <input
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  inputMode="numeric"
                  placeholder="1"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-white outline-none focus:border-yellow-400/40"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-4 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-black hover:bg-yellow-300 disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : '+ เพิ่มรายชื่อ'}
            </button>
          </form>

          <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
            <div className="border-b border-white/10 px-4 py-3 sm:px-5">
              <h2 className="font-semibold text-white">รายชื่อทั้งหมด</h2>
              <p className="text-xs text-gray-500">{loading ? 'กำลังโหลด...' : `${evaluatees.length} รายการ`}</p>
            </div>
            {evaluatees.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500">ยังไม่มีรายชื่อ — เพิ่มด้านบน</p>
            ) : (
              <div className="divide-y divide-white/8">
                {evaluatees.map((evaluatee) => (
                  <div key={evaluatee.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0 flex-1 space-y-2">
                      <input
                        defaultValue={evaluatee.name}
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (next && next !== evaluatee.name) updateEvaluatee(evaluatee.id, { name: next });
                        }}
                        className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm font-medium text-white"
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          defaultValue={evaluatee.team_name || ''}
                          placeholder="ทีม / หน่วยงาน"
                          onBlur={(e) => {
                            const next = e.target.value.trim();
                            if (next !== (evaluatee.team_name || '')) {
                              updateEvaluatee(evaluatee.id, { team_name: next || null });
                            }
                          }}
                          className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-gray-300"
                        />
                        <input
                          defaultValue={String(evaluatee.sort_order)}
                          inputMode="numeric"
                          onBlur={(e) => {
                            const parsed = Number(e.target.value);
                            if (Number.isFinite(parsed) && parsed !== evaluatee.sort_order) {
                              updateEvaluatee(evaluatee.id, { sort_order: parsed });
                            }
                          }}
                          className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-gray-300"
                        />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => updateEvaluatee(evaluatee.id, { is_active: !evaluatee.is_active })}
                        className={`rounded-lg px-3 py-2 text-xs font-medium ${
                          evaluatee.is_active
                            ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                            : 'border border-white/15 bg-white/5 text-gray-400'
                        }`}
                      >
                        {evaluatee.is_active ? 'เปิดใช้งาน' : 'ปิดชั่วคราว'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteEvaluatee(evaluatee)}
                        className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300"
                      >
                        ลบ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default AdminInnovationEvaluateesPage;
