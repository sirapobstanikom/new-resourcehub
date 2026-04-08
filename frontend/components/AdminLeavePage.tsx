import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logoutAdmin } from '../lib/auth';
import {
  LEAVE_DAY_PART_TIMES,
  type LeaveDayPart,
  countWeekdaysInRange,
  formatBalanceDaysHalves,
  formatLeaveSlotLabel,
  requestedLeaveHoursEquivalent,
} from '../lib/leaveUnits';
/** ตัวเลือกในฟอร์ม — ลากิจ+พักร้อนรวมเป็นกลุ่มเดียว */
const LEAVE_TYPES = [
  { id: 'personal_vacation', label: 'ลากิจ / ลาพักร้อน' },
  { id: 'sick', label: 'ลาป่วย' },
  { id: 'wfh', label: 'Work from Home' },
  { id: 'unpaid', label: 'ลาไม่รับเงินเดือน' },
  { id: 'other', label: 'ลาอื่นๆ' },
] as const;

const LEGACY_LEAVE_TYPE_LABELS: Record<string, string> = {
  personal: 'ลากิจ (ข้อมูลเก่า)',
  vacation: 'ลาพักร้อน (ข้อมูลเก่า)',
};

function resolveLeaveTypeLabel(id: string): string {
  return LEAVE_TYPES.find((t) => t.id === id)?.label ?? LEGACY_LEAVE_TYPE_LABELS[id] ?? id;
}

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
  attachment_url?: string | null;
  other_leave_purpose?: string | null;
  cancel_reason?: string | null;
  cancel_decided_by_email?: string | null;
  cancel_decided_at?: string | null;
  cancel_decision?: string | null;
  status: string;
  approved_by_email: string | null;
  approved_at: string | null;
  created_at: string;
};

type LeaveCancelAuditRow = {
  id: string;
  leave_request_id: string;
  user_id?: string | null;
  user_email: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  cancel_reason: string | null;
  status: 'cancel_requested' | 'cancelled' | 'rejected';
  requested_at: string;
  decided_by_email: string | null;
  decided_at: string | null;
  decision: string | null;
};

function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** เวลาที่ยื่นคำขอลา (จาก created_at) แสดงเป็น 24 ชม. เช่น 13.00 */
function formatSubmittedAt(createdAt: string | null | undefined): string {
  if (!createdAt) return '—';
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false });
}

