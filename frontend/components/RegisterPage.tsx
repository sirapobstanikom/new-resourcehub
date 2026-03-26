import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && user) navigate('/resourcehub', { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'รหัสผ่านกับยืนยันรหัสผ่านไม่ตรงกัน' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
      return;
    }

    setLoading(true);
    const result = await signUp(email.trim(), password);
    setLoading(false);

    if (result.ok) {
      // แจ้งอีเมลไปที่ phet@minddojo.me เมื่อมีผู้สมัครใหม่ (ใช้ Edge Function)
      if (isSupabaseConfigured && result.user?.email) {
        supabase.functions
          .invoke('notify-admin-signup', { body: { email: result.user.email } })
          .catch(() => {});
      }
      if (result.needsConfirm) {
        setMessage({
          type: 'success',
          text: 'สมัครสำเร็จ ระบบได้แจ้งไปที่แอดมินแล้ว กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี (ถ้าเปิดใช้) จากนั้นเข้าสู่ระบบได้',
        });
      } else {
        setMessage({
          type: 'success',
          text: 'สมัครสมาชิกสำเร็จ ระบบได้แจ้งไปที่แอดมิน (phet@minddojo.me) เพื่อยืนยันแล้ว',
        });
        setTimeout(() => navigate('/resourcehub', { replace: true }), 600);
      }
    } else {
      setMessage({ type: 'error', text: result.error });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-transparent text-white bg-grid flex items-center justify-center p-6">
        <div className="text-gray-400">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white bg-grid flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-neutral-900/80 border border-white/10 rounded-[32px] p-10 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 bg-yellow-400 rounded-xl flex items-center justify-center glow-yellow mb-4">
              <span className="text-black font-semibold text-2xl">M</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              สมัครสมาชิก <span className="text-yellow-400">MindDoJo</span>
            </h1>
            <p className="text-gray-500 text-sm mt-2">สร้างบัญชีเพื่อเข้า ResourceHub</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="reg-email" className="block text-sm font-medium text-gray-400 mb-2">
                อีเมล
              </label>
              <input
                id="reg-email"
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
              <label htmlFor="reg-password" className="block text-sm font-medium text-gray-400 mb-2">
                รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)
              </label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all"
              />
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block text-sm font-medium text-gray-400 mb-2">
                ยืนยันรหัสผ่าน
              </label>
              <input
                id="reg-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all"
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl text-sm ${
                  message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'กำลังดำเนินการ...' : 'สมัครสมาชิก'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            มีบัญชีอยู่แล้ว?{' '}
            <Link to="/login" className="text-yellow-400 hover:underline font-medium">
              เข้าสู่ระบบ
            </Link>
          </p>
          <p className="text-center text-gray-500 text-sm mt-2">
            <Link to="/" className="text-gray-400 hover:underline">← กลับหน้าหลัก</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
