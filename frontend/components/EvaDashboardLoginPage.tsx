import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  evaDashboardAuthStorageKey,
  loadEvaDashboardStoreAsync,
  type EvaDashboardStore,
  resolveActiveDashboard,
} from '../lib/evaDashboardConfig';

const EvaDashboardLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dashParam = searchParams.get('dash');

  const [dashStore, setDashStore] = useState<EvaDashboardStore | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const instance = useMemo(
    () => (dashStore ? resolveActiveDashboard(dashStore, dashParam) : null),
    [dashStore, dashParam]
  );

  const dashConfig = instance;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadConfig = async () => {
      const loaded = await loadEvaDashboardStoreAsync();
      if (cancelled) return;
      setDashStore(loaded.store);
      setLoadError(loaded.errorMessage);
      setLoadingConfig(false);
    };
    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-transparent text-white bg-grid px-4 py-6 sm:px-6 sm:py-10">
        <div className="max-w-md mx-auto rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-black/30 p-6 text-center">
          <p className="text-sm text-gray-300">กำลังโหลดการตั้งค่า Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!instance || !dashConfig) {
    return (
      <div className="min-h-screen bg-transparent text-white bg-grid px-4 py-6 sm:px-6 sm:py-10">
        <div className="max-w-md mx-auto rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-black/30 p-6 text-center space-y-3">
          <h1 className="text-xl font-bold text-yellow-300">ไม่พบ Dashboard</h1>
          <p className="text-sm text-gray-400">
            ระบุพารามิเตอร์ <span className="font-mono text-gray-300">?dash=id</span> หรือตรวจสอบใน Eva Editor
            ว่ามีการสร้าง dashboard อย่างน้อยหนึ่งรายการ
          </p>
          <a
            href="/evaluation/eva-editor"
            className="inline-block rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300"
          >
            ไปหน้าแก้ไข Dashboard
          </a>
        </div>
      </div>
    );
  }

  const dashQuery = `?dash=${encodeURIComponent(instance.id)}`;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() !== dashConfig.username.trim() || password !== dashConfig.password) {
      setLoginError(dashConfig.loginErrorMessage);
      return;
    }

    sessionStorage.setItem(evaDashboardAuthStorageKey(instance.id), '1');
    setLoginError(null);
    navigate(`/evaluation/dashboard${dashQuery}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-transparent text-white bg-grid px-4 py-6 sm:px-6 sm:py-10">
      <div className="max-w-md mx-auto rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-black/30 p-5 sm:p-8 shadow-2xl shadow-black/30">
        <h1 className="text-2xl sm:text-3xl font-bold text-yellow-300">{dashConfig.loginTitle}</h1>
        <p className="text-gray-300 mt-2 text-sm sm:text-base whitespace-pre-line">{dashConfig.loginSubtitle}</p>
        {dashConfig.loginNote.trim() && (
          <p className="text-xs text-gray-400 mt-1 whitespace-pre-line">{dashConfig.loginNote}</p>
        )}

        <form onSubmit={handleLogin} className="mt-5 space-y-4">
          {loadError && <p className="text-xs text-amber-300 whitespace-pre-wrap">{loadError}</p>}
          <div>
            <label className="text-sm text-gray-300 font-medium">{dashConfig.usernameLabel}</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/20 bg-black/35 px-4 py-3 text-base"
              placeholder="กรอก username"
            />
          </div>
          <div>
            <label className="text-sm text-gray-300 font-medium">{dashConfig.passwordLabel}</label>
            <div className="mt-1 relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-black/35 pl-4 pr-24 py-3 text-base"
                placeholder="กรอก password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className={`absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                  showPassword
                    ? 'border-yellow-300/50 bg-yellow-400/20 text-yellow-100 hover:bg-yellow-400/30'
                    : 'border-white/25 bg-white/10 text-gray-100 hover:bg-white/20'
                }`}
              >
                <span aria-hidden>{showPassword ? '🙈' : '👁️'}</span>
                {showPassword ? 'ซ่อน' : 'แสดง'}
              </button>
            </div>
          </div>
          {loginError && <p className="text-sm text-red-300">{loginError}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-yellow-400 px-4 py-3 text-base font-semibold text-black hover:bg-yellow-300 transition-colors"
          >
            {dashConfig.loginButtonText}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EvaDashboardLoginPage;