/** วันที่+เวลา แบบไทย 24 ชม. (ไม่มี AM/PM) */
function formatDateTime24(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = d.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} ${time}`;
}

/** ตรวจว่าวันนี้เป็นเสาร์หรืออาทิตย์ (ISO date YYYY-MM-DD) */
function isWeekend(isoDate: string): boolean {
  const d = new Date(isoDate + 'T12:00:00Z');
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

/** ตรวจว่าช่วงวันที่มีวันเสาร์หรืออาทิตย์รวมอยู่หรือไม่ */
function dateRangeIncludesWeekend(startIso: string, endIso: string): boolean {
  const start = new Date(startIso + 'T12:00:00Z').getTime();
  const end = new Date(endIso + 'T12:00:00Z').getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  for (let t = start; t <= end; t += oneDay) {
    const d = new Date(t);
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) return true;
  }
  return false;
}

const MAX_LEAVE_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const LEAVE_ATTACHMENT_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf';

async function uploadLeaveAttachmentFile(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
  const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const path = `${userId}/${safe}`;
  const { error } = await supabase.storage.from('leave-attachments').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('leave-attachments').getPublicUrl(path);
  return data.publicUrl;
}

async function notifyLeaveLine(payload: {
  event_type: 'leave_created' | 'leave_cancel_requested' | 'leave_cancelled';
  leave_id?: string | null;
  user_display_name?: string | null;
  user_email?: string | null;
  leave_type?: string | null;
  slot_label?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  reason?: string | null;
  cancel_reason?: string | null;
}): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('notify-leave-line', { body: payload });
    if (error) console.warn('[LeaveLineNotify] invoke error:', error.message);
  } catch (e) {
    console.warn('[LeaveLineNotify] unexpected error:', e);
  }
}

/** วันในสัปดาห์ (อาทิตย์–เสาร์) สำหรับหัวตาราง */
const WEEKDAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

/** คืน ISO date string (YYYY-MM-DD) สำหรับวันนั้นใน timezone Bangkok */
function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** ตรวจว่าช่วงลาทับกับวันนี้หรือไม่ (end_date เป็น inclusive) */
function leaveOverlapsDay(row: LeaveRequestRow, dayKey: string): boolean {
  const start = row.start_date;
  const end = row.end_date;
  if (!start) return false;
  return dayKey >= start && dayKey <= end;
}

/** สร้าง grid 42 ช่อง (6 สัปดาห์) สำหรับเดือนที่กำหนด */
function getMonthGrid(year: number, month: number): { date: Date; isCurrentMonth: boolean }[] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startSunday = new Date(first);
  startSunday.setDate(first.getDate() - first.getDay());
  const out: { date: Date; isCurrentMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startSunday);
    d.setDate(startSunday.getDate() + i);
    out.push({
      date: d,
      isCurrentMonth: d.getMonth() === month - 1,
    });
  }
  return out;
}

const ADMIN_LEAVE_MANAGER_EMAILS = ['pink@minddojo.me', 'koy@minddojo.me', 'tonji@minddojo.me'];

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

type PublicHoliday = { id: number; month: number; day: number; name: string | null };

const AdminLeavePage: React.FC = () => {
  const { user } = useAuth();
  const handleAdminLogout = async () => {
    logoutAdmin();
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  };
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([]);
  const [holidaysOpen, setHolidaysOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<string>(LEAVE_TYPES[0].id);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [leaveDayPart, setLeaveDayPart] = useState<LeaveDayPart>('full');
  const [startTime, setStartTime] = useState(LEAVE_DAY_PART_TIMES.full.start);
  const [endTime, setEndTime] = useState(LEAVE_DAY_PART_TIMES.full.end);
  const [reason, setReason] = useState('');
  const [otherLeavePurpose, setOtherLeavePurpose] = useState('');
  const [sickAttachment, setSickAttachment] = useState<File | null>(null);
  const [weekendError, setWeekendError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [leaveList, setLeaveList] = useState<LeaveRequestRow[]>([]);
  const [leaveListLoading, setLeaveListLoading] = useState(true);
  const [leaveListError, setLeaveListError] = useState<string | null>(null);
  const [approvedLeaves, setApprovedLeaves] = useState<LeaveRequestRow[]>([]);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequestRow | null>(null);
  const [selectedDayLeaves, setSelectedDayLeaves] = useState<LeaveRequestRow[] | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [myLeaveList, setMyLeaveList] = useState<LeaveRequestRow[]>([]);
  const [myLeaveListLoading, setMyLeaveListLoading] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<{
    personal_remaining: number;
    sick_remaining: number;
    annual_remaining: number;
    unpaid_remaining: number;
    hours_remaining?: number;
    hours_personal_remaining?: number;
    hours_sick_remaining?: number;
    hours_annual_remaining?: number;
    hours_unpaid_remaining?: number;
  } | null>(null);
  const [wfhUsedThisMonth, setWfhUsedThisMonth] = useState<boolean>(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<
    Array<{ at: string; level: 'info' | 'warn' | 'error'; text: string }>
  >([]);
  const ROWS_PER_PAGE = 20;
  const [myLeavePage, setMyLeavePage] = useState(1);
  const [approvedPage, setApprovedPage] = useState(1);

  const [cancelAudits, setCancelAudits] = useState<LeaveCancelAuditRow[]>([]);
  const [cancelAuditsLoading, setCancelAuditsLoading] = useState(false);
  const [cancelAuditsError, setCancelAuditsError] = useState<string | null>(null);
  const [cancelAuditsRefreshKey, setCancelAuditsRefreshKey] = useState(0);

  const pushDebugLog = (level: 'info' | 'warn' | 'error', label: string, details: Record<string, unknown>) => {
    const text = `${label} ${JSON.stringify(details)}`;
    setDebugLogs((prev) => {
      const next = [...prev, { at: new Date().toISOString(), level, text }];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  };

  // รวมยอดคงเหลือในรูป "ชั่วโมงเทียบเท่า" โดย 1 วัน = 8 ชั่วโมง
  // เพื่อให้กรณีเดิมที่ระบบเก็บ days+hours สามารถตัดสินว่า "คงเหลือ 0" ได้ตรงกันทั้ง UI และ logic
  const getLeaveRemainingHoursEquivalent = (leaveTypeId: string): number => {
    if (!leaveBalance) return 0;
    switch (leaveTypeId) {
      case 'personal_vacation':
        return (
          (leaveBalance.personal_remaining ?? 0) * 8 +
          (leaveBalance.hours_personal_remaining ?? 0) +
          (leaveBalance.annual_remaining ?? 0) * 8 +
          (leaveBalance.hours_annual_remaining ?? 0)
        );
      case 'other':
        return 999999;
      case 'personal':
        return (leaveBalance.personal_remaining ?? 0) * 8 + (leaveBalance.hours_personal_remaining ?? 0);
      case 'sick':
        return (leaveBalance.sick_remaining ?? 0) * 8 + (leaveBalance.hours_sick_remaining ?? 0);
      case 'vacation':
        return (leaveBalance.annual_remaining ?? 0) * 8 + (leaveBalance.hours_annual_remaining ?? 0);
      case 'unpaid':
        return (leaveBalance.unpaid_remaining ?? 0) * 8 + (leaveBalance.hours_unpaid_remaining ?? 0);
      case 'wfh':
        // UI เดิมผูกกับ "เดือนปัจจุบัน" เท่านั้น
        // เพื่อให้เลือก WFH ใน "เดือนใหม่" ได้ แม้เดือนปัจจุบันจะใช้ครบแล้ว
        // (คำขอจะถูกตรวจซ้ำอีกครั้งตอน submit ด้วย)
        if (!wfhUsedThisMonth) return 8;
        if (!startDate) return 0;
        // compare YYYY-MM
        return startDate.slice(0, 7) === today.slice(0, 7) ? 0 : 8; // WFH 1 วัน/เดือน = 8 ชั่วโมง
      default:
        return 0;
    }
  };

  // ถ้าประเภทที่เลือกอยู่ "คงเหลือ 0" แล้ว ให้สลับไปประเภทอื่นอัตโนมัติ
  useEffect(() => {
    if (!leaveBalance) return;
    const currentRemaining = getLeaveRemainingHoursEquivalent(leaveType);
    if (currentRemaining > 0) return;
    const firstAvailable = LEAVE_TYPES.map((t) => t.id).find((id) => getLeaveRemainingHoursEquivalent(id) > 0);
    if (firstAvailable) setLeaveType(firstAvailable);
  }, [leaveBalance, wfhUsedThisMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentYear = new Date().getFullYear();
  const now = new Date();
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const thisMonthEnd = `${lastDayOfMonth.getFullYear()}-${String(lastDayOfMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLeaveListLoading(false);
      setLeaveListError(null);
      return;
    }
    setLeaveListError(null);
    supabase
      .from('leave_requests')
      .select('id, user_email, user_display_name, leave_type, start_date, end_date, start_time, end_time, reason, attachment_url, other_leave_purpose, cancel_reason, cancel_decided_by_email, cancel_decided_at, cancel_decision, status, approved_by_email, approved_at, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        setLeaveListLoading(false);
        if (error) {
          setLeaveListError(error.message);
          setLeaveList([]);
          return;
        }
        setLeaveList((data as LeaveRequestRow[]) ?? []);
      });
  }, [submitted]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from('public_holidays')
      .select('id, month, day, name')
      .order('month')
      .order('day')
      .then(({ data }) => {
        if (data) setPublicHolidays(data as PublicHoliday[]);
      });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return;
    setMyLeaveListLoading(true);
    supabase
      .from('leave_requests')
      .select('id, user_email, user_display_name, leave_type, start_date, end_date, start_time, end_time, reason, attachment_url, other_leave_purpose, cancel_reason, cancel_decided_by_email, cancel_decided_at, cancel_decision, status, approved_by_email, approved_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setMyLeaveListLoading(false);
        if (error) return;
        setMyLeaveList((data as LeaveRequestRow[]) ?? []);
      });
  }, [user?.id, submitted]);

  // โหลดประวัติคำขอยกเลิก (ทุกครั้ง/ทุกคน) จาก audit table
  const fetchCancelAudits = async () => {
    if (!isSupabaseConfigured) return;
    setCancelAuditsLoading(true);
    setCancelAuditsError(null);
    const { data, error } = await supabase
      .from('leave_cancel_audits')
      .select('id, leave_request_id, user_id, user_email, leave_type, start_date, end_date, start_time, end_time, cancel_reason, status, requested_at, decided_by_email, decided_at, decision')
      .order('requested_at', { ascending: false })
      .limit(200);
    setCancelAuditsLoading(false);
    if (error) {
      setCancelAuditsError(error.message);
      return;
    }
    setCancelAudits((data as LeaveCancelAuditRow[]) ?? []);
  };

  useEffect(() => {
    fetchCancelAudits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupabaseConfigured, cancelAuditsRefreshKey]);

  // รีเฟรชถ้ายังมีรายการที่รออนุมัติยกเลิก เพื่อให้ผู้อนุมัติแสดงทันที
  useEffect(() => {
    const hasPending = cancelAudits.some((a) => a.status === 'cancel_requested');
    if (!hasPending) return;

    const t = window.setInterval(() => {
      fetchCancelAudits();
    }, 8000);

    return () => window.clearInterval(t);
  }, [cancelAudits]);

  // (ส่วนการรีเฟรช/แสดงรายการยกเลิกย้ายไปใช้ audit table แล้ว)

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.email) return;
    supabase
      .from('admin_users')
      .select('personal_remaining, sick_remaining, annual_remaining, unpaid_remaining, hours_remaining, hours_personal_remaining, hours_sick_remaining, hours_annual_remaining, hours_unpaid_remaining')
      .eq('email', user.email)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as {
            personal_remaining?: number;
            sick_remaining?: number;
            annual_remaining?: number;
            unpaid_remaining?: number;
            hours_remaining?: number;
            hours_personal_remaining?: number;
            hours_sick_remaining?: number;
            hours_annual_remaining?: number;
            hours_unpaid_remaining?: number;
          };
          setLeaveBalance({
            personal_remaining: d.personal_remaining ?? 15,
            sick_remaining: d.sick_remaining ?? 30,
            annual_remaining: d.annual_remaining ?? 6,
            unpaid_remaining: d.unpaid_remaining ?? 0,
            hours_remaining: d.hours_remaining != null ? Number(d.hours_remaining) : 0,
            hours_personal_remaining: d.hours_personal_remaining,
            hours_sick_remaining: d.hours_sick_remaining,
            hours_annual_remaining: d.hours_annual_remaining,
            hours_unpaid_remaining: d.hours_unpaid_remaining,
          });
        } else {
          setLeaveBalance({ personal_remaining: 15, sick_remaining: 30, annual_remaining: 6, unpaid_remaining: 0, hours_remaining: 0 });
        }
      });
  }, [user?.email]);

  useEffect(() => {
    if (leaveType !== 'sick') setSickAttachment(null);
  }, [leaveType]);

  useEffect(() => {
    if (startDate && endDate && startDate === endDate) {
      const { start, end } = LEAVE_DAY_PART_TIMES[leaveDayPart];
      setStartTime(start);
      setEndTime(end);
    }
  }, [leaveDayPart, startDate, endDate]);

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return;
    supabase
      .from('leave_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('leave_type', 'wfh')
      .eq('status', 'approved')
      .gte('end_date', thisMonthStart)
      .lte('start_date', thisMonthEnd)
      .then(({ data }) => {
        setWfhUsedThisMonth((data?.length ?? 0) > 0);
      });
  }, [user?.id, thisMonthStart, thisMonthEnd]);

  useEffect(() => {
    if (leaveType !== 'sick' && startDate && startDate < today) {
      setStartDate(today);
      setEndDate(today);
    }
  }, [leaveType, today]);

  const monthStart = `${calendarViewDate.getFullYear()}-${String(calendarViewDate.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 0);
  const monthEnd = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from('leave_requests')
      .select('id, user_email, user_display_name, leave_type, start_date, end_date, start_time, end_time, reason, attachment_url, other_leave_purpose, status, approved_by_email, approved_at, created_at')
      .eq('status', 'approved')
      .lte('start_date', monthEnd)
      .gte('end_date', monthStart)
      .order('start_date', { ascending: true })
      .then(({ data, error }) => {
        if (error) return;
        setApprovedLeaves((data as LeaveRequestRow[]) ?? []);
      });
  }, [monthStart, monthEnd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!user?.id || !user?.email) {
      setSubmitError('กรุณาเข้าสู่ระบบใหม่');
      return;
    }
    if (!isSupabaseConfigured) {
      setSubmitError('ยังไม่ได้ตั้งค่า Supabase');
      return;
    }
    if (!leaveBalance) {
      setSubmitError('กำลังโหลดข้อมูลคงเหลือ กรุณาลองใหม่อีกครั้ง');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (leaveType !== 'sick' && (startDate < today || endDate < today)) {
      setSubmitError('เฉพาะลาป่วยเท่านั้นที่ยื่นย้อนหลังได้');
      return;
    }
    if (dateRangeIncludesWeekend(startDate, endDate)) {
      setSubmitError('ห้ามลาวันเสาร์และอาทิตย์ (เวลาทำงาน จันทร์–ศุกร์)');
      return;
    }

    // กันส่งคำขอลาของประเภทที่คงเหลือ 0 แล้ว (ลาอื่นๆ ไม่หักโควตา)
    if (leaveBalance && leaveType !== 'other') {
      const remaining = getLeaveRemainingHoursEquivalent(leaveType);
      if (remaining <= 0) {
        const label = resolveLeaveTypeLabel(leaveType);
        setSubmitError(`${label} คงเหลือ 0 แล้ว กรุณาเลือกประเภทอื่น`);
        return;
      }
      const requestHours = requestedLeaveHoursEquivalent(
        startDate,
        endDate,
        startDate === endDate ? startTime : null,
        startDate === endDate ? endTime : null,
      );
      if (requestHours > remaining) {
        setSubmitError('จำนวนลาที่ขอเกินโควตาคงเหลือ (คิดเป็นเต็มวัน/ครึ่งวัน)');
        return;
      }
    }

    if (leaveType === 'other' && !otherLeavePurpose.trim()) {
      setSubmitError('กรุณาระบุประเภทลา / ลาไปทำอะไร (เช่น ลาบวช ลาคลอด)');
      return;
    }

    const sickWeekdays =
      leaveType === 'sick' && startDate && endDate ? countWeekdaysInRange(startDate, endDate) : 0;
    if (leaveType === 'sick' && sickWeekdays >= 3) {
      if (!sickAttachment) {
        setSubmitError('ลาป่วยติดต่อกันตั้งแต่ 3 วันทำงานขึ้นไป (ไม่นับเสาร์–อาทิตย์) ต้องแนบรูปหรือ PDF (ใบรับรองแพทย์หรือเอกสารประกอบ)');
        return;
      }
      if (sickAttachment.size > MAX_LEAVE_ATTACHMENT_BYTES) {
        setSubmitError('ไฟล์แนบต้องไม่เกิน 5 MB');
        return;
      }
      const allowMime = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']);
      if (sickAttachment.type && !allowMime.has(sickAttachment.type)) {
        setSubmitError('รองรับเฉพาะไฟล์ PDF หรือรูปภาพ (JPEG, PNG, WebP, GIF)');
        return;
      }
    }

    if (leaveType === 'wfh') {
      if (startDate !== endDate) {
        setSubmitError('ลาประเภท Work from Home ได้แค่ 1 วันต่อเดือน กรุณาเลือกวันเริ่มต้นและวันสิ้นสุดเป็นวันเดียวกัน');
        return;
      }
      const [y, m] = startDate.split('-').map(Number);
      const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const monthEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const { data: existingWfh } = await supabase
        .from('leave_requests')
        .select('id')
        .eq('user_id', user.id)
        .eq('leave_type', 'wfh')
        .eq('status', 'approved')
        .lte('start_date', monthEnd)
        .gte('end_date', monthStart);
      if (existingWfh && existingWfh.length > 0) {
        setSubmitError('ลาประเภท Work from Home ได้แค่ 1 วันต่อเดือน ถ้าลาแล้วจะลาอีกได้ในเดือนถัดไป');
        return;
      }
    }
    setLoading(true);
    let attachmentUrl: string | null = null;
    if (leaveType === 'sick' && sickWeekdays >= 3 && sickAttachment) {
      try {
        attachmentUrl = await uploadLeaveAttachmentFile(user.id, sickAttachment);
      } catch (err) {
        setLoading(false);
        const msg = err instanceof Error ? err.message : String(err);
        setSubmitError(
          `อัปโหลดไฟล์ไม่สำเร็จ: ${msg} — ตรวจสอบว่าสร้าง bucket ชื่อ leave-attachments ใน Supabase Storage และรัน SQL เพิ่มคอลัมน์แล้ว`,
        );
        return;
      }
    }

    const displayName = user.user_metadata?.full_name ?? user.email.split('@')[0];
    const isOneDay = startDate === endDate;
    const payload: Record<string, unknown> = {
      user_id: user.id,
      user_email: user.email,
      user_display_name: displayName,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim() || null,
      status: 'pending',
    };
    if (attachmentUrl) payload.attachment_url = attachmentUrl;
    if (leaveType === 'other') payload.other_leave_purpose = otherLeavePurpose.trim();
    if (isOneDay) {
      const fromTime = startTime || '09:00';
      const toTime = endTime || '17:00';
      payload.start_time = fromTime.length === 5 ? `${fromTime}:00` : fromTime;
      payload.end_time = toTime.length === 5 ? `${toTime}:00` : toTime;
    }
    const { data: insertedRows, error } = await supabase
      .from('leave_requests')
      .insert(payload)
      .select('id')
      .limit(1);
    setLoading(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    void notifyLeaveLine({
      event_type: 'leave_created',
      leave_id: insertedRows?.[0]?.id ?? null,
      user_display_name: displayName,
      user_email: user.email,
      leave_type: leaveType,
      slot_label: formatLeaveSlotLabel(startDate, endDate, isOneDay ? startTime : null, isOneDay ? endTime : null),
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim() || null,
    });
    setSubmitted(true);
    setStartDate('');
    setEndDate('');
    setLeaveDayPart('full');
    setStartTime(LEAVE_DAY_PART_TIMES.full.start);
    setEndTime(LEAVE_DAY_PART_TIMES.full.end);
    setReason('');
    setOtherLeavePurpose('');
    setSickAttachment(null);
  };

  const handleCancelRequest = async (row: LeaveRequestRow) => {
    setCancelError(null);
    setCancellingId(row.id);
    const nextStatus = row.status === 'approved' ? 'cancel_requested' : 'cancelled';

    // ให้ผู้ใช้กรอกเหตุผลที่ขอยกเลิก เพื่อให้แอดมินเห็นและใช้ทำ log ตรวจสอบย้อนหลัง
    const cancelReasonInput = window.prompt('เหตุผลที่ขอยกเลิก (จะแสดงให้แอดมิน)');
    if (cancelReasonInput === null) {
      setCancellingId(null);
      return; // ยกเลิกการทำรายการ
    }
    const cancelReason = cancelReasonInput.trim();
    if (!cancelReason) {
      setCancelError('กรุณากรอกเหตุผลที่ขอยกเลิก');
      setCancellingId(null);
      return;
    }

    // Log รายละเอียดคำขอยกเลิก (สำหรับดีบัก/ตรวจสอบภายหลัง)
    console.log('[LeaveCancel] request', {
      leave_request_id: row.id,
      leave_type: row.leave_type,
      user_email: row.user_email,
      start_date: row.start_date,
      end_date: row.end_date,
      start_time: row.start_time,
      end_time: row.end_time,
      cancel_reason: cancelReason,
      prev_status: row.status,
      next_status: nextStatus,
      requested_by: user?.email ?? null,
      at: new Date().toISOString(),
    });
    pushDebugLog('info', 'รายการลาที่ขอยกเลิก', {
      leave_request_id: row.id,
      leave_type: row.leave_type,
      user_email: row.user_email,
      start_date: row.start_date,
      end_date: row.end_date,
      start_time: row.start_time,
      end_time: row.end_time,
      'ผู้ที่ขอยกเลิก': row.user_email,
      'เหตุผลที่ขอยกเลิก': cancelReason,
      prev_status: row.status,
      next_status: nextStatus,
      'ผู้ทำรายการ': user?.email ?? null,
    });

    // เก็บประวัติ "ทุกครั้งที่ขอยกเลิก" ลง audit table
    const auditPayload = {
      leave_request_id: row.id,
      user_id: user?.id ?? null,
      user_email: row.user_email,
      leave_type: row.leave_type,
      start_date: row.start_date,
      end_date: row.end_date,
      start_time: row.start_time,
      end_time: row.end_time,
      cancel_reason: cancelReason,
      status: nextStatus === 'cancel_requested' ? 'cancel_requested' : 'cancelled',
      decided_by_email: nextStatus === 'cancelled' ? user?.email ?? null : null,
      decided_at: nextStatus === 'cancelled' ? new Date().toISOString() : null,
      decision: nextStatus === 'cancelled' ? 'self_cancel' : null,
    };

    const { error: auditErr } = await supabase.from('leave_cancel_audits').insert(auditPayload);
    if (auditErr) {
      setCancelError(auditErr.message || 'บันทึกคำขอยกเลิกไม่สำเร็จ กรุณาลองใหม่');
      setCancellingId(null);
      return;
    }

    const decidedFields =
      nextStatus === 'cancelled'
        ? { cancel_decided_by_email: user?.email ?? null, cancel_decided_at: new Date().toISOString(), cancel_decision: 'self_cancel' }
        : { cancel_decided_by_email: null, cancel_decided_at: null, cancel_decision: null };

    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        status: nextStatus,
        cancel_reason: cancelReason,
        ...decidedFields,
      })
      .eq('id', row.id)
      .select('id, status');
    setCancellingId(null);
    if (error) {
      console.error('[LeaveCancel] request failed', {
        leave_request_id: row.id,
        prev_status: row.status,
        next_status: nextStatus,
        error: error.message,
      });
      pushDebugLog('error', '[LeaveCancel] request failed', {
        leave_request_id: row.id,
        prev_status: row.status,
        next_status: nextStatus,
        error: error.message,
      });
      setCancelError(error.message || 'ยกเลิกไม่สำเร็จ กรุณาลองใหม่');
      return;
    }
    if (!data || data.length === 0) {
      setCancelError(
        row.status === 'approved'
          ? 'ส่งคำขอยกเลิกไม่สำเร็จ (ไม่มีสิทธิ์หรือไม่พบแถว) — ตรวจสอบว่าเป็นคำขอของตัวเองและสถานะอนุมัติแล้ว'
          : 'ยกเลิกไม่สำเร็จ (ไม่มีสิทธิ์หรือไม่พบแถว) — ตรวจสอบว่าเป็นคำขอของตัวเองและสถานะรออนุมัติ'
      );
      console.warn('[LeaveCancel] request no rows updated', {
        leave_request_id: row.id,
        prev_status: row.status,
        next_status: nextStatus,
        returned_rows: data?.length ?? 0,
      });
      pushDebugLog('warn', '[LeaveCancel] request no rows updated', {
        leave_request_id: row.id,
        prev_status: row.status,
        next_status: nextStatus,
        returned_rows: data?.length ?? 0,
      });
      return;
    }

    console.log('[LeaveCancel] request updated', {
      leave_request_id: row.id,
      prev_status: row.status,
      next_status: nextStatus,
      updated_rows: data.length,
      at: new Date().toISOString(),
    });
    pushDebugLog('info', 'รายการลาที่ขอยกเลิก', {
      leave_request_id: row.id,
      prev_status: row.status,
      next_status: nextStatus,
      updated_rows: data.length,
      'เหตุผลที่ขอยกเลิก': cancelReason,
      'ผู้ที่ขอยกเลิก': row.user_email,
    });

    // รีเฟรชรายการยกเลิกจาก audit table
    setCancelAuditsRefreshKey((k) => k + 1);
    void notifyLeaveLine({
      event_type: nextStatus === 'cancelled' ? 'leave_cancelled' : 'leave_cancel_requested',
      leave_id: row.id,
      user_display_name: row.user_display_name,
      user_email: row.user_email,
      leave_type: row.leave_type,
      slot_label: formatLeaveSlotLabel(row.start_date, row.end_date, row.start_time, row.end_time),
      start_date: row.start_date,
      end_date: row.end_date,
      cancel_reason: cancelReason,
    });

    if (nextStatus === 'cancelled') {
      // เก็บไว้ใน state เพื่อให้กล่อง log แสดงได้ (ตารางหลักจะกรองออกเอง)
      setMyLeaveList((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                status: 'cancelled',
                cancel_reason: cancelReason,
                cancel_decided_by_email: null,
                cancel_decided_at: null,
                cancel_decision: null,
              }
            : r,
        ),
      );
      setLeaveList((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                status: 'cancelled',
                cancel_reason: cancelReason,
                cancel_decided_by_email: null,
                cancel_decided_at: null,
                cancel_decision: null,
              }
            : r,
        ),
      );
      return;
    }

    // cancel_requested: อัปเดตสถานะใน list เพื่อรอแอดมินอนุมัติ
    setMyLeaveList((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? {
              ...r,
              status: 'cancel_requested',
              cancel_reason: cancelReason,
              cancel_decided_by_email: null,
              cancel_decided_at: null,
              cancel_decision: null,
            }
          : r,
      ),
    );
    setLeaveList((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, status: 'cancel_requested', cancel_reason: cancelReason } : r)),
    );
  };

  const sickWeekdayCountForForm =
    leaveType === 'sick' && startDate && endDate ? countWeekdaysInRange(startDate, endDate) : 0;

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-4 sm:px-6 py-4 sm:py-6 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-yellow-400 rounded-lg flex items-center justify-center glow-yellow">
              <span className="text-black font-semibold text-lg sm:text-xl">M</span>
            </div>
            <span className="text-base sm:text-xl font-semibold tracking-tighter">MindDoJo</span>
          </Link>
          <span className="hidden sm:inline text-gray-500">|</span>
          <span className="text-yellow-400 font-semibold text-sm sm:text-base truncate">ระบบลา MindDojo</span>
        </div>
        <div className="w-full sm:w-auto flex items-center justify-end gap-3">
          <Link
            to="/"
            className="min-h-[44px] flex items-center justify-center px-4 py-3 rounded-xl font-medium bg-white/10 text-white hover:bg-white/20 border border-white/10 w-full sm:w-auto text-center"
          >
            กลับหน้าหลัก
          </Link>
          <button
            type="button"
            onClick={handleAdminLogout}
            className="hidden sm:inline-flex min-h-[44px] items-center justify-center px-4 py-3 rounded-xl font-medium bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400 border border-white/10 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-6 py-5 sm:py-8 space-y-6 sm:space-y-10">
        <h2 className="text-xl font-bold text-gray-300">ยื่นคำขอลา</h2>

        {leaveBalance !== null && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
            <span className="font-medium text-gray-400">ลาคงเหลือ (ปี {currentYear}):</span>{' '}
            ลากิจ / พักร้อน (รวม){' '}
            {formatBalanceDaysHalves(
              (leaveBalance.personal_remaining ?? 0) + (leaveBalance.annual_remaining ?? 0),
              (leaveBalance.hours_personal_remaining ?? 0) + (leaveBalance.hours_annual_remaining ?? 0),
            )}{' '}
            · ลาป่วย {formatBalanceDaysHalves(leaveBalance.sick_remaining, leaveBalance.hours_sick_remaining ?? 0)} ·{' '}
            WFH 1 วัน/เดือน (เดือนนี้{wfhUsedThisMonth ? 'ใช้แล้ว — ลาอีกได้เดือนถัดไป' : 'ยังใช้ได้'}) · ลาไม่รับเงิน{' '}
            {formatBalanceDaysHalves(leaveBalance.unpaid_remaining, leaveBalance.hours_unpaid_remaining ?? 0)}
            <span className="block mt-2 text-gray-500 text-xs">
              ยื่นลากิจหรือลาพักร้อนเลือกประเภทเดียวกัน &quot;ลากิจ / ลาพักร้อน&quot; — ระบบหักจากโควตาทั้งสองกลุ่มรวมกัน
            </span>
          </div>
        )}

        <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 overflow-hidden">
          <button
            type="button"
            onClick={() => setHolidaysOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-400/10 transition"
          >
            <span className="font-semibold text-amber-300">วันหยุดประจำปี</span>
            <span className="text-gray-400 text-sm">
              {publicHolidays.length > 0 ? `${publicHolidays.length} วัน` : 'โหลด...'}
            </span>
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${holidaysOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {holidaysOpen && (
            <div className="px-4 pb-4 pt-0 border-t border-amber-400/20">
              <p className="text-xs text-gray-400 mt-2 mb-3">วันเหล่านี้ไม่หักวันลา (นอกจากเสาร์–อาทิตย์)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {THAI_MONTHS.map((monthName, i) => {
                  const monthNum = i + 1;
                  const days = publicHolidays.filter((h) => h.month === monthNum);
                  if (days.length === 0) return null;
                  return (
                    <div key={monthNum} className="rounded-lg bg-black/20 px-3 py-2">
                      <span className="text-amber-300/90 font-medium text-sm">{monthName}</span>
                      <ul className="mt-1 space-y-0.5 text-sm text-gray-300">
                        {days.map((h) => (
                          <li key={h.id}>วันที่ {h.day} — {h.name || 'วันหยุด'}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">ประเภทการลา</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-sm focus:outline-none focus:border-yellow-400"
            >
              {LEAVE_TYPES.map((t) => (
                <option
                  key={t.id}
                  value={t.id}
                  disabled={leaveBalance ? getLeaveRemainingHoursEquivalent(t.id) <= 0 : false}
                  className="bg-neutral-900 text-white"
                >
                  {t.label}
                  {leaveBalance && getLeaveRemainingHoursEquivalent(t.id) <= 0 ? ' (คงเหลือ 0)' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">เฉพาะลาป่วยเท่านั้นที่ยื่นย้อนหลังได้</p>
          </div>
          <p className="text-xs text-gray-500">
            เวลาทำงาน จันทร์–ศุกร์ 9.00–17.00 น. หยุดเสาร์–อาทิตย์ (ห้ามเลือกวันเสาร์และอาทิตย์) — ลาได้เฉพาะเต็มวันหรือครึ่งวันเช้า/บ่าย (ไม่แบ่งเป็นชั่วโมง)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0 overflow-hidden">
              <label className="block text-sm font-medium text-gray-400 mb-2">วันเริ่มต้น</label>
              <input
                type="date"
                value={startDate}
                min={leaveType === 'sick' ? undefined : today}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v && isWeekend(v)) {
                    setWeekendError('ห้ามเลือกวันเสาร์และอาทิตย์');
                    setStartDate('');
                    return;
                  }
                  setWeekendError(null);
                  setSubmitError(null);
                  setStartDate(v);
                  if (v && endDate && v > endDate) {
                    setEndDate(v);
                  }
                }}
                required
                className="ios-date-input-fix block !w-full min-w-0 max-w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-base focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div className="min-w-0 overflow-hidden">
              <label className="block text-sm font-medium text-gray-400 mb-2">วันสิ้นสุด</label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v && isWeekend(v)) {
                    setWeekendError('ห้ามเลือกวันเสาร์และอาทิตย์');
                    setEndDate('');
                    return;
                  }
                  setWeekendError(null);
                  setSubmitError(null);
                  setEndDate(v);
                }}
                required
                className="ios-date-input-fix block !w-full min-w-0 max-w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-base focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>
          {weekendError && <p className="text-sm text-amber-400">{weekendError}</p>}
          {startDate && endDate && startDate === endDate && !dateRangeIncludesWeekend(startDate, endDate) && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">ลา 1 วัน — เต็มวันหรือครึ่งวัน</label>
              <select
                value={leaveDayPart}
                onChange={(e) => setLeaveDayPart(e.target.value as LeaveDayPart)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-sm focus:outline-none focus:border-yellow-400"
              >
                <option value="full" className="bg-neutral-900 text-white">
                  เต็มวัน (09.00–17.00 น.)
                </option>
                <option value="morning" className="bg-neutral-900 text-white">
                  ครึ่งวันเช้า (09.00–13.00 น.)
                </option>
                <option value="afternoon" className="bg-neutral-900 text-white">
                  ครึ่งวันบ่าย (13.00–17.00 น.)
                </option>
              </select>
              <p className="text-xs text-gray-500 mt-1.5">
                ระบบจะบันทึกช่วงเวลาตามตัวเลือกนี้ — โควตาหักเป็นเต็มวัน (8 ชม.) หรือครึ่งวัน (4 ชม.)
              </p>
            </div>
          )}
          {leaveType === 'sick' && startDate && endDate && sickWeekdayCountForForm >= 3 && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 space-y-2">
              <p className="text-sm text-amber-100">
                ลาป่วยในช่วงนี้นับได้ <strong>{sickWeekdayCountForForm}</strong> วันทำงานในช่วงวันที่ (ไม่นับเสาร์–อาทิตย์)
                — ต้องแนบรูปหรือ PDF (เช่น ใบรับรองแพทย์) ขนาดไม่เกิน 5 MB
              </p>
              <input
                type="file"
                accept={LEAVE_ATTACHMENT_ACCEPT}
                onChange={(e) => setSickAttachment(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-yellow-400/20 file:text-yellow-200"
              />
              {sickAttachment ? (
                <p className="text-xs text-gray-400">เลือกแล้ว: {sickAttachment.name}</p>
              ) : null}
            </div>
          )}
          {leaveType === 'other' && (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-cyan-200 mb-2">
                  ลาอะไร / ไปทำอะไร <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={otherLeavePurpose}
                  onChange={(e) => setOtherLeavePurpose(e.target.value)}
                  placeholder="เช่น ลาบวช, ลาคลอด, ลารับราชการทหาร"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyan-400/50"
                />
              </div>
              <div className="text-xs text-gray-400 space-y-1 border-t border-white/10 pt-3">
                <p className="font-semibold text-gray-300">รายละเอียดประเภทลาอื่นๆ (อ้างอิงทั่วไป — ตามนโยบายบริษัทฉบับจริง):</p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                  <li>ลาบวช — โดยทั่วไปได้ไม่เกิน 15 วันทำการ</li>
                  <li>ลาคลอด — สิทธิ์โดยประมาณ 60 วัน (แยกช่วงตามกฎหมาย/สัญญา); ระบุจำนวนวันที่ต้องการในช่วงวันที่ด้านบน</li>
                  <li>ลาอื่นตามกฎหมายแรงงาน — ระบุในช่องนี้และใส่รายละเอียดเพิ่มในช่อง &quot;เหตุผล&quot;</li>
                </ul>
                <p className="text-cyan-200/90 mt-2">
                  ประเภทนี้ไม่หักวันลากิจ/พักร้อนในระบบอัตโนมัติ — แอดมินพิจารณาตามเอกสาร
                </p>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">เหตุผล (ถ้ามี)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="ระบุเหตุผลการลา..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-yellow-400 resize-none"
            />
          </div>
          {submitError && (
            <p className="text-sm text-red-400">{submitError}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="min-h-[48px] px-6 py-3 rounded-xl font-medium bg-yellow-400 text-black hover:bg-yellow-300 active:bg-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            {loading ? 'กำลังส่ง...' : 'ส่งคำขอลา'}
          </button>
          {submitted && !submitError && (
            <p className="text-sm text-emerald-400">ส่งคำขอลาแล้ว บันทึกในระบบเรียบร้อย รอการอนุมัติจากแอดมิน</p>
          )}
        </form>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
          <h3 className="font-bold text-gray-300 mb-2">รายการลาของตัวเอง</h3>
          <p className="text-sm text-gray-500 mb-4">รายการขอลาที่ยังไม่ยกเลิก สามารถยกเลิกได้เฉพาะคำขอที่รออนุมัติ</p>
          {cancelError && (
            <div className="text-sm mb-3 space-y-2">
              <p className="text-red-400">{cancelError}</p>
              <p className="text-gray-500">ให้เปิด Supabase → SQL Editor แล้วรันไฟล์ <code className="bg-white/10 px-1 rounded">backend/supabase/fix_leave_cancel_policy.sql</code> หรือรันคำสั่งด้านล่าง (รวมแก้ constraint ให้รองรับสถานะ ยกเลิกแล้ว):</p>
              <pre className="text-xs bg-black/30 p-3 rounded-lg overflow-x-auto text-gray-300 whitespace-pre">
{`-- แก้ constraint ให้มี 'cancelled' และ 'cancel_requested'
alter table public.leave_requests drop constraint if exists leave_requests_status_check;
alter table public.leave_requests add constraint leave_requests_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled', 'cancel_requested'));

