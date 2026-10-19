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
      <div className="md-page items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <p className="text-red-600">ลิงก์ไม่ถูกต้อง หรือไม่มี token</p>
          <Link to="/" className="mt-4 inline-block text-yellow-600 hover:underline font-medium">← กลับหน้าหลัก</Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="md-page items-center justify-center p-6">
        <div className="w-full max-w-md text-center md-card p-10">
          <p className="text-green-700 text-lg font-medium">อนุมัติแล้ว</p>
          <p className="text-gray-600 mt-2">แอดมินคนนี้สามารถเข้าสู่ระบบได้ที่หน้า Login Admin MindDojo</p>
          <Link to="/admin/login" className="mt-6 inline-block md-btn-primary !rounded-xl">
            ไปหน้าเข้าสู่ระบบแอดมิน
          </Link>
          <p className="mt-4">
            <Link to="/" className="text-gray-500 hover:text-gray-900 hover:underline">← กลับหน้าหลัก</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="md-page items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="md-card rounded-[32px] p-10 shadow-md">
          <h1 className="text-xl font-semibold text-center mb-2 text-gray-900">อนุมัติเป็นแอดมิน MindDoJo</h1>
          <p className="text-gray-500 text-sm text-center mb-6">ตั้งรหัสผ่านสำหรับแอดมินคนนี้ (ใช้ล็อกอินภายหลัง)</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="md-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">ยืนยันรหัสผ่าน</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="md-input"
              />
            </div>
            {message && (
              <div className={`p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.text}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="md-btn-primary w-full !rounded-xl disabled:opacity-60"
            >
              {loading ? 'กำลังดำเนินการ...' : 'อนุมัติและตั้งรหัสผ่าน'}
            </button>
          </form>
          <p className="text-center text-gray-500 text-sm mt-6">
            <Link to="/" className="text-gray-500 hover:text-gray-900 hover:underline">← กลับหน้าหลัก</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminApprovePage;
