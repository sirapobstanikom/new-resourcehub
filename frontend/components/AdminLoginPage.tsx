import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { isAdminAuthenticated, setAdminAuthenticated, setAdminAuthenticatedEmail, logoutAdmin } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const DEPRECATED_ADMIN_EMAIL = 'admin@minddojo.me';

const mapSupabaseAuthError = (rawMessage: string) => {
  const message = (rawMessage || '').toLowerCase();
  if (message.includes('invalid login credentials')) {
    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
  }
  if (message.includes('email not confirmed')) {
    return 'บัญชียังไม่ยืนยันอีเมล กรุณาตรวจสอบกล่องอีเมลก่อนเข้าสู่ระบบ';
  }
  if (message.includes('too many requests') || message.includes('rate limit')) {
    return 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
  }
  if (message.includes('signup is disabled')) {
    return 'โปรเจกต์ Supabase ปิดการสมัครสมาชิกอยู่ กรุณาติดต่อผู้ดูแลระบบ';
  }
  return rawMessage || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่';
};

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user?.email?.toLowerCase() === DEPRECATED_ADMIN_EMAIL.toLowerCase()) {
      logoutAdmin();
      signOut();
      return;
    }
    if (isAdminAuthenticated()) navigate('/admin', { replace: true });
  }, [user?.email, signOut, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!isSupabaseConfigured) {
      setMessage({ type: 'error', text: 'ยังไม่ได้ตั้งค่า Supabase' });
      return;
    }
    setLoading(true);
    const cleanEmail = email.trim();
    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    setLoading(false);
    if (error) {
      setMessage({ type: 'error', text: mapSupabaseAuthError(error.message) });
      return;
    }
    setAdminAuthenticated();
    setAdminAuthenticatedEmail(cleanEmail);
    setMessage({ type: 'success', text: 'เข้าสู่ระบบ Admin สำเร็จ' });
    setTimeout(() => navigate('/admin', { replace: true }), 400);
  };

  return (
    <div className="md-page items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="md-card rounded-[32px] p-10 shadow-md">
          <div className="flex flex-col items-center mb-10">
            <BrandLogo className="mb-5 text-[34px]" tone="dark" />
            <h1 className="text-2xl font-semibold tracking-tight text-center text-gray-900">
              Login Admin <span className="text-[#9A7200]">MindDojo</span>
            </h1>
            <p className="mt-2 text-sm text-gray-600">ใช้บัญชีใน Supabase Authentication เพื่อเข้าสู่ระบบ</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-gray-600 mb-2">อีเมล</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl md-input"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-600 mb-2">รหัสผ่าน</label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-24 rounded-xl md-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showPassword ? 'ซ่อน' : 'แสดง'}
                </button>
              </div>
            </div>
            {message && (
              <div className={`p-3 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.text}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="md-btn-primary w-full !rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'กำลังดำเนินการ...' : 'เข้าสู่ระบบ Admin'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            <Link to="/" className="font-medium text-gray-700 hover:underline">← กลับหน้าหลัก</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
