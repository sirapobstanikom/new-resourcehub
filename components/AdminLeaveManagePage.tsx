import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const ADMIN_LEAVE_MANAGER_EMAILS = ['pink@minddojo.me', 'koy@minddojo.me', 'tonji@minddojo.me'];

const LEAVE_TYPES = [
  { id: 'personal', label: 'ลากิจ' },
  { id: 'sick', label: 'ลาป่วย' },
  { id: 'wfh', label: 'Work from Home' },
  { id: 'vacation', label: 'ลาพักร้อน' },
  { id: 'unpaid', label: 'ลาไม่รับเงินเดือน' },
] as const;

type LeaveRequestRow = {
  id: string;
  user_email: string;
  user_display_name: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  status: string;
  created_at: string;
};

/** นับวันทำงาน (ไม่รวมเสาร์-อาทิตย์) ระหว่าง start–end (inclusive) */
function countWeekdays(startIso: string, endIso: string): number {
  const start = new Date(startIso + 'T12:00:00Z').getTime();
  const end = new Date(endIso + 'T12:00:00Z').getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  let count = 0;
  for (let t = start; t <= end; t += oneDay) {
    const d = new Date(t);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

/** คำนวณชั่วโมงจาก HH:mm หรือ HH:mm:ss */
function hoursBetween(startTime: string | null | undefined, endTime: string | null | undefined): number {
  if (!startTime || !endTime) return 0;
  const parse = (t: string) => {
    const parts = String(t).trim().split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] ? parseInt(parts[1], 10) : 0;
    return (Number.isNaN(h) ? 0 : h) + (Number.isNaN(m) ? 0 : m) / 60;
  };
  const start = parse(startTime);
  const end = parse(endTime);
  if (end <= start) return 0;
  return Math.round((end - start) * 100) / 100;
}

/** คืนค่า { days, hours } ที่ใช้ไปของใบลานี้ (สำหรับเอากลับเข้า balance) */
function getLeaveDaysAndHours(row: LeaveRequestRow): { days: number; hours: number } {
  const { start_date, end_date, start_time, end_time } = row;
  if (start_date === end_date && start_time && end_time) {
    const h = hoursBetween(start_time, end_time);
    return { days: 0, hours: h };
  }
  const days = countWeekdays(start_date, end_date);
  return { days, hours: 0 };
}

function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'short' });
}