-- RLS ให้ผู้ใช้ยกเลิกคำขอของตัวเองได้
drop policy if exists "Allow update own leave_requests cancel" on public.leave_requests;
create policy "Allow update own leave_requests cancel"
  on public.leave_requests for update
  using (auth.uid() = user_id and status in ('pending','approved'))
  with check (auth.uid() = user_id and status in ('cancelled','cancel_requested'));`}
              </pre>
            </div>
          )}
          {myLeaveListLoading ? (
            <div className="min-h-[80px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-sm">
              กำลังโหลด...
            </div>
          ) : (() => {
            const myList = myLeaveList.filter((r) => r.status !== 'cancelled');
            const myTotal = myList.length;
            const myTotalPages = Math.max(1, Math.ceil(myTotal / ROWS_PER_PAGE));
            const myPage = Math.min(myLeavePage, myTotalPages);
            const myRows = myList.slice((myPage - 1) * ROWS_PER_PAGE, myPage * ROWS_PER_PAGE);
            return myTotal === 0 ? (
              <div className="min-h-[80px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-sm">
                ยังไม่มีรายการลา (ที่ยังไม่ยกเลิก)
              </div>
            ) : (
            <>
            <p className="sm:hidden text-xs text-gray-500 mb-2">เลื่อนซ้าย-ขวาเพื่อดูตาราง</p>
            <div className="rounded-xl border border-white/10 overflow-x-auto -mx-1 sm:mx-0">
              <table className="w-full text-left text-sm min-w-[460px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-3 py-2 font-semibold text-gray-400">ประเภท</th>
                    <th className="px-3 py-2 font-semibold text-gray-400">วันเริ่ม</th>
                    <th className="px-3 py-2 font-semibold text-gray-400">วันสิ้นสุด</th>
                    <th className="px-3 py-2 font-semibold text-gray-400">จำนวน (เต็มวัน/ครึ่งวัน)</th>
                    <th className="px-3 py-2 font-semibold text-gray-400">สถานะ</th>
                    <th className="px-3 py-2 font-semibold text-gray-400 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {myRows.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-3 py-2 text-gray-300">{resolveLeaveTypeLabel(row.leave_type)}</td>
                      <td className="px-3 py-2 text-gray-300">{formatThaiDate(row.start_date)}</td>
                      <td className="px-3 py-2 text-gray-300">{formatThaiDate(row.end_date)}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs">
                        {formatLeaveSlotLabel(row.start_date, row.end_date, row.start_time, row.end_time)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            row.status === 'approved'
                              ? 'text-emerald-400'
                              : row.status === 'rejected'
                                ? 'text-red-400'
                                : row.status === 'cancelled'
                                  ? 'text-gray-500'
                                  : row.status === 'cancel_requested'
                                    ? 'text-amber-300'
                                    : 'text-amber-400'
                          }
                        >
                          {row.status === 'approved'
                            ? 'อนุมัติ'
                            : row.status === 'rejected'
                              ? 'ไม่อนุมัติ'
                              : row.status === 'cancelled'
                                ? 'ยกเลิกแล้ว'
                                : row.status === 'cancel_requested'
                                  ? 'ขอยกเลิก (รออนุมัติ)'
                                  : 'รอตรวจ'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {(row.status === 'pending' || row.status === 'approved' || row.status === 'cancel_requested') && (
                          <button
                            type="button"
                            onClick={() => handleCancelRequest(row)}
                            disabled={cancellingId === row.id || row.status === 'cancel_requested'}
                            className="min-h-[40px] min-w-[72px] px-3 py-2 rounded-lg text-xs font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30 disabled:opacity-50 touch-manipulation"
                          >
                            {cancellingId === row.id
                              ? 'กำลังดำเนินการ...'
                              : row.status === 'approved'
                                ? 'ขอยกเลิก'
                                : row.status === 'cancel_requested'
                                  ? 'รออนุมัติ'
                                  : 'ยกเลิก'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {myTotalPages > 1 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                <span className="text-xs text-gray-500">แถว {(myPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(myPage * ROWS_PER_PAGE, myTotal)} จาก {myTotal} · หน้าแรก = ข้อมูลล่าสุด</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => setMyLeavePage((p) => Math.max(1, p - 1))} disabled={myPage <= 1}
                    className="px-2 py-1 rounded text-sm bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed">← ก่อนหน้า</button>
                  {Array.from({ length: myTotalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} type="button" onClick={() => setMyLeavePage(p)}
                      className={`px-2 py-1 rounded text-sm min-w-[1.75rem] ${myPage === p ? 'bg-yellow-400/20 text-yellow-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                      {p}
                    </button>
                  ))}
                  <button type="button" onClick={() => setMyLeavePage((p) => Math.min(myTotalPages, p + 1))} disabled={myPage >= myTotalPages}
                    className="px-2 py-1 rounded text-sm bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed">ถัดไป →</button>
                </div>
              </div>
            )}
            </>
            );
          })()}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
          <h3 className="font-bold text-gray-300 mb-2">ตารางรายเดือน — ใครลาบ้าง</h3>
          <p className="text-sm text-gray-500 mb-4">
            ปฏิทินรายเดือนแสดงการลาที่อนุมัติแล้ว — เลื่อนเดือนดูได้
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(calendarViewDate);
                  d.setMonth(d.getMonth() - 1);
                  d.setDate(1);
                  setCalendarViewDate(d);
                }}
                className="px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
              >
                ‹ เดือนก่อน
              </button>
              <span className="text-sm sm:text-base font-semibold text-white text-center min-w-[140px]">
                {calendarViewDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(calendarViewDate);
                  d.setMonth(d.getMonth() + 1);
                  d.setDate(1);
                  setCalendarViewDate(d);
                }}
                className="px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
              >
                เดือนถัดไป ›
              </button>
            </div>
            <div className="rounded-xl border border-white/10 overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-sm border-collapse min-w-[320px]">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    {WEEKDAY_LABELS.map((label) => (
                      <th key={label} className="py-1.5 sm:py-2 font-semibold text-gray-400 w-[14.28%] text-center min-w-[36px]">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }, (_, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-white/5 last:border-0">
                      {getMonthGrid(
                        calendarViewDate.getFullYear(),
                        calendarViewDate.getMonth() + 1
                      )
                        .slice(rowIndex * 7, rowIndex * 7 + 7)
                        .map(({ date, isCurrentMonth }) => {
                          const dayKey = toDateKey(date);
                          const dayLeaves = approvedLeaves.filter((row) => leaveOverlapsDay(row, dayKey));
                          const isToday = dayKey === toDateKey(new Date());
                          return (
                            <td
                              key={dayKey}
                              className={`align-top p-0.5 sm:p-1 min-h-[64px] sm:min-h-[88px] border-r border-white/5 last:border-r-0 text-xs sm:text-sm ${
                                isCurrentMonth ? 'text-gray-200' : 'text-gray-600'
                              } ${isToday ? 'bg-yellow-400/10 ring-1 ring-yellow-400/30' : ''}`}
                            >
                              <span className="inline-flex w-6 h-6 sm:w-7 sm:h-7 items-center justify-center rounded-full text-xs font-medium">
                                {date.getDate()}
                              </span>
                              <ul className="space-y-0.5 mt-0.5">
                                {dayLeaves.slice(0, 5).map((row) => {
                                  const label = resolveLeaveTypeLabel(row.leave_type);
                                  const timeRange = formatLeaveSlotLabel(row.start_date, row.end_date, row.start_time, row.end_time);
                                  const displayText = timeRange
                                    ? `${row.user_display_name || row.user_email} — ${label} ${timeRange}`
                                    : `${row.user_display_name || row.user_email} — ${label}`;
                                  return (
                                    <li
                                      key={row.id}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => {
                                        setSelectedDayLeaves(null);
                                        setSelectedDayKey(null);
                                        setSelectedLeave(row);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key !== 'Enter') return;
                                        setSelectedDayLeaves(null);
                                        setSelectedDayKey(null);
                                        setSelectedLeave(row);
                                      }}
                                      className="text-xs truncate px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-200 cursor-pointer hover:bg-emerald-500/30 transition-colors"
                                      title="คลิกดูรายละเอียด"
                                    >
                                      {displayText}
                                    </li>
                                  );
                                })}
                                {dayLeaves.length > 5 && (
                                  <li>
                                    <button
                                      type="button"
                                      className="text-xs text-gray-400 px-1 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
                                      onClick={() => {
                                        setSelectedLeave(null);
                                        setSelectedDayKey(dayKey);
                                        setSelectedDayLeaves(dayLeaves);
                                      }}
                                      title="คลิกดูรายละเอียดทั้งหมด"
                                    >
                                      +{dayLeaves.length - 5}
                                    </button>
                                  </li>
                                )}
                              </ul>
                            </td>
                          );
                        })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {user?.email != null && ADMIN_LEAVE_MANAGER_EMAILS.includes(user.email) && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-6">
            <Link
              to="/admin/leave/manage"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 transition-colors"
            >
              จัดการคำขอลา (อนุมัติ/ไม่อนุมัติ)
            </Link>
            <p className="text-xs text-gray-500 mt-2">เห็นได้เฉพาะผู้จัดการลา (pink, koy, tonji@minddojo.me)</p>
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
          <h3 className="font-bold text-gray-300 mb-2">รายการลาที่รออนุมัติ</h3>
          <p className="text-sm text-gray-500 mb-4">
            คำขอลาที่ยังไม่ได้รับการอนุมัติ
          </p>
          {leaveListLoading ? (
            <div className="min-h-[120px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-sm py-8">
              กำลังโหลด...
            </div>
          ) : leaveListError ? (
            <div className="min-h-[120px] rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col items-center justify-center text-red-400 text-sm py-8 px-4">
              <span className="font-medium mb-1">โหลดรายการลาไม่สำเร็จ</span>
              <span className="text-red-300/80 text-xs text-center">{leaveListError}</span>
              {(leaveListError.includes('approved_by_email') || leaveListError.includes('does not exist')) ? (
                <div className="mt-4 p-3 rounded-lg bg-black/30 text-left w-full max-w-md">
                  <p className="text-amber-200 text-xs font-medium mb-2">แก้ไข: ไปที่ Supabase → SQL Editor แล้วรัน:</p>
                  <code className="block text-xs text-gray-300 whitespace-pre overflow-x-auto">
{`alter table public.leave_requests add column if not exists approved_by_email text;
alter table public.leave_requests add column if not exists approved_at timestamptz;`}
                  </code>
                </div>
              ) : (
                <span className="text-gray-500 text-xs mt-2">กรุณาเข้าสู่ระบบใหม่อีกครั้ง</span>
              )}
            </div>
          ) : !leaveList.length ? (
            <div className="min-h-[120px] rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-gray-500 text-sm py-8 px-4">
              <span className="text-amber-400/80 mb-1">ยังไม่มีคำขอลาในระบบ</span>
              <span className="text-gray-500 text-xs">เมื่อมีคำขอลาที่รอตรวจ จะแสดงในตารางด้านล่าง</span>
            </div>
          ) : leaveList.filter((r) => r.status === 'pending').length === 0 ? (
            <div className="min-h-[120px] rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-gray-400 text-sm py-8 px-4">
              <span>ไม่มีคำขอลาที่รออนุมัติ</span>
              <span className="text-gray-500 text-xs mt-1">ขณะนี้ไม่มีคำขอที่รอการตรวจสอบ</span>
            </div>
          ) : (
            <>
            <p className="sm:hidden text-xs text-gray-500 mb-2">เลื่อนซ้าย-ขวาเพื่อดูตาราง</p>
            <div className="rounded-xl border border-white/10 overflow-x-auto -mx-1 sm:mx-0">
              <table className="w-full text-left text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">ผู้ลา</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">ประเภท</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">วันเริ่ม</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">วันสิ้นสุด</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveList.filter((r) => r.status === 'pending').map((row) => (
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-300 text-xs sm:text-sm">
                        {row.user_display_name || row.user_email}
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-300 text-xs sm:text-sm">
                        {resolveLeaveTypeLabel(row.leave_type)}
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-300 text-xs sm:text-sm">{formatThaiDate(row.start_date)}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-300 text-xs sm:text-sm">{formatThaiDate(row.end_date)}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                        <span className="text-amber-400">รอตรวจ</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
          <h3 className="font-bold text-gray-300 mb-2">รายการลาที่อนุมัติแล้วของทุกคน</h3>
          <p className="text-sm text-gray-500 mb-4">
            แสดงคำขอลาที่อนุมัติแล้ว ตอนยื่นคำขอลาตอนเวลาเท่าไร และเมลผู้อนุมัติ
          </p>
          {leaveListLoading ? (
            <div className="min-h-[100px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-sm">
              กำลังโหลด...
            </div>
          ) : (() => {
            const apprList = leaveList.filter((r) => r.status === 'approved');
            const apprTotal = apprList.length;
            const apprTotalPages = Math.max(1, Math.ceil(apprTotal / ROWS_PER_PAGE));
            const apprPage = Math.min(approvedPage, apprTotalPages);
            const apprRows = apprList.slice((apprPage - 1) * ROWS_PER_PAGE, apprPage * ROWS_PER_PAGE);
            return apprTotal === 0 ? (
              <div className="min-h-[100px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-sm">
                ยังไม่มีรายการที่อนุมัติแล้ว
              </div>
            ) : (
            <>
            <p className="sm:hidden text-xs text-gray-500 mb-2">เลื่อนซ้าย-ขวาเพื่อดูตาราง</p>
            <div className="rounded-xl border border-white/10 overflow-x-auto -mx-1 sm:mx-0">
              <table className="w-full text-left text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">ผู้ลา</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">ประเภท</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">วันเริ่ม</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">วันสิ้นสุด</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">ช่วงลา (เต็มวัน/ครึ่งวัน)</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">ยื่นคำขอลาตอน</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">อนุมัติโดย</th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">วันที่อนุมัติ</th>
                  </tr>
                </thead>
                <tbody>
                  {apprRows.map((row) => (
                      <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-300 text-xs sm:text-sm">
                          {row.user_display_name || row.user_email}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-300 text-xs sm:text-sm">
                          {resolveLeaveTypeLabel(row.leave_type)}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-300 text-xs sm:text-sm">{formatThaiDate(row.start_date)}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-300 text-xs sm:text-sm">{formatThaiDate(row.end_date)}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-400 text-xs sm:text-sm">
                          {formatLeaveSlotLabel(row.start_date, row.end_date, row.start_time, row.end_time) || '—'}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-400 text-xs sm:text-sm">
                          {formatSubmittedAt(row.created_at)}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-emerald-400/90 text-xs sm:text-sm">
                          {row.approved_by_email || '—'}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-400 text-xs sm:text-sm">
                          {formatDateTime24(row.approved_at)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {apprTotalPages > 1 && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                <span className="text-xs text-gray-500">แถว {(apprPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(apprPage * ROWS_PER_PAGE, apprTotal)} จาก {apprTotal} · หน้าแรก = ข้อมูลล่าสุด</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => setApprovedPage((p) => Math.max(1, p - 1))} disabled={apprPage <= 1}
                    className="px-2 py-1 rounded text-sm bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed">← ก่อนหน้า</button>
                  {Array.from({ length: apprTotalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} type="button" onClick={() => setApprovedPage(p)}
                      className={`px-2 py-1 rounded text-sm min-w-[1.75rem] ${apprPage === p ? 'bg-yellow-400/20 text-yellow-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                      {p}
                    </button>
                  ))}
                  <button type="button" onClick={() => setApprovedPage((p) => Math.min(apprTotalPages, p + 1))} disabled={apprPage >= apprTotalPages}
                    className="px-2 py-1 rounded text-sm bg-white/10 text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed">ถัดไป →</button>
                </div>
              </div>
            )}
            </>
            );
          })()}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
          <h3 className="font-bold text-gray-300 mb-2">รายการลาที่ขอยกเลิก</h3>
          <p className="text-xs text-gray-500 mb-3">แสดงรายการขอยกเลิก (รออนุมัติ/ยกเลิกแล้ว) ของทุกคน</p>
          <div className="rounded-xl border border-white/10 overflow-x-auto -mx-1 sm:mx-0">
            {cancelAuditsLoading ? (
              <div className="min-h-[70px] flex items-center justify-center text-gray-500 text-xs p-4">
                กำลังโหลด...
              </div>
            ) : (
              <table className="w-full text-left text-xs min-w-[880px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5">
                      <th className="px-2 py-1.5 sm:px-2 sm:py-2 font-semibold text-gray-400">ประเภท</th>
                      <th className="px-2 py-1.5 sm:px-2 sm:py-2 font-semibold text-gray-400">วันเริ่ม</th>
                      <th className="px-2 py-1.5 sm:px-2 sm:py-2 font-semibold text-gray-400">วันสิ้นสุด</th>
                      <th className="px-2 py-1.5 sm:px-2 sm:py-2 font-semibold text-gray-400">ช่วงเวลา</th>
                      <th className="px-2 py-1.5 sm:px-2 sm:py-2 font-semibold text-gray-400">เหตุผลที่ขอยกเลิก</th>
                      <th className="px-2 py-1.5 sm:px-2 sm:py-2 font-semibold text-gray-400">สถานะ</th>
                      <th className="px-2 py-1.5 sm:px-2 sm:py-2 font-semibold text-gray-400">ผู้อนุมัติยกเลิก</th>
                      <th className="px-2 py-1.5 sm:px-2 sm:py-2 font-semibold text-gray-400">วันที่อนุมัติ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cancelAudits ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-2 py-3 text-center text-gray-500">
                          ยังไม่มีรายการขอยกเลิก
                        </td>
                      </tr>
                    ) : (
                      (cancelAudits ?? []).map((row) => {
                        const statusText =
                          row.status === 'cancel_requested'
                            ? 'ขอยกเลิก (รออนุมัติ)'
                            : row.status === 'cancelled'
                              ? 'ยกเลิกแล้ว'
                              : 'ไม่อนุมัติยกเลิก';
                        const statusClass =
                          row.status === 'cancel_requested' ? 'text-amber-300' : 'text-gray-400';
                        return (
                          <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="px-2 py-1.5 sm:px-2 sm:py-2 text-gray-300">
                              {resolveLeaveTypeLabel(row.leave_type)}
                            </td>
                            <td className="px-2 py-1.5 sm:px-2 sm:py-2 text-gray-300">
                              {formatThaiDate(row.start_date)}
                            </td>
                            <td className="px-2 py-1.5 sm:px-2 sm:py-2 text-gray-300">
                              {formatThaiDate(row.end_date)}
                            </td>
                            <td className="px-2 py-1.5 sm:px-2 sm:py-2 text-gray-400">
                              {formatLeaveSlotLabel(row.start_date, row.end_date, row.start_time, row.end_time) || '—'}
                            </td>
                            <td
                              className="px-2 py-1.5 sm:px-2 sm:py-2 text-gray-400 max-w-[180px] truncate"
                              title={row.cancel_reason || ''}
                            >
                              {row.cancel_reason || '—'}
                            </td>
                            <td className={`px-2 py-1.5 sm:px-2 sm:py-2 ${statusClass}`}>
                              {statusText}
                            </td>
                            <td className="px-2 py-1.5 sm:px-2 sm:py-2 text-emerald-400/90">
                              {row.decided_by_email || '—'}
                            </td>
                            <td className="px-2 py-1.5 sm:px-2 sm:py-2 text-gray-400">
                              {row.decided_at ? formatDateTime24(row.decided_at) : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
            )}
          </div>
        </section>
      </main>

      {/* ป๊อปอัปรายละเอียดการลารายวัน (เมื่อคนลามากกว่า 5 คน) */}
      {selectedDayLeaves && selectedDayKey && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => {
            setSelectedDayLeaves(null);
            setSelectedDayKey(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-day-detail-title"
        >
          <div
            className="rounded-t-2xl sm:rounded-2xl border border-white/20 bg-neutral-900 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 id="leave-day-detail-title" className="text-lg font-bold text-yellow-400">
                รายละเอียดการลารายวัน
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedDayLeaves(null);
                  setSelectedDayKey(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-gray-200 hover:bg-white/15 border border-white/10"
              >
                ปิด
              </button>
            </div>

            <p className="text-sm text-gray-300">
              วันที่ {formatThaiDate(selectedDayKey)}
              <span className="text-gray-500"> · ทั้งหมด {selectedDayLeaves.length} รายการ</span>
            </p>

            <div className="rounded-xl border border-white/10 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10">
                    <th className="px-3 py-2 text-left text-gray-400 font-semibold">ผู้ลา</th>
                    <th className="px-3 py-2 text-left text-gray-400 font-semibold">ประเภท</th>
                    <th className="px-3 py-2 text-left text-gray-400 font-semibold">ช่วงเวลา</th>
                    <th className="px-3 py-2 text-left text-gray-400 font-semibold">เหตุผล (ถ้ามี)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDayLeaves.map((row) => {
                    const typeLabel = resolveLeaveTypeLabel(row.leave_type);
                    const timeRange = formatLeaveSlotLabel(row.start_date, row.end_date, row.start_time, row.end_time);
                    return (
                      <tr key={row.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5">
                        <td className="px-3 py-2 text-gray-300">{row.user_display_name || row.user_email}</td>
                        <td className="px-3 py-2 text-gray-300">{typeLabel}</td>
                        <td className="px-3 py-2 text-gray-300">{timeRange || '—'}</td>
                        <td className="px-3 py-2 text-gray-400 max-w-[260px] truncate" title={row.reason || ''}>
                          {row.reason || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ป๊อปอัปรายละเอียดการลา */}
      {selectedLeave && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          onClick={() => setSelectedLeave(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-detail-title"
        >
          <div
            className="rounded-t-2xl sm:rounded-2xl border border-white/20 bg-neutral-900 shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="leave-detail-title" className="text-lg font-bold text-yellow-400">
              รายละเอียดการลา
            </h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">ชื่อ-นามสกุล</dt>
                <dd className="text-white font-medium">{selectedLeave.user_display_name || selectedLeave.user_email}</dd>
              </div>
              <div>
                <dt className="text-gray-500">อีเมล</dt>
                <dd className="text-gray-300">{selectedLeave.user_email}</dd>
              </div>
              <div>
                <dt className="text-gray-500">ประเภทการลา</dt>
                <dd className="text-gray-300">
                  {resolveLeaveTypeLabel(selectedLeave.leave_type)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">วันที่เริ่ม</dt>
                <dd className="text-gray-300">{formatThaiDate(selectedLeave.start_date)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">วันที่สิ้นสุด</dt>
                <dd className="text-gray-300">{formatThaiDate(selectedLeave.end_date)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">ช่วงลา (เต็มวัน / ครึ่งวัน)</dt>
                <dd className="text-gray-300">
                  {formatLeaveSlotLabel(
                    selectedLeave.start_date,
                    selectedLeave.end_date,
                    selectedLeave.start_time,
                    selectedLeave.end_time,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">ยื่นคำขอลาตอน</dt>
                <dd className="text-gray-300">{formatSubmittedAt(selectedLeave.created_at)}</dd>
              </div>
              {selectedLeave.reason && (
                <div>
                  <dt className="text-gray-500">เหตุผล</dt>
                  <dd className="text-gray-300 whitespace-pre-wrap">{selectedLeave.reason}</dd>
                </div>
              )}
                <div>
                <dt className="text-gray-500">สถานะ</dt>
                <dd>
                  <span
                    className={
                      selectedLeave.status === 'approved'
                        ? 'text-emerald-400'
                        : selectedLeave.status === 'rejected'
                          ? 'text-red-400'
                          : selectedLeave.status === 'cancelled'
                            ? 'text-gray-500'
                            : selectedLeave.status === 'cancel_requested'
                              ? 'text-amber-300'
                              : 'text-amber-400'
                    }
                  >
                    {selectedLeave.status === 'approved'
                      ? 'อนุมัติ'
                      : selectedLeave.status === 'rejected'
                        ? 'ไม่อนุมัติ'
                        : selectedLeave.status === 'cancelled'
                          ? 'ยกเลิกแล้ว'
                          : selectedLeave.status === 'cancel_requested'
                            ? 'ขอยกเลิก (รออนุมัติ)'
                          : 'รอตรวจ'}
                  </span>
                </dd>
              </div>
              {selectedLeave.status === 'approved' && (selectedLeave.approved_by_email || selectedLeave.approved_at) && (
                <>
                  {selectedLeave.approved_by_email && (
                    <div>
                      <dt className="text-gray-500">อนุมัติโดย</dt>
                      <dd className="text-emerald-400/90">{selectedLeave.approved_by_email}</dd>
                    </div>
                  )}
                  {selectedLeave.approved_at && (
                    <div>
                      <dt className="text-gray-500">วันที่อนุมัติ</dt>
                      <dd className="text-gray-300">{formatDateTime24(selectedLeave.approved_at)}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="min-h-[44px] min-w-[80px] px-4 py-3 rounded-xl font-medium bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-colors touch-manipulation"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeavePage;
