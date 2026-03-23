import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logoutAdmin } from '../lib/auth';

const LEAVE_TYPES = [
  { id: 'personal', label: 'ลากิจ' },
  { id: 'sick', label: 'ลาป่วย' },
  { id: 'wfh', label: 'Work from Home' },
  { id: 'vacation', label: 'ลาพักร้อน' },
  { id: 'unpaid', label: 'ลาไม่รับเงินเดือน' },
] as const;

const EMPLOYEE_DEPT_IDS = ['it', 'trainer', 'ceo', 'sales', 'production', 'admin'] as const;
type EmployeeDeptId = typeof EMPLOYEE_DEPT_IDS[number];

const EMPLOYEE_DEPT_LABELS: Record<EmployeeDeptId, string> = {
  it: 'IT',
  trainer: 'วิทยากร',
  ceo: 'CEO',
  sales: 'Sales',
  production: 'Production',
  admin: 'Admin',
};

// หมายเหตุ: ยังไม่มีข้อมูลว่าแต่ละคนอยู่แผนกไหนแน่
// ดังนั้นใส่ให้ทั้งหมดเป็นแผนก `admin` ก่อน แล้วค่อยแก้ mapping ตามที่คุณแจ้ง
const EMPLOYEES: Array<{ name: string; phone: string; dept: EmployeeDeptId }> = [
  { name: 'นาย สิรภพ สตานิคม', phone: '0957980871', dept: 'it' },
  { name: 'นาย ศราวุธ ปื่นทอง', phone: '0955188408', dept: 'it' },
  { name: 'นาย ธนโชติ มีกังวาล', phone: '0873648269', dept: 'trainer' },
  { name: 'นายวีรวัฒน์ พากเพียรกิจ', phone: '0951959989', dept: 'trainer' },
  { name: 'นายอุประจิตร รวมทรัพย์', phone: '0909618529', dept: 'trainer' },
  { name: 'นายพีรวิชญ์ พูลขวัญ', phone: '0968781140', dept: 'admin' },
  { name: 'นางสาวนิรชา ไม้งาม', phone: '0910966938', dept: 'sales' },
  { name: 'นาวสาวมนิดา พิมกา', phone: '085-095-6965', dept: 'admin' },
  { name: 'Mr. Songpathara Snidvongs', phone: '0832744456', dept: 'ceo' },
  { name: 'นายบรรพต บุญธรรม', phone: '0890399444', dept: 'trainer' },
  { name: 'นางสาวสิริมา เงินอนันต์', phone: '0889647826', dept: 'sales' },
  { name: 'คุณนาย ชนิสรา เมฆประดับ', phone: '0971877766', dept: 'sales' },
  { name: 'นางสาวชิษณุชา เศรษฐธัญกิจ', phone: '0955914958', dept: 'production' },
  { name: 'นางสาวธรินทร์ญา กรแวววงศ์เจริญ', phone: '0914088708', dept: 'admin' },
  { name: 'นางมาสเมษา สนิทวงศ์ ณ อยุธยา', phone: '0894479878', dept: 'ceo' },
  { name: 'นางสาว พริมพิชา ธัญญเจริญ', phone: '0802357570', dept: 'it' },
  { name: 'ว่าที่ ร.ต.จีรวัฒน์ เยาวนิช', phone: '0922720923', dept: 'trainer' },
];

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
  return d.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'short' });
}

