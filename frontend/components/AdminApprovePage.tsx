import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AdminApprovePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!token) {
      setMessage({ type: 'error', text: 'ไม่มี token ในลิงก์' });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'รหัสผ่านกับยืนยันไม่ตรงกัน' });
      return;
    }
    if (!isSupabaseConfigured) {
      setMessage({ type: 'error', text: 'ระบบยังไม่พร้อม' });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('approve-admin', {
      body: { token, password },
    });
    setLoading(false);
    if (error || data?.error) {
      setMessage({ type: 'error', text: data?.error || error?.message || 'เกิดข้อผิดพลาด' });
      return;
    }
    setDone(true);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-transparent text-white bg-grid flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <p className="text-red-400">ลิงก์ไม่ถูกต้อง หรือไม่มี token</p>
          <Link to="/" className="mt-4 inline-block text-yellow-400 hover:underline">← กลับหน้าหลัก</Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-transparent text-white bg-grid flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <p className="text-green-400 text-lg font-medium">อนุมัติแล้ว</p>
          <p className="text-gray-400 mt-2">แอดมินคนนี้สามารถเข้าสู่ระบบได้ที่หน้า Login Admin MindDojo</p>
          <Link to="/admin/login" className="mt-6 inline-block px-6 py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300">
            ไปหน้าเข้าสู่ระบบแอดมิน
          </Link>
          <p className="mt-4">
            <Link to="/" className="text-gray-400 hover:underline">← กลับหน้าหลัก</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white bg-grid flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-neutral-900/80 border border-white/10 rounded-[32px] p-10 shadow-2xl backdrop-blur-sm">
          <h1 className="text-xl font-semibold text-center mb-2">อนุมัติเป็นแอดมิน MindDoJo</h1>
          <p className="text-gray-500 text-sm text-center mb-6">ตั้งรหัสผ่านสำหรับแอดมินคนนี้ (ใช้ล็อกอินภายหลัง)</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">ยืนยันรหัสผ่าน</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400"
              />
            </div>
            {message && (
              <div className={`p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {message.text}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-60"
            >
              {loading ? 'กำลังดำเนินการ...' : 'อนุมัติและตั้งรหัสผ่าน'}
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-6">
            <Link to="/" className="text-gray-400 hover:underline">← กลับหน้าหลัก</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminApprovePage;
