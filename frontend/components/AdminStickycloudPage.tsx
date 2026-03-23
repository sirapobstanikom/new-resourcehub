import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateRoomCode } from '../lib/roomCode';

const BACKGROUND_OPTIONS: { value: string; label: string }[] = [
  { value: 'bmc', label: 'Business Model Canvas (BMC)' },
  { value: 'lean_canvas', label: 'Lean Canvas' },
  { value: 'wild_ideas', label: 'Wild Ideas / Practical Solutions' },
  { value: 'blank', label: 'พื้นหลังว่าง' },
];

type RoomRow = { id: string; room_code: string; name: string; created_at: string };

const AdminStickycloudPage: React.FC = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [roomName, setRoomName] = useState('');
  const [backgroundType, setBackgroundType] = useState<string>('bmc');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRooms = React.useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase
      .from('stickycloud_rooms')
      .select('id, room_code, name, created_at')
      .order('created_at', { ascending: false });
    setRooms((data as RoomRow[]) || []);
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreate = async () => {
    if (!isSupabaseConfigured) {
      setError('ยังไม่ได้ตั้งค่า Supabase');
      return;
    }
    setError(null);
    setCreating(true);
    const name = roomName.trim() || 'ห้องใหม่';
    let code = generateRoomCode(6);
    const maxAttempts = 10;
    for (let i = 0; i < maxAttempts; i++) {
      const { data: roomData, error: roomErr } = await supabase
        .from('stickycloud_rooms')
        .insert({
          room_code: code,
          name,
          created_by: user?.email ?? undefined,
        })
        .select('id')
        .single();
      if (roomErr) {
        if ((roomErr as { code?: string }).code === '23505') {
          code = generateRoomCode(6);
          continue;
        }
        setError(roomErr.message);
        setCreating(false);
        return;
      }
      const roomId = (roomData as { id: string }).id;
      const { error: boardErr } = await supabase.from('stickycloud_boards').insert({
        room_id: roomId,
        name: 'Main Board',
        background_type: backgroundType,
        sort_order: 0,
      });
      if (boardErr) {
        setError(boardErr.message);
        await supabase.from('stickycloud_rooms').delete().eq('id', roomId);
        setCreating(false);
        return;
      }
      setRoomName('');
      await fetchRooms();
      setCreating(false);
      return;
    }
    setError('สร้างรหัสห้องไม่สำเร็จ ลองใหม่');
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ลบห้องนี้? โพสต์อิทและบอร์ดทั้งหมดจะถูกลบด้วย')) return;
    setDeletingId(id);
    await supabase.from('stickycloud_rooms').delete().eq('id', id);
    await fetchRooms();
    setDeletingId(null);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-8 sm:mb-10">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
          <span className="font-black text-slate-900 text-lg sm:text-xl">WB</span>
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white truncate">Workshop Board MindDoJo</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">Control Panel — สร้างห้อง แชร์รหัส จัดการห้อง workshop</p>
        </div>
      </div>

      {/* รายการห้อง */}
      {rooms.length > 0 && (
        <section className="mb-8 sm:mb-10">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">ห้องทั้งหมด</h2>
          <ul className="space-y-3">
            {rooms.map((r) => (
              <li
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 py-4 px-4 sm:px-5 rounded-2xl bg-white/5 border border-white/10 hover:border-slate-600/50 transition"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                    <code className="font-mono font-bold text-amber-400 text-xs sm:text-sm">{r.room_code}</code>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white truncate">{r.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">สร้างเมื่อ {new Date(r.created_at).toLocaleDateString('th-TH')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(r.room_code)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-xl bg-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-600/50 transition touch-manipulation"
                    title="คัดลอกรหัส"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2m8 0h2a2 2 0 012 2v2m0 8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-8a2 2 0 012-2h2" />
                    </svg>
                  </button>
                  <Link
                    to={`/room/${r.id}`}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-400/20 text-amber-400 hover:bg-amber-400/30 font-medium text-sm transition touch-manipulation"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    เปิดห้อง
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    disabled={deletingId === r.id}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition touch-manipulation"
                    title="ลบห้อง"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* สร้างห้องใหม่ */}
      <section className="rounded-2xl bg-white/5 border border-white/10 p-5 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-white">สร้างห้องใหม่</h2>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">ชื่อห้อง</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="เช่น Workshop BMC มีนาคม"
              className="w-full px-4 py-3.5 min-h-[48px] rounded-xl bg-black/20 border border-white/10 text-white placeholder-slate-500 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 outline-none transition touch-manipulation"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Template บอร์ดแรก (Main Board)</label>
            <select
              value={backgroundType}
              onChange={(e) => setBackgroundType(e.target.value)}
              className="w-full px-4 py-3.5 min-h-[48px] rounded-xl bg-black/20 border border-white/10 text-white focus:border-amber-400/50 outline-none transition touch-manipulation"
            >
              {BACKGROUND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-4 min-h-[52px] rounded-xl font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 touch-manipulation"
          >
            {creating ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                กำลังสร้าง...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                สร้างห้อง
              </>
            )}
          </button>
        </div>
      </section>

      <p className="mt-8 text-sm text-slate-500">
        ผู้ใช้ไปที่ <Link to="/room" className="text-amber-400 hover:underline font-medium">/room</Link> แล้วใส่รหัสห้อง เพื่อเข้า workspace แปะโพสต์อิท เลือกสี และสร้างบอร์ดใหม่ได้
      </p>
    </div>
  );
};

export default AdminStickycloudPage;
