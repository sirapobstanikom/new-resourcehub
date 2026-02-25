import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isAdminAuthenticated, setAdminAuthenticated, validateAdminCredentials } from '../lib/auth';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type View = 'login' | 'register';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isAdminAuthenticated()) navigate('/admin', { replace: true });
  }, [navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    if (validateAdminCredentials(username, password)) {
      setAdminAuthenticated();
      setMessage({ type: 'success', text: 'เข้าสู่ระบบ Admin สำเร็จ' });
      setTimeout(() => navigate('/admin', { replace: true }), 400);
    } else {
      setMessage({ type: 'error', text: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (regPassword !== regConfirmPassword) {
      setMessage({ type: 'error', text: 'รหัสผ่านกับยืนยันรหัสผ่านไม่ตรงกัน' });
      return;
    }
    if (regPassword.length < 6) {
      setMessage({ type: 'error', text: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
      return;
    }
    setLoading(true);
    if (isSupabaseConfigured) {
      await supabase.functions
        .invoke('notify-admin-signup', {
          body: { email: regEmail.trim(), username: regUsername.trim(), isAdminRequest: true },
        })
        .catch(() => {});
    }
    setMessage({
      type: 'success',
      text: 'ส่งคำขอสมัครแอดมินแล้ว กรุณาติดต่อ phet@minddojo.me เพื่อยืนยัน',
    });
    setLoading(false);
  };

  const isLogin = view === 'login';

  return (
    <div className="min-h-screen bg-black text-white bg-grid flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-neutral-900/80 border border-white/10 rounded-[32px] p-10 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 bg-yellow-400 rounded-xl flex items-center justify-center glow-yellow mb-4">
              <span className="text-black font-black text-2xl">M</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center">
              {isLogin ? (
                <>Login Admin <span className="text-yellow-400">MindDojo</span></>
              ) : (
                <>สมัครสมาชิก Admin <span className="text-yellow-400">MindDojo</span></>
              )}
            </h1>
            <p className="text-gray-500 text-sm mt-2">
              {isLogin ? 'เข้าสู่ระบบเพื่อดูข้อมูล Supabase' : 'ส่งคำขอสมัครเป็นแอดมิน'}
            </p>
          </div>

          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="admin-username" className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                <input
                  id="admin-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="กรอก username"
                  required
                  autoComplete="username"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all"
                />
              </div>
              <div>
                <label htmlFor="admin-password" className="block text-sm font-medium text-gray-400 mb-2">Password</label>
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
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label htmlFor="admin-reg-email" className="block text-sm font-medium text-gray-400 mb-2">อีเมล</label>
                <input
                  id="admin-reg-email"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all"
                />
              </div>
              <div>
                <label htmlFor="admin-reg-username" className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                <input
                  id="admin-reg-username"
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="กรอก username ที่ต้องการ"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all"
                />
              </div>
              <div>
                <label htmlFor="admin-reg-password" className="block text-sm font-medium text-gray-400 mb-2">รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)</label>
                <input
                  id="admin-reg-password"
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all"
                />
              </div>
              <div>
                <label htmlFor="admin-reg-confirm" className="block text-sm font-medium text-gray-400 mb-2">ยืนยันรหัสผ่าน</label>
                <input
                  id="admin-reg-confirm"
                  type="password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
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
                {loading ? 'กำลังดำเนินการ...' : 'สมัครสมาชิก'}
              </button>
            </form>
          )}

          <p className="text-center text-gray-500 text-sm mt-6">
            {isLogin ? (
              <>
                ยังไม่มีบัญชีแอดมิน?{' '}
                <button
                  type="button"
                  onClick={() => { setView('register'); setMessage(null); }}
                  className="text-yellow-400 hover:underline font-medium"
                >
                  สมัครสมาชิก
                </button>
              </>
            ) : (
              <>
                มีบัญชีอยู่แล้ว?{' '}
                <button
                  type="button"
                  onClick={() => { setView('login'); setMessage(null); }}
                  className="text-yellow-400 hover:underline font-medium"
                >
                  เข้าสู่ระบบ
                </button>
              </>
            )}
          </p>
          <p className="text-center text-gray-500 text-sm mt-2">
            <Link to="/" className="text-gray-400 hover:underline">← กลับหน้าหลัก</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