/** แสดงวัน + ชม. โดย 8 ชม. ถือเป็น 1 วัน (เช่น 8 ชม. แสดงเป็น "1 วัน") */
function formatDaysHours(days: number, hours: number): string {
  const d = Math.floor(Number(days ?? 0));
  const h = Number(hours ?? 0);
  const totalHours = d * 8 + h;
  const displayDays = Math.floor(totalHours / 8);
  const displayHours = Math.round((totalHours % 8) * 100) / 100;
  if (displayHours > 0) return `${displayDays} วัน ${displayHours} ชม.`;
  return `${displayDays} วัน`;
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

/** เวลาแบบไทย 24 ชม. (เช่น 13.00 หลังเที่ยง) */
function formatTime24(th: string | null | undefined): string {
  if (!th) return '—';
  const s = String(th).trim().slice(0, 5); // HH:mm
  if (!s) return '—';
  const [h, m] = s.split(':').map(Number);
  if (Number.isNaN(h)) return s;
  const mm = Number.isNaN(m) ? 0 : m;
  return `${h}.${String(mm).padStart(2, '0')}`;
}

/** แสดงช่วงเวลาลา (ลา 1 วัน) เป็น 9.00–17.00 (เวลาไทย 24 ชม.) */
function formatLeaveTimeRange(startTime: string | null | undefined, endTime: string | null | undefined): string {
  if (!startTime && !endTime) return '';
  return `${formatTime24(startTime)}–${formatTime24(endTime)}`;
}

/** แสดงช่วงเวลา + จำนวนชั่วโมงเมื่อลาไม่ถึง 1 วัน (รายชั่วโมง) */
function formatLeaveTimeRangeWithHours(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  startDate?: string,
  endDate?: string
): string {
  const range = formatLeaveTimeRange(startTime, endTime);
  if (!range) return '';
  if (startDate && endDate && startDate === endDate) {
    const hrs = hoursBetween(startTime, endTime);
    if (hrs != null) return `${range} (${hrs} ชั่วโมง)`;
  }
  return range;
}

/** คำนวณจำนวนชั่วโมงระหว่างเวลา (รับ HH:mm หรือ HH:mm:ss) */
function hoursBetween(startTime: string | null | undefined, endTime: string | null | undefined): number | null {
  if (!startTime || !endTime) return null;
  const parse = (t: string) => {
    const parts = String(t).trim().split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] ? parseInt(parts[1], 10) : 0;
    return (Number.isNaN(h) ? 0 : h) + (Number.isNaN(m) ? 0 : m) / 60;
  };
  const start = parse(startTime);
  const end = parse(endTime);
  if (end < start) return null; // ข้ามวันไม่นับ
  return Math.round((end - start) * 100) / 100;
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

/** ช่วงเวลา 9.00–17.00 น. ทุก 30 นาที สำหรับ dropdown (ค่าเป็น HH:mm, แสดงเป็น 24 ชม.) */
const WORK_TIME_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  for (let h = 9; h <= 17; h++) {
    for (const m of [0, 30]) {
      if (h === 17 && m === 30) break;
      opts.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return opts;
})();

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
  const [employeesOpen, setEmployeesOpen] = useState(false);
  const [employeeDeptOpen, setEmployeeDeptOpen] = useState<Record<EmployeeDeptId, boolean>>(() => ({
    it: false,
    trainer: false,
    ceo: false,
    sales: false,
    production: false,
    admin: false,
  }));
  const [leaveType, setLeaveType] = useState<string>(LEAVE_TYPES[0].id);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
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
      .select('id, user_email, user_display_name, leave_type, start_date, end_date, start_time, end_time, reason, cancel_reason, cancel_decided_by_email, cancel_decided_at, cancel_decision, status, approved_by_email, approved_at, created_at')
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
      .select('id, user_email, user_display_name, leave_type, start_date, end_date, start_time, end_time, reason, cancel_reason, cancel_decided_by_email, cancel_decided_at, cancel_decision, status, approved_by_email, approved_at, created_at')
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
      .select('id, user_email, user_display_name, leave_type, start_date, end_date, start_time, end_time, reason, status, approved_by_email, approved_at, created_at')
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

    // กันส่งคำขอลาของประเภทที่คงเหลือ 0 แล้ว
    if (leaveBalance) {
      const remaining = getLeaveRemainingHoursEquivalent(leaveType);
      if (remaining <= 0) {
        const label = LEAVE_TYPES.find((t) => t.id === leaveType)?.label ?? leaveType;
        setSubmitError(`${label} คงเหลือ 0 แล้ว กรุณาเลือกประเภทอื่น`);
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
    if (isOneDay) {
      const fromTime = startTime || '09:00';
      const toTime = endTime || '17:00';
      payload.start_time = fromTime.length === 5 ? `${fromTime}:00` : fromTime;
      payload.end_time = toTime.length === 5 ? `${toTime}:00` : toTime;
    }
    const { error } = await supabase.from('leave_requests').insert(payload);
    setLoading(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    setSubmitted(true);
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
    setReason('');
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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 px-4 sm:px-6 py-4 sm:py-6 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-yellow-400 rounded-lg flex items-center justify-center glow-yellow">
              <span className="text-black font-black text-lg sm:text-xl">M</span>
            </div>
            <span className="text-base sm:text-xl font-bold tracking-tighter">MindDoJo</span>
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
            ลากิจ {formatDaysHours(leaveBalance.personal_remaining, leaveBalance.hours_personal_remaining ?? 0)} · ลาป่วย {formatDaysHours(leaveBalance.sick_remaining, leaveBalance.hours_sick_remaining ?? 0)} · ลาพักร้อน {formatDaysHours(leaveBalance.annual_remaining, leaveBalance.hours_annual_remaining ?? 0)} ·{' '}
            WFH 1 วัน/เดือน (เดือนนี้{wfhUsedThisMonth ? 'ใช้แล้ว — ลาอีกได้เดือนถัดไป' : 'ยังใช้ได้'}) · ลาไม่รับเงิน {formatDaysHours(leaveBalance.unpaid_remaining, leaveBalance.hours_unpaid_remaining ?? 0)}
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

        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          <button
            type="button"
            onClick={() => setEmployeesOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-semibold text-gray-200 truncate">รายชื่อพนักงาน</span>
              <span className="text-xs text-gray-500 whitespace-nowrap">({EMPLOYEES.length} คน)</span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${employeesOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {employeesOpen && (
            <div className="px-4 pb-4 pt-0 border-t border-white/10">
              <p className="text-xs text-gray-500 mt-3 mb-3">อ้างอิงสำหรับยื่นคำขอลา (ชื่อ-เบอร์โทร)</p>

              <div className="space-y-2">
                {EMPLOYEE_DEPT_IDS.map((deptId) => {
                  const deptEmployees = EMPLOYEES.filter((e) => e.dept === deptId);
                  const isOpen = employeeDeptOpen[deptId];
                  return (
                    <div key={deptId} className="rounded-xl border border-white/10 bg-black/10 overflow-hidden">
                      <button
                        type="button"
                        onClick={() =>
                          setEmployeeDeptOpen((prev) => ({
                            ...prev,
                            [deptId]: !prev[deptId],
                          }))
                        }
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-sm font-bold text-gray-200 truncate">{EMPLOYEE_DEPT_LABELS[deptId]}</span>
                          <span className="text-xs text-gray-500 whitespace-nowrap">({deptEmployees.length} คน)</span>
                        </div>
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isOpen && (
                        <div className="px-3 pb-3 pt-0 max-h-44 overflow-y-auto pr-1">
                          {deptEmployees.length === 0 ? (
                            <div className="text-xs text-gray-500 px-2 py-2">ยังไม่มีข้อมูล</div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {deptEmployees.map((e) => (
                                <div
                                  key={e.name}
                                  className="flex items-start justify-between gap-3 rounded-lg bg-black/20 border border-white/10 px-3 py-2"
                                >
                                  <span className="text-sm text-gray-200 font-medium leading-snug">{e.name}</span>
                                  <span className="text-xs sm:text-sm text-gray-400 font-mono break-all text-right w-[9.5rem]">
                                    {e.phone}
                                  </span>
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
          <p className="text-xs text-gray-500">เวลาทำงาน จันทร์–ศุกร์ 9.00–17.00 น. หยุดเสาร์–อาทิตย์ (ห้ามเลือกวันเสาร์และอาทิตย์)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
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
                    if (!startTime && !endTime) {
                      setStartTime('09:00');
                      setEndTime('17:00');
                    }
                  } else if (v && endDate && v === endDate && !startTime && !endTime) {
                    setStartTime('09:00');
                    setEndTime('17:00');
                  }
                }}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-sm focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
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
                  if (v && startDate && v === startDate && !startTime && !endTime) {
                    setStartTime('09:00');
                    setEndTime('17:00');
                  }
                }}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-sm focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>
          {weekendError && <p className="text-sm text-amber-400">{weekendError}</p>}
          {startDate && endDate && startDate === endDate && !dateRangeIncludesWeekend(startDate, endDate) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">ลา 1 วัน — จากเวลา (เลือกได้ 9.00–17.00 น.)</label>
                <select
                  value={startTime || '09:00'}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-sm focus:outline-none focus:border-yellow-400"
                >
                  {WORK_TIME_OPTIONS.map((t) => (
                    <option key={t} value={t} className="bg-neutral-900 text-white">
                      {t.replace(':', '.')} น.
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">ถึงเวลา (เลือกได้ 9.00–17.00 น.)</label>
                <select
                  value={endTime || '17:00'}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-sm focus:outline-none focus:border-yellow-400"
                >
                  {WORK_TIME_OPTIONS.map((t) => (
                    <option key={t} value={t} className="bg-neutral-900 text-white">
                      {t.replace(':', '.')} น.
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 col-span-full">รูปแบบเวลา 24 ชม. (09.00–17.00 น.) ค่าเริ่มต้น 9.00–17.00 น. ลาไม่ถึง 1 วันจะนับเป็นรายชั่วโมง</p>
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
                    <th className="px-3 py-2 font-semibold text-gray-400">จำนวนชั่วโมงที่ลา</th>
                    <th className="px-3 py-2 font-semibold text-gray-400">สถานะ</th>
                    <th className="px-3 py-2 font-semibold text-gray-400 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {myRows.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-3 py-2 text-gray-300">{LEAVE_TYPES.find((t) => t.id === row.leave_type)?.label ?? row.leave_type}</td>
                      <td className="px-3 py-2 text-gray-300">{formatThaiDate(row.start_date)}</td>
                      <td className="px-3 py-2 text-gray-300">{formatThaiDate(row.end_date)}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs">
                        {row.start_date === row.end_date && row.start_time && row.end_time ? (
                          (() => {
                            const hrs = hoursBetween(row.start_time, row.end_time) ?? 0;
                            // 8 ชั่วโมง = 1 วันเต็มแล้ว ไม่ต้องโชว์เป็นชั่วโมง
                            if (Math.round(hrs * 100) / 100 >= 8) return '—';
                            return `${hrs} ชั่วโมง`;
                          })()
                        ) : (
                          '—'
                        )}
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
                                  const label = LEAVE_TYPES.find((t) => t.id === row.leave_type)?.label ?? row.leave_type;
                                  const timeRange = formatLeaveTimeRangeWithHours(row.start_time, row.end_time, row.start_date, row.end_date);
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
                        {LEAVE_TYPES.find((t) => t.id === row.leave_type)?.label ?? row.leave_type}
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
                    <th className="px-3 sm:px-4 py-2 sm:py-3 font-semibold text-gray-400">ช่วงเวลา (ลา 1 วัน)</th>
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
                          {LEAVE_TYPES.find((t) => t.id === row.leave_type)?.label ?? row.leave_type}
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-300 text-xs sm:text-sm">{formatThaiDate(row.start_date)}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-300 text-xs sm:text-sm">{formatThaiDate(row.end_date)}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-gray-400 text-xs sm:text-sm">
                          {formatLeaveTimeRangeWithHours(row.start_time, row.end_time, row.start_date, row.end_date) || '—'}
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
                              {LEAVE_TYPES.find((t) => t.id === row.leave_type)?.label ?? row.leave_type}
                            </td>
                            <td className="px-2 py-1.5 sm:px-2 sm:py-2 text-gray-300">
                              {formatThaiDate(row.start_date)}
                            </td>
                            <td className="px-2 py-1.5 sm:px-2 sm:py-2 text-gray-300">
                              {formatThaiDate(row.end_date)}
                            </td>
                            <td className="px-2 py-1.5 sm:px-2 sm:py-2 text-gray-400">
                              {formatLeaveTimeRangeWithHours(row.start_time, row.end_time, row.start_date, row.end_date) || '—'}
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
                    const typeLabel = LEAVE_TYPES.find((t) => t.id === row.leave_type)?.label ?? row.leave_type;
                    const timeRange = formatLeaveTimeRangeWithHours(
                      row.start_time,
                      row.end_time,
                      row.start_date,
                      row.end_date
                    );
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
                  {LEAVE_TYPES.find((t) => t.id === selectedLeave.leave_type)?.label ?? selectedLeave.leave_type}
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
              {(selectedLeave.start_time || selectedLeave.end_time) && (
                <div>
                  <dt className="text-gray-500">ช่วงเวลา (ลา 1 วัน) · เวลาไทย 24 ชม. · นับรายชั่วโมงถ้าไม่ถึง 1 วัน</dt>
                  <dd className="text-gray-300">
                    {formatLeaveTimeRangeWithHours(
                      selectedLeave.start_time,
                      selectedLeave.end_time,
                      selectedLeave.start_date,
                      selectedLeave.end_date
                    )}
                  </dd>
                </div>
              )}
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
