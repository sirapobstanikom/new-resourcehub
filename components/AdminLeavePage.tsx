import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase, isSupabaseConfigured, supabaseFunctionsUrl, supabaseAnonKey } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const SUPABASE_URL = supabaseFunctionsUrl;

type CalendarEvent = { id: string; summary: string; start?: string; end?: string; status?: string };

const LEAVE_TYPES = [
  { id: 'personal', label: 'ลากิจ' },
  { id: 'sick', label: 'ลาป่วย' },
  { id: 'wfh', label: 'Work from Home' },
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

function formatCalendarDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' });
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

/** ตรวจว่า event ทับกับวันนี้หรือไม่ (ใช้ date เทียบตาม Asia/Bangkok, end เป็น exclusive ตาม Google) */
function eventOverlapsDay(e: CalendarEvent, dayKey: string): boolean {
  const start = e.start ? e.start.slice(0, 10) : '';
  const end = e.end ? e.end.slice(0, 10) : '';
  if (!start) return false;
  if (!end || end === start) return start === dayKey;
  return dayKey >= start && dayKey < end;
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

const AdminLeavePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, session } = useAuth();
  const [leaveType, setLeaveType] = useState<string>(LEAVE_TYPES[0].id);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [leaveList, setLeaveList] = useState<LeaveRequestRow[]>([]);
  const [leaveListLoading, setLeaveListLoading] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [sharedCalendarEvents, setSharedCalendarEvents] = useState<CalendarEvent[]>([]);
  const [sharedCalendarLoading, setSharedCalendarLoading] = useState(false);

  useEffect(() => {
    const connected = searchParams.get('calendar');
    const err = searchParams.get('error');
    const detail = searchParams.get('detail');
    if (connected === 'connected') {
      setCalendarMessage('เชื่อมต่อ Google Calendar แล้ว');
      setCalendarConnected(true);
      setSearchParams({}, { replace: true });
    }
    if (err) {
      let msg = err === 'no_refresh_token' ? 'ไม่ได้รับ refresh token จาก Google' : `เกิดข้อผิดพลาด: ${err}`;
      if (err === 'db_failed' && detail) msg += ` (${decodeURIComponent(detail)})`;
      setCalendarMessage(msg);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!session?.access_token || !SUPABASE_URL) return;
    const y = calendarViewDate.getFullYear();
    const m = calendarViewDate.getMonth() + 1;
    const timeMin = new Date(y, m - 1, 1).toISOString();
    const timeMax = new Date(y, m, 1).toISOString();
    setCalendarLoading(true);
    fetch(
      `${SUPABASE_URL}/functions/v1/get-calendar-events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    )
      .then((r) => r.json())
      .then((data) => {
        setCalendarLoading(false);
        if (data.events) {
          setCalendarEvents(data.events);
          if (!data.error) setCalendarConnected(true);
        }
      })
      .catch(() => setCalendarLoading(false));
  }, [session?.access_token, calendarViewDate.getFullYear(), calendarViewDate.getMonth()]);

  useEffect(() => {
    if (!session?.access_token || !SUPABASE_URL) return;
    const y = calendarViewDate.getFullYear();
    const m = calendarViewDate.getMonth() + 1;
    const timeMin = new Date(y, m - 1, 1).toISOString();
    const timeMax = new Date(y, m, 1).toISOString();
    setSharedCalendarLoading(true);
    fetch(
      `${SUPABASE_URL}/functions/v1/get-shared-calendar-events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } }
    )
      .then((r) => r.json())
      .then((data) => {
        setSharedCalendarLoading(false);
        if (data.events) setSharedCalendarEvents(data.events);
      })
      .catch(() => setSharedCalendarLoading(false));
  }, [session?.access_token, calendarViewDate.getFullYear(), calendarViewDate.getMonth()]);

  const startCalendarOAuth = () => {
    if (!user?.id || !SUPABASE_URL) return;
    if (!supabaseAnonKey) {
      setCalendarMessage('ไม่พบ API key ใน .env กรุณาตั้ง VITE_SUPABASE_ANON_KEY แล้วรีสตาร์ท dev server');
      return;
    }
    const returnUrl = `${window.location.origin}/admin/leave`;
    const state = btoa(JSON.stringify({ userId: user.id, returnUrl }));
    const params = new URLSearchParams({ state, apikey: supabaseAnonKey });
    window.location.href = `${SUPABASE_URL}/functions/v1/google-calendar-auth?${params.toString()}`;
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLeaveListLoading(false);
      return;
    }
    supabase
      .from('leave_requests')
      .select('id, user_email, user_display_name, leave_type, start_date, end_date, reason, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        setLeaveListLoading(false);
        if (error) return;
        setLeaveList((data as LeaveRequestRow[]) ?? []);
      });
  }, [submitted]);

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
    setLoading(true);
    const displayName = user.user_metadata?.full_name ?? user.email.split('@')[0];
    const { error } = await supabase.from('leave_requests').insert({
      user_id: user.id,
      user_email: user.email,
      user_display_name: displayName,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim() || null,
      status: 'pending',
    });
    setLoading(false);
    if (error) {
      setSubmitError(error.message);
      return;
    }
    setSubmitted(true);
    setStartDate('');
    setEndDate('');
    setReason('');

    // ยังไม่ส่งการลาลง Google Calendar (รอสิทธิ์ Make changes to events)
    // if (SUPABASE_URL && session?.access_token) {
    //   fetch(`${SUPABASE_URL}/functions/v1/create-leave-calendar-event`, { ... });
    // }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="flex justify-between items-center px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center glow-yellow">
              <span className="text-black font-black text-xl">M</span>
            </div>
            <span className="text-xl font-bold tracking-tighter">MindDoJo</span>
          </Link>
          <span className="text-gray-500">|</span>
          <span className="text-yellow-400 font-semibold">ระบบลา MindDojo</span>
        </div>
        <Link
          to="/"
          className="px-4 py-2 rounded-xl font-medium bg-white/10 text-white hover:bg-white/20 border border-white/10"
        >
          กลับหน้าหลัก
        </Link>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8 space-y-10">
        <h2 className="text-xl font-bold text-gray-300">ยื่นคำขอลา</h2>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">ประเภทการลา</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-sm focus:outline-none focus:border-yellow-400"
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t.id} value={t.id} className="bg-neutral-900 text-white">
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">วันเริ่มต้น</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-sm focus:outline-none focus:border-yellow-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">วันสิ้นสุด</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white text-sm focus:outline-none focus:border-yellow-400"
              />
            </div>
          </div>
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
            className="px-6 py-3 rounded-xl font-medium bg-yellow-400 text-black hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'กำลังส่ง...' : 'ส่งคำขอลา'}
          </button>
          {submitted && !submitError && (
            <p className="text-sm text-emerald-400">ส่งคำขอลาแล้ว บันทึกในระบบเรียบร้อย (เชื่อม Google Calendar ได้ในขั้นตอนถัดไป)</p>
          )}
        </form>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="font-bold text-gray-300 mb-2">ตารางงานรวม (Google Calendar)</h3>
          <p className="text-sm text-gray-500 mb-4">
            ปฏิทินรายเดือนรวมทั้ง <strong className="text-white/90">ตารางงานของฉัน</strong> และ{' '}
            <strong className="text-amber-400/90">ปฏิทินรวม phet@minddojo.me (Admin &amp; Production &amp; Marketing)</strong>{' '}
            — เลื่อนเดือนดูได้ครบ
          </p>
          {calendarMessage && (
            <p className="text-sm text-amber-400 mb-3">{calendarMessage}</p>
          )}
          {!calendarConnected && !calendarLoading && (
            <button
              type="button"
              onClick={startCalendarOAuth}
              className="mb-4 px-4 py-2 rounded-xl text-sm font-medium bg-white/10 text-white hover:bg-white/20 border border-white/20"
            >
              เชื่อมต่อ Google Calendar
            </button>
          )}
          {calendarLoading || sharedCalendarLoading ? (
            <div className="min-h-[320px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-sm">
              กำลังโหลดปฏิทิน...
            </div>
          ) : calendarConnected || calendarLoading || sharedCalendarLoading || calendarEvents.length > 0 || sharedCalendarEvents.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(calendarViewDate);
                    d.setMonth(d.getMonth() - 1);
                    d.setDate(1);
                    setCalendarViewDate(d);
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
                >
                  ‹ เดือนก่อน
                </button>
                <span className="text-base font-semibold text-white">
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
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
                >
                  เดือนถัดไป ›
                </button>
              </div>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      {WEEKDAY_LABELS.map((label) => (
                        <th key={label} className="py-2 font-semibold text-gray-400 w-[14.28%]">
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
                            const myDayEvents = calendarEvents.filter((e) => eventOverlapsDay(e, dayKey));
                            const sharedDayEvents = sharedCalendarEvents.filter((e) => eventOverlapsDay(e, dayKey));
                            const dayEventsWithSource: { e: CalendarEvent; isShared: boolean }[] = [
                              ...myDayEvents.map((e) => ({ e, isShared: false })),
                              ...sharedDayEvents.map((e) => ({ e, isShared: true })),
                            ];
                            const isToday =
                              dayKey ===
                              toDateKey(new Date());
                            return (
                              <td
                                key={dayKey}
                                className={`align-top p-1 min-h-[88px] border-r border-white/5 last:border-r-0 ${
                                  isCurrentMonth ? 'text-gray-200' : 'text-gray-600'
                                } ${isToday ? 'bg-yellow-400/10 ring-1 ring-yellow-400/30' : ''}`}
                              >
                                <span className="inline-block w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium">
                                  {date.getDate()}
                                </span>
                                <ul className="space-y-0.5 mt-0.5">
                                  {dayEventsWithSource.slice(0, 6).map(({ e, isShared }) => (
                                    <li
                                      key={isShared ? `shared-${e.id}` : e.id}
                                      className={`text-xs truncate px-1 py-0.5 rounded text-gray-300 ${
                                        isShared ? 'bg-amber-500/20 text-amber-200' : 'bg-white/10'
                                      }`}
                                      title={`${e.summary} ${formatCalendarDate(e.start)} – ${formatCalendarDate(e.end)}${isShared ? ' (ปฏิทินรวม phet@minddojo.me)' : ''}`}
                                    >
                                      {e.summary}
                                    </li>
                                  ))}
                                  {dayEventsWithSource.length > 6 && (
                                    <li className="text-xs text-gray-500 px-1">+{dayEventsWithSource.length - 6}</li>
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
              <p className="text-xs text-gray-500 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-white/20" /> ตารางงานของฉัน
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500/30" /> ปฏิทินรวม phet@minddojo.me
                </span>
              </p>
            </div>
          ) : session?.access_token ? (
            <div className="min-h-[120px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-sm">
              กดปุ่มด้านบนเพื่อเชื่อมต่อ Google Calendar
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="font-bold text-gray-300 mb-2">ใครลาบ้าง</h3>
          <p className="text-sm text-gray-500 mb-4">
            รายการคำขอลาจากระบบ (ปฏิทินรวมจากแอดมิน <strong className="text-yellow-400/90">phet@minddojo.me</strong> ในนาม{' '}
            <strong className="text-yellow-400/90">Admin &amp; Production &amp; Marketing</strong> ดูได้ที่ Google Calendar)
          </p>
          {leaveListLoading ? (
            <div className="min-h-[120px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-sm">
              กำลังโหลด...
            </div>
          ) : leaveList.length === 0 ? (
            <div className="min-h-[120px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-sm">
              ยังไม่มีคำขอลา
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-4 py-3 font-semibold text-gray-400">ผู้ลา</th>
                    <th className="px-4 py-3 font-semibold text-gray-400">ประเภท</th>
                    <th className="px-4 py-3 font-semibold text-gray-400">วันเริ่ม</th>
                    <th className="px-4 py-3 font-semibold text-gray-400">วันสิ้นสุด</th>
                    <th className="px-4 py-3 font-semibold text-gray-400">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveList.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-gray-300">
                        {row.user_display_name || row.user_email}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {LEAVE_TYPES.find((t) => t.id === row.leave_type)?.label ?? row.leave_type}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{formatThaiDate(row.start_date)}</td>
                      <td className="px-4 py-3 text-gray-300">{formatThaiDate(row.end_date)}</td>
                      <td className="px-4 py-3">
                        <span className={row.status === 'approved' ? 'text-emerald-400' : row.status === 'rejected' ? 'text-red-400' : 'text-amber-400'}>
                          {row.status === 'approved' ? 'อนุมัติ' : row.status === 'rejected' ? 'ไม่อนุมัติ' : 'รอตรวจ'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h4 className="font-semibold text-gray-400 mt-6 mb-2">จากปฏิทินรวม (Admin &amp; Production &amp; Marketing)</h4>
          {sharedCalendarLoading ? (
            <div className="min-h-[80px] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 text-sm">
              กำลังโหลดปฏิทิน...
            </div>
          ) : sharedCalendarEvents.length > 0 ? (
            <ul className="divide-y divide-white/10 rounded-xl border border-white/10 max-h-64 overflow-y-auto">
              {sharedCalendarEvents.map((e) => (
                <li key={e.id} className="px-4 py-2 text-sm text-gray-300 flex flex-col gap-0.5">
                  <span className="font-medium text-white">{e.summary}</span>
                  <span className="text-gray-500 text-xs">
                    {formatCalendarDate(e.start)} – {formatCalendarDate(e.end)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">ยังไม่มีอีเวนต์จากปฏิทิน หรือยังไม่ได้ตั้งค่า Service Account / Calendar ID</p>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminLeavePage;
