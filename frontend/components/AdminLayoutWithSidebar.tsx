import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { logoutAdmin, getAdminAuthenticatedEmail } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import {
  EMPLOYEE_DEPT_IDS,
  EMPLOYEE_DEPT_LABELS,
  EMPLOYEES,
  type EmployeeDeptId,
} from '../lib/employeeDirectory';

const ADMIN_LEAVE_MANAGER_EMAILS = ['pink@minddojo.me', 'koy@minddojo.me', 'tonji@minddojo.me'];
const DEPRECATED_ADMIN_EMAIL = 'admin@minddojo.me';

function formatDayValue(days: number | null | undefined): string {
  const v = Number(days ?? 0);
  if (Number.isNaN(v)) return '0 วัน';
  return `${Number.isInteger(v) ? v : v.toFixed(1)} วัน`;
}

const AdminLayoutWithSidebar: React.FC = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.email?.toLowerCase() === DEPRECATED_ADMIN_EMAIL.toLowerCase()) {
      logoutAdmin();
      signOut().then(() => navigate('/admin/login', { replace: true }));
    }
  }, [user?.email, signOut, navigate]);
  const isLeave = location.pathname === '/admin/leave';
  const isLeaveManage = location.pathname === '/admin/leave/manage';
  const isAdminLeavePage = isLeave;
  const isStickycloud = location.pathname === '/admin/rooms';
  const isMinddojoUsers = location.pathname === '/admin/minddojo-users';
  const isInnoClubSecondVote = location.pathname === '/admin/innoclub-2-vote';
  const isInnovationEvaluatees = location.pathname === '/admin/innovation-evaluatees';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const showLeaveManageLink = user?.email != null && ADMIN_LEAVE_MANAGER_EMAILS.includes(user.email);
  type AdminUserRow = {
    username?: string | null;
    full_name: string | null;
    phone: string | null;
    department: string | null;
    leave_days_remaining: number;
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
  const [employeesOpen, setEmployeesOpen] = useState(false);
  const [employeeDeptOpen, setEmployeeDeptOpen] = useState<Record<EmployeeDeptId, boolean>>(() => ({
    it: false,
    trainer: false,
    ceo: false,
    sales: false,
    production: false,
    admin: false,
  }));

  const persistedAdminEmail = getAdminAuthenticatedEmail();
  const displayName =
    adminUser?.full_name?.trim() ||
    adminUser?.username?.trim() ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    persistedAdminEmail?.split('@')[0] ||
    persistedAdminEmail ||
    'Admin';

  const defaultAdminUser: AdminUserRow = {
    username: null,
    full_name: null,
    phone: null,
    department: null,
    leave_days_remaining: 10,
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
    const normalizedEmail = user.email.trim().toLowerCase();
    const { data: sessionData } = await supabase.auth.getSession();
    log('current Supabase session', { hasSession: !!sessionData?.session, email: sessionData?.session?.user?.email });
    log('querying admin_users for email', normalizedEmail);
    const queryAdminUser = async () =>
      await supabase
        .from('admin_users')
        .select('username, full_name, phone, department, leave_days_remaining, personal_remaining, sick_remaining, annual_remaining, unpaid_remaining')
        .ilike('email', normalizedEmail)
        .maybeSingle();
    let { data, error } = await queryAdminUser();
    if (error && /jwt|token|session|auth/i.test(error.message || '')) {
      log('retry after refreshSession due auth-ish error', error.message);
      await supabase.auth.refreshSession();
      const retry = await queryAdminUser();
      data = retry.data;
      error = retry.error;
    }

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
        username: d.username ?? null,
        phone: d.phone ?? null,
        department: d.department ?? null,
        leave_days_remaining: d.leave_days_remaining ?? 10,
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

  // ล็อก scroll หลังเมื่อเปิด sidebar บนมือถือ
  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [sidebarOpen]);

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
          <p>
            <span className="text-gray-500">ลากิจ / พักร้อน (รวม)</span>{' '}
            <span className="text-yellow-400 font-medium">
              {adminUser?.leave_days_remaining ?? 10} วัน
            </span>
          </p>
          <p><span className="text-gray-500">ลาคงเหลือ (ลาป่วย)</span> <span className="text-yellow-400 font-medium">{formatDayValue(adminUser?.sick_remaining ?? 30)}</span></p>
          <p><span className="text-gray-500">ลาคงเหลือ (ลาไม่รับเงิน)</span> <span className="text-yellow-400 font-medium">{formatDayValue(adminUser?.unpaid_remaining ?? 0)}</span></p>
          <p><span className="text-gray-500">Work from Home เดือนนี้</span>{' '}
            <span className={wfhUsedThisMonth ? 'text-amber-400' : 'text-emerald-400'}>
              {wfhUsedThisMonth ? 'ใช้แล้ว (ลาอีกได้เดือนถัดไป)' : 'ยังใช้ได้'}
            </span>
          </p>

          <div className="rounded-lg border border-white/10 bg-black/25 overflow-hidden">
            <button
              type="button"
              onClick={() => setEmployeesOpen((o) => !o)}
              className="w-full flex items-center justify-between px-2.5 py-2 text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-gray-200 truncate text-xs">รายชื่อพนักงาน</span>
                <span className="text-[11px] text-gray-500 whitespace-nowrap">({EMPLOYEES.length} คน)</span>
              </div>
              <svg
                className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${employeesOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {employeesOpen && (
              <div className="px-2 pb-2 pt-0 border-t border-white/10 max-h-[min(50vh,20rem)] overflow-y-auto">
                <p className="text-[11px] text-gray-500 mt-2 mb-2">อ้างอิงสำหรับยื่นคำขอลา (ชื่อ-เบอร์โทร)</p>
                <div className="space-y-1.5">
                  {EMPLOYEE_DEPT_IDS.map((deptId) => {
                    const deptEmployees = EMPLOYEES.filter((e) => e.dept === deptId);
                    const isOpen = employeeDeptOpen[deptId];
                    return (
                      <div key={deptId} className="rounded-md border border-white/10 bg-black/20 overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setEmployeeDeptOpen((prev) => ({
                              ...prev,
                              [deptId]: !prev[deptId],
                            }))
                          }
                          className="w-full flex items-center justify-between px-2 py-1.5 text-left hover:bg-white/5 transition-colors"
                        >
                          <span className="text-[11px] font-bold text-gray-200 truncate">
                            {EMPLOYEE_DEPT_LABELS[deptId]}
                          </span>
                          <span className="text-[10px] text-gray-500">({deptEmployees.length})</span>
                        </button>
                        {isOpen && (
                          <div className="px-1.5 pb-1.5 max-h-36 overflow-y-auto">
                            {deptEmployees.length === 0 ? (
                              <div className="text-[11px] text-gray-500 px-1 py-1">ยังไม่มีข้อมูล</div>
                            ) : (
                              <div className="space-y-1">
                                {deptEmployees.map((e) => (
                                  <div
                                    key={e.name}
                                    className="flex flex-col gap-0.5 rounded bg-black/30 border border-white/5 px-2 py-1"
                                  >
                                    <span className="text-[11px] text-gray-200 font-medium leading-snug">{e.name}</span>
                                    <span className="text-[10px] text-gray-400 font-mono break-all">{e.phone}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        {adminUserError && (
          <div className="text-xs text-amber-400/90 bg-amber-500/10 rounded-lg p-2 space-y-1">
            <p>โหลด admin_users ไม่ได้: {adminUserError}</p>
            <p className="text-gray-500 mt-1">ให้เปิด Supabase → SQL Editor แล้วรันไฟล์ `backend/supabase/fix_admin_users_leave_manager_policy.sql`</p>
          </div>
        )}
        {adminUserNoRow && !adminUserError && (
          <div className="text-xs text-amber-400/90 bg-amber-500/10 rounded-lg p-2 space-y-1">
            <p>ไม่พบแถวใน admin_users สำหรับอีเมลนี้ (แสดงค่าเริ่มต้น)</p>
            <p className="text-gray-500 mt-1">1) รัน Supabase → SQL Editor ไฟล์ `backend/supabase/fix_admin_users_leave_manager_policy.sql`</p>
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
          className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${!isLeave && !isStickycloud && !isMinddojoUsers && !isInnoClubSecondVote ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
          ดูข้อมูล Database
        </Link>
        <Link
          to="/admin/minddojo-users"
          className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${isMinddojoUsers ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
          อนุมัติผู้ใช้ Assessment
        </Link>
        <Link
          to="/admin/rooms"
          className={`block py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${isStickycloud ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
        >
          Workshop Board MindDoJo
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
        <details className="group rounded-lg">
          <summary className="list-none cursor-pointer py-2.5 px-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors flex items-center justify-between">
            <span>All Eva</span>
            <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="mt-1 ml-2 space-y-1 border-l border-white/10 pl-2">
            <a
              href="/evaluation/innoclub"
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2 px-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              แบบประเมิน InnoClub
            </a>
            <a
              href="/evaluation/innoclub-2"
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2 px-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              แบบประเมิน InnoClub ครั้งที่ 2
            </a>
            <Link
              to="/admin/innoclub-2-vote"
              className={`block py-2 px-3 rounded-lg text-sm font-medium transition-colors ${isInnoClubSecondVote ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              Admin โหวต InnoClub ครั้งที่ 2
            </Link>
            <a
              href="/evaluation/innovation"
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2 px-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              แบบประเมิน Innovation
            </a>
            <Link
              to="/admin/innovation-evaluatees"
              className={`block py-2 px-3 rounded-lg text-sm font-medium transition-colors ${isInnovationEvaluatees ? 'bg-yellow-400/20 text-yellow-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
            >
              Admin Innovation — รายชื่อผู้ถูกประเมิน
            </Link>
            <a
              href="/evaluation/innovation/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2 px-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              Dashboard Innovation
            </a>
            <a
              href="/evaluation/eva-editor"
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2 px-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              Eva editor
            </a>
          </div>
        </details>
        <details className="group rounded-lg">
          <summary className="list-none cursor-pointer py-2.5 px-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors flex items-center justify-between">
            <span>Hogwarts Game</span>
            <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="mt-1 ml-2 space-y-1 border-l border-white/10 pl-2">
            <a
              href="/evaluation/innoclub-hogwarts"
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2 px-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              Admin Hogwarts
            </a>
            <a
              href="/evaluation/innoclub-hogwarts-guest"
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2 px-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              Guest Hogwarts
            </a>
          </div>
        </details>
        <a
          href="/course-wheel"
          target="_blank"
          rel="noopener noreferrer"
          className="block py-2.5 px-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          วงล้อหลักสูตร
        </a>
        <a
          href="/peer-feedback"
          target="_blank"
          rel="noopener noreferrer"
          className="block py-2.5 px-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          Peer Feedback — Audience Grid
        </a>
        <a
          href="/elevate-answer-key"
          target="_blank"
          rel="noopener noreferrer"
          className="block py-2.5 px-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          ELEVATE · ANSWER KEY
        </a>
      </nav>

      <button
        type="button"
        onClick={async () => {
          logoutAdmin();
          await supabase.auth.signOut();
          window.location.href = '/admin/login';
        }}
        className={`mt-auto py-2.5 px-3 rounded-lg text-sm font-medium text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-colors ${isAdminLeavePage ? 'md:hidden' : ''}`}
      >
        ออกจากระบบ
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-transparent text-white bg-grid flex selection:bg-yellow-400 selection:text-black">
      {/* Mobile: hamburger (touch-friendly 44px) + overlay */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed z-40 rounded-xl bg-white/10 text-white hover:bg-white/20 active:bg-white/25 border border-white/10 flex items-center justify-center min-w-[44px] min-h-[44px] touch-manipulation"
        style={{ top: 'max(env(safe-area-inset-top), 0.5rem)', left: 'max(env(safe-area-inset-left), 0.5rem)' }}
        aria-label="เปิดเมนู"
      >
        <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {sidebarOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/80 z-40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-72 max-w-[min(85vw,320px)] z-50 shrink-0 border-r border-white/10 bg-black/95 backdrop-blur flex flex-col shadow-xl overflow-hidden" style={{ paddingTop: 'max(env(safe-area-inset-top), 1rem)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex justify-end mb-2 px-4 shrink-0">
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-white/10 active:bg-white/15 -m-2"
                aria-label="ปิดเมนู"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-6 flex flex-col min-h-0">
              {sidebarContent}
            </div>
          </aside>
        </>
      )}

      {/* Desktop: sidebar ตลอด */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-white/10 bg-black/80 flex-col py-6 px-4">
        {sidebarContent}
      </aside>
      <div className="flex-1 min-w-0 pt-14 md:pt-0 md:pl-0 pl-[max(4rem,calc(1rem+env(safe-area-inset-left)))]">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayoutWithSidebar;
