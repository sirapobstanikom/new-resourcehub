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
    <div className="md-page relative">
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top))', paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <Link to="/" className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition text-sm min-h-[44px] min-w-[44px] items-center touch-manipulation" style={{ top: 'max(1rem, env(safe-area-inset-top))' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          กลับหน้าหลัก
        </Link>

        <div className="w-full max-w-md">
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#FFCC00] shadow-md shadow-yellow-400/25 mb-4 sm:mb-6">
              <span className="font-black text-gray-900 text-xl sm:text-2xl">WB</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 px-2">Workshop Board MindDoJo</h1>
            <p className="text-gray-500 text-sm sm:text-base">ใส่รหัสห้องที่ได้รับจากผู้จัด เพื่อเข้า workspace ร่วมกัน</p>
          </div>

          <div className="md-card p-5 sm:p-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3">รหัสห้อง</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="เช่น ABC123"
              maxLength={12}
              className="md-input text-center text-xl sm:text-2xl font-mono tracking-[0.3em] sm:tracking-[0.4em] min-h-[52px] touch-manipulation"
            />
            {error && (
              <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
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
              className="md-btn-primary w-full mt-6 min-h-[52px] !rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 touch-manipulation"
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

          <p className="mt-8 text-center text-sm text-gray-500">
            รหัสห้องจะถูกส่งจากผู้จัด workshop หรือ facilitator
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinRoomPage;
