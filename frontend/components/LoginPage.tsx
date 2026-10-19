import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { isAuthenticated, setAuthenticated, validateResourceHubCredentials } from '../lib/auth';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated()) navigate('/resourcehub', { replace: true });
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    if (validateResourceHubCredentials(username.trim(), password)) {
      setAuthenticated(username.trim());
      setMessage({ type: 'success', text: 'เข้าสู่ระบบสำเร็จ' });
      setTimeout(() => navigate('/resourcehub', { replace: true }), 400);
    } else {
      setMessage({ type: 'error', text: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
    setLoading(false);
  };

  return (
    <div className="md-page items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="md-card rounded-[32px] p-10 shadow-md">
          <div className="mb-10 flex flex-col items-center">
            <BrandLogo className="mb-5 text-[34px]" tone="dark" />
            <h1 className="text-center text-2xl font-semibold tracking-tight text-gray-900">
              Minddojo <span className="text-yellow-500">Resourcehub</span>
            </h1>
            <p className="mt-2 text-sm text-gray-500">เข้าสู่ระบบเพื่อใช้งาน</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="mb-2 block text-sm font-medium text-gray-600">
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
                className="md-input"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-600">
                รหัสผ่าน
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="md-input"
              />
            </div>
            {message && (
              <div
                className={`rounded-xl p-3 text-sm ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}
              >
                {message.text}
              </div>
            )}
            <button type="submit" disabled={loading} className="md-btn-primary w-full !rounded-xl disabled:opacity-60">
              {loading ? 'กำลังดำเนินการ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            <Link to="/" className="text-gray-600 hover:underline">
              ← กลับหน้าหลัก
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
