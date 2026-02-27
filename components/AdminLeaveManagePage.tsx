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
  reason: string | null;
  status: string;
  created_at: string;
};

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
      .select('id, user_email, user_display_name, leave_type, start_date, end_date, reason, status, created_at')
      .eq('status', 'pending')
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

  const handleStatus = async (id: string, status: 'approved' | 'rejected') => {
    setError(null);
    setActionId(id);
    const payload: { status: 'approved' | 'rejected'; approved_by_email?: string; approved_at?: string } = { status };
    if (status === 'approved' && user?.email) {
      payload.approved_by_email = user.email;
      payload.approved_at = new Date().toISOString();
    }
    const { data, error: err } = await supabase
      .from('leave_requests')
      .update(payload)
      .eq('id', id)
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
    setPendingList((prev) => prev.filter((r) => r.id !== id));
  };

  if (user && !ADMIN_LEAVE_MANAGER_EMAILS.includes(user.email)) {
    return <Navigate to="/admin/leave" replace />;
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-4 sm:px-6 py-4 sm:py-6 border-b border-white/10 pl-14 sm:pl-6">
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
          className="px-4 py-2 rounded-xl font-medium bg-white/10 text-white hover:bg-white/20 border border-white/10 w-full sm:w-auto text-center"
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
            ไม่มีคำขอลาที่รออนุมัติ
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">ผู้ลา</th>
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
                          onClick={() => handleStatus(row.id, 'approved')}
                          disabled={actionId === row.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 disabled:opacity-50"
                        >
                          อนุมัติ
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatus(row.id, 'rejected')}
                          disabled={actionId === row.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 disabled:opacity-50"
                        >
                          ไม่อนุมัติ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminLeaveManagePage;
