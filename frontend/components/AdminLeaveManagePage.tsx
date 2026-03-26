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
  cancel_reason?: string | null;
  cancel_decided_by_email?: string | null;
  cancel_decided_at?: string | null;
  cancel_decision?: string | null;
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

/** แปลงจำนวนชั่วโมงเทียบเท่าด้วยระบบ (1 วัน = 8 ชม.) เพื่อแสดงผลเป็น "X วัน Y ชม." */
function formatHoursEquivalent(totalHours: number): string {
  const total = Math.round(Number(totalHours ?? 0) * 100) / 100;
  const days = Math.floor(total / 8);
  const hours = Math.round((total % 8) * 100) / 100;

  if (days > 0 && hours > 0) return `${days} วัน ${hours} ชม.`;
  if (days > 0) return `${days} วัน`;
  if (hours > 0) return `${hours} ชม.`;
  return '0 วัน';
}

const AdminLeaveManagePage: React.FC = () => {
  const { user } = useAuth();
  const [pendingList, setPendingList] = useState<LeaveRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<
    Array<{ at: string; level: 'info' | 'warn' | 'error'; text: string }>
  >([]);

  const [approvedSummaryLoading, setApprovedSummaryLoading] = useState(false);
  const [approvedSummaryError, setApprovedSummaryError] = useState<string | null>(null);
  const [approvedSummaryRows, setApprovedSummaryRows] = useState<
    Array<{
      user_email: string;
      user_display_name: string | null;
      totalsByType: Record<string, number>; // hours-equivalent
    }>
  >([]);
  const [approvedSummaryRefreshKey, setApprovedSummaryRefreshKey] = useState(0);

  const isAdmin = user?.email != null && ADMIN_LEAVE_MANAGER_EMAILS.includes(user.email);

  useEffect(() => {
    if (!isSupabaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    supabase
      .from('leave_requests')
      .select('id, user_email, user_display_name, leave_type, start_date, end_date, start_time, end_time, reason, cancel_reason, cancel_decided_by_email, cancel_decided_at, cancel_decision, status, created_at')
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

  // โหลดสรุปการลา (รายคน แยกตามประเภท) จากใบลา approved เท่านั้น
  useEffect(() => {
    const run = async () => {
      if (!isSupabaseConfigured || !isAdmin) return;

      setApprovedSummaryLoading(true);
      setApprovedSummaryError(null);

      const year = new Date().getFullYear();
      const yearStart = `${year}-01-01`;
      const yearEnd = `${year}-12-31`;

      const { data, error: err } = await supabase
        .from('leave_requests')
        .select('user_email, user_display_name, leave_type, start_date, end_date, start_time, end_time, status')
        .eq('status', 'approved')
        // เผื่อเคสลากยาวข้ามปี: เอาแถวที่ช่วงวันชนปีนั้น
        .lte('start_date', yearEnd)
        .gte('end_date', yearStart)
        .limit(5000);

      setApprovedSummaryLoading(false);
      if (err) {
        setApprovedSummaryError(err.message);
        return;
      }

      const rows = (data ?? []) as Array<Pick<
        LeaveRequestRow,
        'user_email' | 'user_display_name' | 'leave_type' | 'start_date' | 'end_date' | 'start_time' | 'end_time' | 'status'
      >>;

      const map = new Map<string, { user_email: string; user_display_name: string | null; totalsByType: Record<string, number> }>();

      for (const r of rows) {
        const key = r.user_email;
        if (!map.has(key)) {
          map.set(key, { user_email: r.user_email, user_display_name: r.user_display_name ?? null, totalsByType: {} });
        }
        const entry = map.get(key)!;

        // ใช้ logic นับวันทำงาน/ชั่วโมงเดียวกับระบบเดิม
        const daysHours = getLeaveDaysAndHours({
          id: 'na',
          user_email: r.user_email,
          user_display_name: r.user_display_name ?? null,
          leave_type: r.leave_type,
          start_date: r.start_date,
          end_date: r.end_date,
          start_time: r.start_time ?? null,
          end_time: r.end_time ?? null,
          reason: null,
          cancel_reason: null,
          cancel_decided_by_email: null,
          cancel_decided_at: null,
          cancel_decision: null,
          status: r.status,
          created_at: '',
        } as LeaveRequestRow);

        const hoursEquivalent = daysHours.days * 8 + daysHours.hours;
        entry.totalsByType[r.leave_type] = (entry.totalsByType[r.leave_type] ?? 0) + hoursEquivalent;
      }

      // จัดเรียงตามชื่อผู้ใช้ (แล้วแต่ต้องการ)
      const out = Array.from(map.values()).sort((a, b) => (a.user_display_name ?? a.user_email).localeCompare(b.user_display_name ?? b.user_email));
      setApprovedSummaryRows(out);
    };

    run();
  }, [isAdmin, approvedSummaryRefreshKey]);

  const pushDebugLog = (level: 'info' | 'warn' | 'error', label: string, details: Record<string, unknown>) => {
    const text = `${label} ${JSON.stringify(details)}`;
    setDebugLogs((prev) => {
      const next = [...prev, { at: new Date().toISOString(), level, text }];
      // กัน state โตเกินไป
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  };

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

    // Log รายละเอียดการตัดสินใจของแอดมิน
    const requestedLeaveRefund = row.leave_type !== 'wfh' && isCancelFlow && action === 'approve';
    const computed = requestedLeaveRefund ? getLeaveDaysAndHours(row) : { days: 0, hours: 0 };
    console.log('[LeaveAdminDecision] action', {
      leave_request_id: row.id,
      user_email: row.user_email,
      user_display_name: row.user_display_name,
      leave_type: row.leave_type,
      start_date: row.start_date,
      end_date: row.end_date,
      start_time: row.start_time,
      end_time: row.end_time,
      leave_reason: row.reason,
      prev_status: row.status,
      is_cancel_flow: isCancelFlow,
      admin_action: action,
      next_status: nextStatus,
      admin_email: user?.email ?? null,
      at: new Date().toISOString(),
      refund_days: computed.days,
      refund_hours: computed.hours,
    });
    const cancelActionDetails = isCancelFlow
      ? {
          leave_request_id: row.id,
          'ผู้ที่ขอยกเลิก': row.user_email,
          'เหตุผลที่ขอยกเลิก': row.cancel_reason,
          'ผู้อนุมัติ': user?.email ?? null,
          'การตัดสินใจ': action === 'approve' ? 'อนุมัติยกเลิก' : 'ไม่อนุมัติยกเลิก',
          prev_status: row.status,
          next_status: nextStatus,
          leave_type: row.leave_type,
          start_date: row.start_date,
          end_date: row.end_date,
          start_time: row.start_time,
          end_time: row.end_time,
        }
      : {
          leave_request_id: row.id,
          user_email: row.user_email,
          user_display_name: row.user_display_name,
          leave_type: row.leave_type,
          start_date: row.start_date,
          end_date: row.end_date,
          start_time: row.start_time,
          end_time: row.end_time,
          leave_reason: row.reason,
          prev_status: row.status,
          is_cancel_flow: isCancelFlow,
          admin_action: action,
          next_status: nextStatus,
          admin_email: user?.email ?? null,
          refund_days: computed.days,
          refund_hours: computed.hours,
        };

    pushDebugLog(
      'info',
      isCancelFlow ? '[รายการลาที่ขอยกเลิก]' : '[LeaveAdminDecision] action',
      cancelActionDetails
    );

    const payload: {
      status: 'approved' | 'rejected' | 'cancelled';
      approved_by_email?: string;
      approved_at?: string;
      cancel_decided_by_email?: string | null;
      cancel_decided_at?: string | null;
      cancel_decision?: string | null;
    } = { status: nextStatus };
    // บันทึกผู้อนุมัติเฉพาะตอน "อนุมัติคำขอลา" (ไม่เขียนทับตอนอนุมัติยกเลิก)
    if (!isCancelFlow && action === 'approve' && user?.email) {
      payload.approved_by_email = user.email;
      payload.approved_at = new Date().toISOString();
    }
    // เก็บผู้อนุมัติ/ผู้ไม่อนุมัติการยกเลิกลง Supabase
    if (isCancelFlow) {
      payload.cancel_decided_by_email = user?.email ?? null;
      payload.cancel_decided_at = new Date().toISOString();
      payload.cancel_decision = action;
    }
    const { data, error: err } = await supabase
      .from('leave_requests')
      .update(payload)
      .eq('id', row.id)
      .select('id');
    setActionId(null);
    if (err) {
      console.error('[LeaveAdminDecision] update failed', {
        leave_request_id: row.id,
        prev_status: row.status,
        next_status: nextStatus,
        admin_email: user?.email ?? null,
        error: err.message,
      });
      setError(err.message || 'ไม่สามารถอัปเดตได้ กรุณาตรวจสอบว่าเข้าสู่ระบบด้วยอีเมลผู้จัดการลา (pink/koy/tonji@minddojo.me) และมี policy อัปเดต leave_requests ใน Supabase');
      return;
    }
    if (!data || data.length === 0) {
      setError('อัปเดตไม่สำเร็จ (ไม่มีสิทธิ์หรือไม่พบแถว) — ตรวจสอบว่าเข้าสู่ระบบด้วยอีเมลผู้จัดการลา (pink/koy/tonji@minddojo.me) และรัน policy ใน Supabase แล้ว');
      return;
    }

    // อัปเดต audit row ของคำขอยกเลิกที่กำลังรออนุมัติ (เก็บประวัติทุกครั้ง)
    if (isCancelFlow) {
      const auditStatus = action === 'approve' ? 'cancelled' : 'rejected';
      const auditDecision = action === 'approve' ? 'approve' : 'reject';

      const { data: auditRow, error: auditFetchErr } = await supabase
        .from('leave_cancel_audits')
        .select('id')
        .eq('leave_request_id', row.id)
        .eq('status', 'cancel_requested')
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (auditFetchErr) {
        console.warn('[LeaveCancelAudit] fetch failed', { leave_request_id: row.id, error: auditFetchErr.message });
      }

      const auditId = auditRow?.id as string | undefined;
      if (auditId) {
        await supabase
          .from('leave_cancel_audits')
          .update({
            status: auditStatus,
            decided_by_email: user?.email ?? null,
            decided_at: new Date().toISOString(),
            decision: auditDecision,
          })
          .eq('id', auditId);
      } else {
        console.warn('[LeaveCancelAudit] no audit row found to update', { leave_request_id: row.id });
      }
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

          console.log('[LeaveAdminDecision] refund balance', {
            leave_request_id: row.id,
            user_email: row.user_email,
            dayKey,
            hourKey,
            add_days: days,
            add_hours: hours,
            old_days: u[dayKey],
            old_hours: u[hourKey],
            new_days: newDays,
            new_hours: newHours,
            admin_email: user?.email ?? null,
            at: new Date().toISOString(),
          });
          pushDebugLog('info', '[LeaveAdminDecision] refund balance', {
            leave_request_id: row.id,
            user_email: row.user_email,
            dayKey,
            hourKey,
            add_days: days,
            add_hours: hours,
            old_days: u[dayKey],
            old_hours: u[hourKey],
            new_days: newDays,
            new_hours: newHours,
            admin_email: user?.email ?? null,
          });

          await supabase
            .from('admin_users')
            .update({ [dayKey]: newDays, [hourKey]: newHours })
            .eq('email', row.user_email);
        } else {
          console.warn('[LeaveAdminDecision] refund skipped (no admin_users row or userErr)', {
            leave_request_id: row.id,
            user_email: row.user_email,
            userErr: userErr?.message ?? null,
            at: new Date().toISOString(),
          });
          pushDebugLog('warn', '[LeaveAdminDecision] refund skipped', {
            leave_request_id: row.id,
            user_email: row.user_email,
            userErr: userErr?.message ?? null,
          });
        }
      }
    }

    console.log('[LeaveAdminDecision] done', {
      leave_request_id: row.id,
      prev_status: row.status,
      next_status: nextStatus,
      admin_email: user?.email ?? null,
      at: new Date().toISOString(),
    });
    pushDebugLog('info', '[LeaveAdminDecision] done', {
      leave_request_id: row.id,
      prev_status: row.status,
      next_status: nextStatus,
      admin_email: user?.email ?? null,
    });

    setPendingList((prev) => prev.filter((r) => r.id !== row.id));
    setApprovedSummaryRefreshKey((k) => k + 1);
  };

  if (user && !ADMIN_LEAVE_MANAGER_EMAILS.includes(user.email)) {
    return <Navigate to="/admin/leave" replace />;
  }

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-4 sm:px-6 py-4 sm:py-6 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
          <Link to="/admin/leave" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-yellow-400 rounded-lg flex items-center justify-center glow-yellow">
              <span className="text-black font-semibold text-lg sm:text-xl">M</span>
            </div>
            <span className="text-base sm:text-xl font-semibold tracking-tighter">MindDoJo</span>
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
                    <td
                      className="px-3 sm:px-4 py-2 sm:py-3 text-gray-400 text-xs max-w-[160px] truncate"
                      title={(row.status === 'cancel_requested' ? row.cancel_reason : row.reason) || ''}
                    >
                      {(row.status === 'cancel_requested' ? row.cancel_reason : row.reason) || '—'}
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

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
          <h3 className="font-bold text-gray-300 mb-1">สรุปการลา (รายคน)</h3>
          <p className="text-xs text-gray-500 mb-3">นับเฉพาะใบลาที่ `อนุมัติแล้ว` ภายในปีปัจจุบัน แยกตามประเภทการลา</p>

          {approvedSummaryLoading ? (
            <div className="min-h-[80px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-xs">
              กำลังโหลด...
            </div>
          ) : approvedSummaryError ? (
            <div className="min-h-[80px] rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-300 text-xs p-4 text-center">
              {approvedSummaryError}
            </div>
          ) : approvedSummaryRows.length === 0 ? (
            <div className="min-h-[80px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-xs p-4 text-center">
              ยังไม่มีข้อมูลใบลา approved
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-x-auto -mx-1 sm:mx-0">
              <table className="w-full text-left text-xs min-w-[680px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-2 py-2 font-semibold text-gray-400">ผู้ลา</th>
                    {LEAVE_TYPES.map((t) => (
                      <th key={t.id} className="px-2 py-2 font-semibold text-gray-400">
                        {t.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {approvedSummaryRows.map((row) => (
                    <tr key={row.user_email} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-2 py-2 text-gray-300 whitespace-nowrap">
                        {row.user_display_name || row.user_email}
                      </td>
                      {LEAVE_TYPES.map((t) => (
                        <td key={`${row.user_email}-${t.id}`} className="px-2 py-2 text-gray-400">
                          {row.totalsByType[t.id] != null && row.totalsByType[t.id] > 0
                            ? formatHoursEquivalent(row.totalsByType[t.id])
                            : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
          <h3 className="font-bold text-gray-300 mb-2">Leave Debug Logs</h3>
          <p className="text-xs text-gray-500 mb-3">แสดง log เฉพาะตอนแอดมินทำการอนุมัติ/ไม่อนุมัติ (ไม่ใช่ console)</p>
          <div className="max-h-64 overflow-auto rounded-xl bg-black/30 border border-white/10 p-3 font-mono text-[11px] text-gray-300 space-y-2">
            {debugLogs.length === 0 ? (
              <div className="text-gray-500">ยังไม่มี log</div>
            ) : (
              debugLogs.map((l, idx) => (
                <div key={`${l.at}-${idx}`} className="break-words whitespace-pre-wrap">
                  <span className={l.level === 'error' ? 'text-red-400' : l.level === 'warn' ? 'text-amber-300' : 'text-emerald-300'}>
                    [{l.level.toUpperCase()}]
                  </span>{' '}
                  {l.at} {l.text}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminLeaveManagePage;
