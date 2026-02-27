import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { logoutAdmin } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';

const AdminLayoutWithSidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isLeave = location.pathname === '/admin/leave';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? user?.email ?? 'Admin';
  const leaveBalance = 15; // วันลาคงเหลือ - ใช้จาก DB ได้ภายหลัง
  const age = 26;
  const gender = 'ชาย';

  // ปิด drawer เมื่อเปลี่ยน route (มือถือ)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const sidebarContent = (
    <>
      <div className="flex flex-col gap-4 pb-6 border-b border-white/10">
        <div className="w-16 h-16 rounded-full bg-yellow-400/20 border-2 border-yellow-400/50 flex items-center justify-center text-2xl font-bold text-yellow-400 mx-auto">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="text-center space-y-1">
          <p className="font-semibold text-white truncate text-sm" title={displayName}>
            {displayName}
          </p>
          <p className="text-xs text-gray-500">ชื่อ · นามสกุล</p>
        </div>
        <div className="text-sm text-gray-400 space-y-1">
          <p><span className="text-gray-500">อายุ</span> {age} ปี</p>
          <p><span className="text-gray-500">เพศ</span> {gender}</p>
          <p><span className="text-gray-500">วันลาคงเหลือ</span> <span className="text-yellow-400 font-medium">{leaveBalance} วัน</span></p>
        </div>
        <span className="text-xs text-gray-500">Admin Profile</span>
      </div>

      <nav className="flex-1 pt-4 space-y-1">
        <Link
          to="/admin"
          className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${!isLeave ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
          ดูข้อมูล Supabase
        </Link>
        <Link
          to="/admin/leave"
          className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${isLeave ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
          ระบบลา MindDojo
        </Link>
      </nav>

      <button
        type="button"
        onClick={async () => {
          logoutAdmin();
          await supabase.auth.signOut();
          window.location.href = '/admin/login';
        }}
        className="mt-auto py-2.5 px-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
      >
        ออกจากระบบ
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-black text-white bg-grid flex selection:bg-yellow-400 selection:text-black">
      {/* Mobile: hamburger + overlay */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/10"
        aria-label="เปิดเมนู"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {sidebarOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/70 z-40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] z-50 shrink-0 border-r border-white/10 bg-black/95 backdrop-blur flex flex-col py-6 px-4 shadow-xl">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                aria-label="ปิดเมนู"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Desktop: sidebar ตลอด */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-white/10 bg-black/80 flex-col py-6 px-4">
        {sidebarContent}
      </aside>
      <div className="flex-1 min-w-0 pt-12 md:pt-0">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayoutWithSidebar;