const AdminLeaveManagePage: React.FC = () => {
  const { user } = useAuth();
  const [pendingList, setPendingList] = useState<LeaveRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.email != null && ADMIN_LEAVE_MANAGER_EMAILS.includes(user.email);

  useEffect(() => {
    if (!isSupabaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    supabase
      .from('leave_requests')
      .select('id, user_email, user_display_name, leave_type, start_date, end_date, start_time, end_time, reason, status, created_at')
      .in('status', ['pending', 'cancel_requested'])
      .order('created_at', { ascending: true })
      .then(({ data, error: err }) => {
        setLoading(false);
        if (err) {
          setError(err.message);
          return;
        }
        setPendingList((data as LeaveRequestRow[]) ?? []);
      });
  }, [isAdmin, actionId]);

  const handleStatus = async (
    row: LeaveRequestRow,
    action: 'approve' | 'reject'
  ) => {
    setError(null);
    setActionId(row.id);
    const isCancelFlow = row.status === 'cancel_requested';
    const nextStatus: 'approved' | 'rejected' | 'cancelled' =
      isCancelFlow
        ? (action === 'approve' ? 'cancelled' : 'approved')
        : (action === 'approve' ? 'approved' : 'rejected');

    const payload: { status: 'approved' | 'rejected' | 'cancelled'; approved_by_email?: string; approved_at?: string } = { status: nextStatus };
    // บันทึกผู้อนุมัติเฉพาะตอน "อนุมัติคำขอลา" (ไม่เขียนทับตอนอนุมัติยกเลิก)
    if (!isCancelFlow && action === 'approve' && user?.email) {
      payload.approved_by_email = user.email;
      payload.approved_at = new Date().toISOString();
    }
    const { data, error: err } = await supabase
      .from('leave_requests')
      .update(payload)
      .eq('id', row.id)
      .select('id');
    setActionId(null);
    if (err) {
      setError(err.message || 'ไม่สามารถอัปเดตได้ กรุณาตรวจสอบว่าเข้าสู่ระบบด้วยอีเมลผู้จัดการลา (pink/koy/tonji@minddojo.me) และมี policy อัปเดต leave_requests ใน Supabase');
      return;
    }
    if (!data || data.length === 0) {
      setError('อัปเดตไม่สำเร็จ (ไม่มีสิทธิ์หรือไม่พบแถว) — ตรวจสอบว่าเข้าสู่ระบบด้วยอีเมลผู้จัดการลา (pink/koy/tonji@minddojo.me) และรัน policy ใน Supabase แล้ว');
      return;
    }

    // อนุมัติยกเลิก: คืนวันลา/ชั่วโมงกลับเข้า admin_users (เฉพาะประเภทที่มี balance)
    if (isCancelFlow && action === 'approve' && row.leave_type !== 'wfh') {
      const { days, hours } = getLeaveDaysAndHours(row);
      if (days > 0 || hours > 0) {
        const { data: userRow, error: userErr } = await supabase
          .from('admin_users')
          .select('personal_remaining, sick_remaining, annual_remaining, unpaid_remaining, hours_personal_remaining, hours_sick_remaining, hours_annual_remaining, hours_unpaid_remaining')
          .eq('email', row.user_email)
          .maybeSingle();
        if (!userErr && userRow) {
          const u = userRow as Record<string, number | null | undefined>;
          const dayKey = row.leave_type === 'personal' ? 'personal_remaining' : row.leave_type === 'sick' ? 'sick_remaining' : row.leave_type === 'vacation' ? 'annual_remaining' : 'unpaid_remaining';
          const hourKey = row.leave_type === 'personal' ? 'hours_personal_remaining' : row.leave_type === 'sick' ? 'hours_sick_remaining' : row.leave_type === 'vacation' ? 'hours_annual_remaining' : 'hours_unpaid_remaining';
          const newDays = (Number(u[dayKey] ?? 0) + days);
          const newHours = (Number(u[hourKey] ?? 0) + hours);
          await supabase
            .from('admin_users')
            .update({ [dayKey]: newDays, [hourKey]: newHours })
            .eq('email', row.user_email);
        }
      }
    }

    setPendingList((prev) => prev.filter((r) => r.id !== row.id));
  };

  if (user && !ADMIN_LEAVE_MANAGER_EMAILS.includes(user.email)) {
    return <Navigate to="/admin/leave" replace />;
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-4 sm:px-6 py-4 sm:py-6 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
          <Link to="/admin/leave" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-yellow-400 rounded-lg flex items-center justify-center glow-yellow">
              <span className="text-black font-black text-lg sm:text-xl">M</span>
            </div>
            <span className="text-base sm:text-xl font-bold tracking-tighter">MindDoJo</span>
          </Link>
          <span className="hidden sm:inline text-gray-500">|</span>
          <span className="text-amber-400 font-semibold text-sm sm:text-base truncate">จัดการคำขอลา</span>
        </div>
        <Link
          to="/admin/leave"
          className="min-h-[44px] flex items-center justify-center px-4 py-3 rounded-xl font-medium bg-white/10 text-white hover:bg-white/20 border border-white/10 w-full sm:w-auto text-center"
        >
          กลับหน้าระบบลา
        </Link>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <h2 className="text-xl font-bold text-gray-300">จัดการคำขอลา — อนุมัติ/ไม่อนุมัติ</h2>
        <p className="text-sm text-gray-500">หน้านี้เห็นได้เฉพาะผู้จัดการลา (pink, koy, tonji@minddojo.me)</p>

        {error && (
          <div className="rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="min-h-[200px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-sm">
            กำลังโหลด...
          </div>
        ) : pendingList.length === 0 ? (
          <div className="min-h-[200px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-sm">
            ไม่มีคำขอลาที่รออนุมัติ/รออนุมัติยกเลิก
          </div>
        ) : (
          <>
          <p className="sm:hidden text-xs text-gray-500 mb-2">เลื่อนซ้าย-ขวาเพื่อดูตาราง</p>
          <div className="rounded-xl border border-white/10 overflow-x-auto -mx-1 sm:mx-0">
            <table className="w-full text-left text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">ผู้ลา</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">คำขอ</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">ประเภท</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">วันเริ่ม</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">วันสิ้นสุด</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">เหตุผล</th>
                  <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {pendingList.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-300 text-xs sm:text-sm">
                      {row.user_display_name || row.user_email}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                      <span className={row.status === 'cancel_requested' ? 'text-amber-300' : 'text-amber-400'}>
                        {row.status === 'cancel_requested' ? 'ขอยกเลิก' : 'ขอลา'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-300 text-xs sm:text-sm">
                      {LEAVE_TYPES.find((t) => t.id === row.leave_type)?.label ?? row.leave_type}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-300 text-xs sm:text-sm">{formatThaiDate(row.start_date)}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-300 text-xs sm:text-sm">{formatThaiDate(row.end_date)}</td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-400 text-xs max-w-[160px] truncate" title={row.reason || ''}>
                      {row.reason || '—'}
                    </td>
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleStatus(row, 'approve')}
                          disabled={actionId === row.id}
                          className="min-h-[40px] min-w-[72px] px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 disabled:opacity-50 touch-manipulation"
                        >
                          {row.status === 'cancel_requested' ? 'อนุมัติยกเลิก' : 'อนุมัติ'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatus(row, 'reject')}
                          disabled={actionId === row.id}
                          className="min-h-[40px] min-w-[72px] px-3 py-2 rounded-lg text-xs font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 disabled:opacity-50 touch-manipulation"
                        >
                          {row.status === 'cancel_requested' ? 'ไม่อนุมัติยกเลิก' : 'ไม่อนุมัติ'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminLeaveManagePage;
