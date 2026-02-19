import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, setAuthenticated, validateCredentials } from '../lib/auth';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated()) navigate('/', { replace: true });
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    if (validateCredentials(username, password)) {
      setAuthenticated();
      setMessage({ type: 'success', text: 'เข้าสู่ระบบสำเร็จ' });
      setTimeout(() => navigate('/', { replace: true }), 400);
    } else {
      setMessage({ type: 'error', text: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white bg-grid flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-neutral-900/80 border border-white/10 rounded-[32px] p-10 shadow-2xl backdrop-blur-sm">
          <div className="flex flex-col items-center mb-10">
            <div className="w-14 h-14 bg-yellow-400 rounded-xl flex items-center justify-center glow-yellow mb-4">
              <span className="text-black font-black text-2xl">M</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-center">
              Minddojo <span className="text-yellow-400">Resourcehub</span>
            </h1>
            <p className="text-gray-500 text-sm mt-2">เข้าสู่ระบบเพื่อใช้งาน</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-400 mb-2">
                Username
              </label>
              <input
                id="username"
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-400 mb-2">
                Password
              </label>
              <input
                id="password"
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
              {loading ? 'กำลังดำเนินการ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
