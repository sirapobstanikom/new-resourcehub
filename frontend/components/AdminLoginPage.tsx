import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isAdminAuthenticated, setAdminAuthenticated, setAdminAuthenticatedEmail, logoutAdmin } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const DEPRECATED_ADMIN_EMAIL = 'admin@minddojo.me';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    const cleanEmail = email.trim().split('#')[0];
    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    setLoading(false);
    if (error) {
      setMessage({ type: 'error', text: error.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
      return;
    }
    setAdminAuthenticated();
    setAdminAuthenticatedEmail(cleanEmail);
    setMessage({ type: 'success', text: 'เข้าสู่ระบบ Admin สำเร็จ' });
    setTimeout(() => navigate('/admin', { replace: true }), 400);
  };

  return (
    <div className="min-h-screen bg-transparent text-white bg-grid flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-neutral-900/80 border border-white/10 rounded-[32px] p-10 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 bg-yellow-400 rounded-xl flex items-center justify-center glow-yellow mb-4">
              <span className="text-black font-black text-2xl">M</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center">
              Login Admin <span className="text-yellow-400">MindDojo</span>
            </h1>
            <p className="text-gray-500 text-sm mt-2">ใช้บัญชีใน Supabase Authentication เพื่อเข้าสู่ระบบ</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="admin-email" className="block text-sm font-medium text-gray-400 mb-2">อีเมล</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-gray-400 mb-2">รหัสผ่าน</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all"
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
              className="w-full py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'กำลังดำเนินการ...' : 'เข้าสู่ระบบ Admin'}
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

export default AdminLoginPage;
