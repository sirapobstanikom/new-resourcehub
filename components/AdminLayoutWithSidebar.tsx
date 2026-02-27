import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { logoutAdmin } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';

const ADMIN_LEAVE_MANAGER_EMAIL = 'admin@minddojo.me';

const AdminLayoutWithSidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isLeave = location.pathname === '/admin/leave';
  const isLeaveManage = location.pathname === '/admin/leave/manage';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const showLeaveManageLink = user?.email === ADMIN_LEAVE_MANAGER_EMAIL;
  type AdminUserRow = {
    full_name: string | null;
    phone: string | null;
    department: string | null;
    personal_remaining: number;
    sick_remaining: number;
    annual_remaining: number;
    unpaid_remaining: number;
  };
  const [adminUser, setAdminUser] = useState<AdminUserRow | null>(null);
  const [adminUserError, setAdminUserError] = useState<string | null>(null);
  const [adminUserNoRow, setAdminUserNoRow] = useState(false);
  const [adminUserLoaded, setAdminUserLoaded] = useState(false);
  const [wfhUsedThisMonth, setWfhUsedThisMonth] = useState<boolean>(false);

  const displayName = adminUser?.full_name?.trim() || user?.user_metadata?.full_name || user?.email?.split('@')[0] || user?.email || 'Admin';

  const defaultAdminUser: AdminUserRow = {
    full_name: null,
    phone: null,
    department: null,
    personal_remaining: 15,
    sick_remaining: 30,
    annual_remaining: 6,
    unpaid_remaining: 0,
  };

  const fetchAdminUser = React.useCallback(async () => {
    const log = (msg: string, obj?: unknown) => console.log('[AdminSidebar]', msg, obj ?? '');
    log('fetchAdminUser called', { userEmail: user?.email, isSupabaseConfigured, hasUser: !!user });

    if (!isSupabaseConfigured || !user?.email) {
      log('skip fetch: no supabase or no user email');
      setAdminUserError(null);
      setAdminUser(null);
      setAdminUserNoRow(false);
      setAdminUserLoaded(false);
      return;
    }
    setAdminUserError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    log('current Supabase session', { hasSession: !!sessionData?.session, email: sessionData?.session?.user?.email });
    log('querying admin_users for email', user.email);
    const { data, error } = await supabase
      .from('admin_users')
      .select('full_name, phone, department, personal_remaining, sick_remaining, unpaid_remaining')
      .eq('email', user.email)
      .maybeSingle();

    log('admin_users response', { rawData: data, rawError: error, errorMessage: error?.message });

    setAdminUserLoaded(true);
    if (error) {
      log('admin_users error', error.message);
      setAdminUserError(error.message);
      setAdminUserNoRow(false);
      setAdminUser({ ...defaultAdminUser });
      return;
    }
    if (data) {
      const d = data as AdminUserRow;
      const payload = {
        full_name: d.full_name ?? null,
        phone: d.phone ?? null,
        department: d.department ?? null,
        personal_remaining: d.personal_remaining ?? 15,
        sick_remaining: d.sick_remaining ?? 30,
        annual_remaining: d.annual_remaining ?? 6,
        unpaid_remaining: d.unpaid_remaining ?? 0,
      };
      log('admin_users OK, setting state', payload);
      setAdminUserNoRow(false);
      setAdminUser(payload);
    } else {
      log('admin_users no row (data null), using defaults');
      setAdminUserError(null);
      setAdminUserNoRow(true);
      setAdminUser({ ...defaultAdminUser });
    }
  }, [user?.email]);

  // ดึงข้อมูล admin_users ตอนโหลดและเมื่อเปลี่ยนหน้าในแอดมิน
  useEffect(() => {
    fetchAdminUser();
  }, [fetchAdminUser, location.pathname]);

  // เมื่อกลับมาเปิดแท็บ (เช่น แก้ใน Supabase แล้วกลับมา) ให้ดึงค่าใหม่
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !user?.id || !isSupabaseConfigured) return;
      fetchAdminUser();
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      supabase
        .from('leave_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('leave_type', 'wfh')
        .eq('status', 'approved')
        .gte('end_date', monthStart)
        .lte('start_date', monthEnd)
        .then(({ data }) => setWfhUsedThisMonth((data?.length ?? 0) > 0));
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [fetchAdminUser, user?.id]);

  // ปิด drawer เมื่อเปลี่ยน route (มือถือ)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // WFH เดือนนี้ใช้แล้วหรือยัง (1 วัน/เดือน)
  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    supabase
      .from('leave_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('leave_type', 'wfh')
      .eq('status', 'approved')
      .gte('end_date', monthStart)
      .lte('start_date', monthEnd)
      .then(({ data }) => setWfhUsedThisMonth((data?.length ?? 0) > 0));
  }, [user?.id]);

  const sidebarContent = (
    <>
      <div className="flex flex-col gap-4 pb-6 border-b border-white/10">
        <div className="w-16 h-16 rounded-full bg-yellow-400/20 border-2 border-yellow-400/50 flex items-center justify-center text-2xl font-bold text-yellow-400 mx-auto">
          {(adminUser?.full_name?.trim() || displayName).charAt(0).toUpperCase()}
        </div>
        <div className="text-center space-y-1">
          <p className="font-semibold text-white truncate text-sm" title={displayName}>
            {displayName}
          </p>
          <p className="text-xs text-gray-500">ชื่อ · นามสกุล</p>
        </div>
        <div className="text-sm text-gray-400 space-y-1.5">
          {adminUser?.phone != null && adminUser.phone !== '' && (
            <p><span className="text-gray-500">โทร</span> <span className="text-white/90">{adminUser.phone}</span></p>
          )}
          {adminUser?.department != null && adminUser.department !== '' && (
            <p><span className="text-gray-500">แผนก</span> <span className="text-white/90">{adminUser.department}</span></p>
          )}
          <p><span className="text-gray-500">วันลาคงเหลือ (ลากิจ)</span> <span className="text-yellow-400 font-medium">{adminUser?.personal_remaining ?? 15} วัน</span></p>
          <p><span className="text-gray-500">วันลาคงเหลือ (ลาป่วย)</span> <span className="text-yellow-400 font-medium">{adminUser?.sick_remaining ?? 30} วัน</span></p>
          <p><span className="text-gray-500">วันลาคงเหลือ (ลาพักร้อน)</span> <span className="text-yellow-400 font-medium">{adminUser?.annual_remaining ?? 6} วัน</span></p>
          <p><span className="text-gray-500">วันลาคงเหลือ (ลาไม่รับเงิน)</span> <span className="text-yellow-400 font-medium">{adminUser?.unpaid_remaining ?? 0} วัน</span></p>
          <p><span className="text-gray-500">Work from Home เดือนนี้</span>{' '}
            <span className={wfhUsedThisMonth ? 'text-amber-400' : 'text-emerald-400'}>
              {wfhUsedThisMonth ? 'ใช้แล้ว (ลาอีกได้เดือนถัดไป)' : 'ยังใช้ได้'}
            </span>
          </p>
        </div>
        {adminUserError && (
          <div className="text-xs text-amber-400/90 bg-amber-500/10 rounded-lg p-2 space-y-1">
            <p>โหลด admin_users ไม่ได้: {adminUserError}</p>
            <p className="text-gray-500 mt-1">ให้เปิด Supabase → SQL Editor แล้วรันไฟล์ supabase/fix_admin_users_rls.sql</p>
          </div>
        )}
        {adminUserNoRow && !adminUserError && (
          <div className="text-xs text-amber-400/90 bg-amber-500/10 rounded-lg p-2 space-y-1">
            <p>ไม่พบแถวใน admin_users สำหรับอีเมลนี้ (แสดงค่าเริ่มต้น)</p>
            <p className="text-gray-500 mt-1">1) รัน Supabase → SQL Editor ไฟล์ fix_admin_users_rls.sql</p>
            <p className="text-gray-500">2) หรือเพิ่มแถวในตาราง admin_users ให้ email ตรงกับที่ล็อกอิน</p>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500">ข้อมูลจาก admin_users</span>
          {user?.email && (
            <button
              type="button"
              onClick={() => fetchAdminUser()}
              className="text-xs text-yellow-400 hover:text-yellow-300 underline"
            >
              โหลดใหม่
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 pt-4 space-y-1">
        <Link
          to="/admin"
          className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${!isLeave ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
          ดูข้อมูล Database
        </Link>
        <Link
          to="/admin/leave"
          className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${isLeave && !isLeaveManage ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
          ระบบลา MindDojo
        </Link>
        {showLeaveManageLink && (
          <Link
            to="/admin/leave/manage"
            className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${isLeaveManage ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            จัดการคำขอลา
          </Link>
        )}
        <a
          href="/evaluation/innoclub"
          target="_blank"
          rel="noopener noreferrer"
          className="block py-2.5 px-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          แบบประเมิน INNO Club
        </a>
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
