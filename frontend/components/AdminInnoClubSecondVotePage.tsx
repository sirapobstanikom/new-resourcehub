import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type VoteOption = {
  id: string;
  label: string;
  image_url?: string | null;
  is_active: boolean;
  sort_order: number | null;
  created_at?: string | null;
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const AdminInnoClubSecondVotePage: React.FC = () => {
  const [options, setOptions] = useState<VoteOption[]>([]);
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeCount = useMemo(() => options.filter((option) => option.is_active).length, [options]);

  const loadOptions = React.useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from('innoclub_second_vote_options')
      .select('id, label, image_url, is_active, sort_order, created_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setLoading(false);
    if (loadError) {
      setError(loadError.message);
      setOptions([]);
      return;
    }
    setOptions((data as VoteOption[]) || []);
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const addOption = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) {
      setError('กรุณาระบุชื่อทีม/ผลงาน');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase');
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    const parsedSort = sortOrder.trim() ? Number(sortOrder) : options.length + 1;
    const { error: saveError } = await supabase.from('innoclub_second_vote_options').insert({
      label: trimmed,
      sort_order: Number.isFinite(parsedSort) ? parsedSort : options.length + 1,
      is_active: true,
    });
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setLabel('');
    setSortOrder('');
    setMessage('เพิ่มตัวเลือกโหวตแล้ว');
    loadOptions();
  };

  const updateOption = async (id: string, patch: Partial<Pick<VoteOption, 'label' | 'image_url' | 'is_active' | 'sort_order'>>) => {
    setError(null);
    setMessage(null);
    const { error: updateError } = await supabase
      .from('innoclub_second_vote_options')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage('อัปเดตตัวเลือกแล้ว');
    loadOptions();
  };

  const deleteOption = async (option: VoteOption) => {
    if (!window.confirm(`ลบตัวเลือก "${option.label}" ?`)) return;
    setError(null);
    setMessage(null);
    const { error: deleteError } = await supabase.from('innoclub_second_vote_options').delete().eq('id', option.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setMessage('ลบตัวเลือกแล้ว');
    loadOptions();
  };

  const uploadImage = async (option: VoteOption, file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพ');
      return;
    }
    if (file.size > 900 * 1024) {
      setError('รูปใหญ่เกินไป กรุณาใช้รูปไม่เกิน 900KB');
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      await updateOption(option.id, { image_url: dataUrl });
    } catch {
      setError('อัปโหลดรูปไม่สำเร็จ');
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-4 sm:px-6 py-4 sm:py-6 border-b border-white/10">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-yellow-400">Admin — InnoClub ครั้งที่ 2 Vote</h1>
          <p className="text-sm text-gray-400 mt-1">ตั้งค่าว่าให้ผู้เข้าร่วมโหวตทีม/ผลงานใดได้บ้าง</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <a
            href="/evaluation/innoclub-2"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 rounded-xl font-medium bg-yellow-400 text-black hover:bg-yellow-300 text-center transition-colors"
          >
            เปิดหน้าผู้ตอบ
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-6 py-5 sm:py-8">
        {!isSupabaseConfigured ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
            ยังไม่ได้ตั้งค่า Supabase
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="font-bold text-lg text-gray-100">เพิ่มตัวเลือกโหวต</h2>
                  <p className="text-sm text-gray-500">เช่น Team 1, ชื่อกลุ่ม, หรือชื่อผลงาน</p>
                </div>
                <div className="rounded-xl border border-yellow-300/20 bg-yellow-300/10 px-3 py-2 text-sm text-yellow-100">
                  เปิดโหวตอยู่ {activeCount} รายการ
                </div>
              </div>

              <form onSubmit={addOption} className="grid grid-cols-1 sm:grid-cols-[1fr_8rem_auto] gap-3">
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="ชื่อทีม/ผลงาน"
                  className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  placeholder="ลำดับ"
                  className="px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'กำลังเพิ่ม...' : 'เพิ่ม'}
                </button>
              </form>
            </section>

            {error && <div className="rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 text-sm">{error}</div>}
            {message && (
              <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-3 text-sm">
                {message}
              </div>
            )}

            <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="font-bold text-lg">รายการที่ตั้งไว้</h2>
                <button
                  type="button"
                  onClick={loadOptions}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-white/10 text-white hover:bg-white/20 border border-white/10"
                >
                  โหลดใหม่
                </button>
              </div>

              {loading ? (
                <div className="p-10 text-center text-gray-400">กำลังโหลด...</div>
              ) : options.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  ยังไม่มีตัวเลือกโหวต
                  <p className="text-sm mt-2">
                    หากยังไม่มีตาราง ให้รันไฟล์ SQL ที่เพิ่มไว้ใน <code className="text-yellow-400">backend/supabase/create_innoclub_second_vote.sql</code>
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[680px]">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400">
                        <th className="px-4 py-3 font-semibold">เปิดใช้</th>
                        <th className="px-4 py-3 font-semibold">รูป</th>
                        <th className="px-4 py-3 font-semibold">ชื่อทีม/ผลงาน</th>
                        <th className="px-4 py-3 font-semibold">ลำดับ</th>
                        <th className="px-4 py-3 font-semibold text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {options.map((option) => (
                        <tr key={option.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={option.is_active}
                              onChange={(e) => updateOption(option.id, { is_active: e.target.checked })}
                              className="h-5 w-5 accent-yellow-400"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-14 w-14 overflow-hidden rounded-full border border-yellow-300/35 bg-black/35">
                                {option.image_url ? (
                                  <img src={option.image_url} alt={option.label} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-500">
                                    ไม่มีรูป
                                  </div>
                                )}
                              </div>
                              <label className="cursor-pointer rounded-lg border border-yellow-300/25 bg-yellow-300/10 px-3 py-2 text-xs font-bold text-yellow-100 hover:bg-yellow-300/20">
                                อัปโหลดรูป
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="sr-only"
                                  onChange={(e) => uploadImage(option, e.target.files?.[0])}
                                />
                              </label>
                              {option.image_url && (
                                <button
                                  type="button"
                                  onClick={() => updateOption(option.id, { image_url: null })}
                                  className="rounded-lg border border-white/10 px-2 py-2 text-xs text-gray-400 hover:text-white"
                                >
                                  ลบรูป
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={option.label}
                              onChange={(e) =>
                                setOptions((prev) =>
                                  prev.map((item) => (item.id === option.id ? { ...item, label: e.target.value } : item))
                                )
                              }
                              onBlur={(e) => {
                                const next = e.target.value.trim();
                                if (next) updateOption(option.id, { label: next });
                                else loadOptions();
                              }}
                              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white focus:outline-none focus:border-yellow-400"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={option.sort_order ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value;
                                setOptions((prev) =>
                                  prev.map((item) =>
                                    item.id === option.id
                                      ? { ...item, sort_order: raw === '' ? null : Number(raw) }
                                      : item
                                  )
                                );
                              }}
                              onBlur={(e) => {
                                const next = e.target.value === '' ? null : Number(e.target.value);
                                updateOption(option.id, { sort_order: Number.isFinite(next) ? next : null });
                              }}
                              className="w-24 px-3 py-2 rounded-lg bg-white/10 border border-white/15 text-white focus:outline-none focus:border-yellow-400"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => deleteOption(option)}
                              className="px-3 py-2 rounded-lg text-sm text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20"
                            >
                              ลบ
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <Link to="/admin" className="inline-flex text-sm text-gray-400 hover:text-white">
              กลับหน้า Database
            </Link>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminInnoClubSecondVotePage;
