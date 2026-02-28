import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const JoinRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code') ?? '';
  const [roomCode, setRoomCode] = useState(codeFromUrl);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRoomCode((prev) => (codeFromUrl && !prev ? codeFromUrl : prev));
  }, [codeFromUrl]);

  const handleJoin = async () => {
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      setError('กรุณาใส่รหัสห้อง');
      return;
    }
    if (!isSupabaseConfigured) {
      setError('ระบบยังไม่พร้อม ลองใหม่อีกครั้ง');
      return;
    }
    setError(null);
    setJoining(true);
    const { data, error: err } = await supabase
      .from('stickycloud_rooms')
      .select('id')
      .eq('room_code', code)
      .maybeSingle();
    setJoining(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (!data?.id) {
      setError('ไม่พบห้องที่ตรงกับรหัสนี้');
      return;
    }
    navigate(`/room/${data.id}`);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col selection:bg-amber-400 selection:text-slate-900">
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <Link to="/" className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-slate-400 hover:text-white transition text-sm min-h-[44px] min-w-[44px] items-center touch-manipulation" style={{ top: 'max(1rem, env(safe-area-inset-top))' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          กลับหน้าหลัก
        </Link>

        <div className="w-full max-w-md">
          {/* Logo & Title */}
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-2xl shadow-amber-500/30 mb-4 sm:mb-6">
              <span className="font-black text-slate-900 text-xl sm:text-2xl">WB</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 px-2">Workshop Board MindDoJo</h1>
            <p className="text-slate-400 text-sm sm:text-base">ใส่รหัสห้องที่ได้รับจากผู้จัด เพื่อเข้า workspace ร่วมกัน</p>
          </div>

          {/* Card */}
          <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 p-5 sm:p-8 shadow-2xl backdrop-blur-sm">
            <label className="block text-sm font-semibold text-slate-300 mb-3">รหัสห้อง</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="เช่น ABC123"
              maxLength={12}
              className="w-full px-4 sm:px-5 py-4 rounded-xl bg-slate-700/50 border border-slate-600 text-white text-center text-xl sm:text-2xl font-mono tracking-[0.3em] sm:tracking-[0.4em] placeholder-slate-500 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20 outline-none transition min-h-[52px] touch-manipulation"
            />
            {error && (
              <p className="mt-3 text-sm text-red-400 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="w-full mt-6 py-4 min-h-[52px] rounded-xl font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 transition shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 touch-manipulation"
            >
              {joining ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  กำลังเข้า...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  เข้าร่วมห้อง
                </>
              )}
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            รหัสห้องจะถูกส่งจากผู้จัด workshop หรือ facilitator
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinRoomPage;
