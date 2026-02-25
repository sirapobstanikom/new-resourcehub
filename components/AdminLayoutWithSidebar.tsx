import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { logoutAdmin } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';

const AdminLayoutWithSidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isLeave = location.pathname === '/admin/leave';

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? user?.email ?? 'Admin';
  const leaveBalance = 15; // วันลาคงเหลือ - ใช้จาก DB ได้ภายหลัง
  const age = 26;
  const gender = 'ชาย';

  return (
    <div className="min-h-screen bg-black text-white bg-grid flex selection:bg-yellow-400 selection:text-black">
      <aside className="w-64 shrink-0 border-r border-white/10 bg-black/80 flex flex-col py-6 px-4">
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
      </aside>
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayoutWithSidebar;
