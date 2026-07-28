import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isSupabaseConfigured, supabase, supabaseAnonKey, supabaseFunctionsUrl } from '../lib/supabase';
import {
  COURSE_OUTING_SUPPORTS,
  COURSE_OUTING_TRAINERS,
  countOutingDays,
  formatOutingDateRange,
  groupTrainerEventsByMonth,
  summarizeTrainingEventsByPeople,
  type TrainingConfirmedEvent,
} from '../lib/courseOutingTrainers';

const META = {
  trainer: {
    title: 'Dashboard รายการออกหลักสูตร · วิทยากร',
    blurb: 'สรุปจากปฏิทิน Training Confirmed แยกตามวิทยากร',
  },
  support: {
    title: 'Dashboard รายการออกหลักสูตร · ทีมซับพอท',
    blurb: 'สรุปจากปฏิทิน Training Confirmed แยกตามทีมซับพอท',
  },
} as const;

type OutingRole = keyof typeof META;

const DEFAULT_YEAR = 2026;

const AdminCourseOutingDashboardPage: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const activeRole = role === 'trainer' || role === 'support' ? (role as OutingRole) : null;
  const meta = activeRole ? META[activeRole] : null;
  const activePeople = activeRole === 'support' ? COURSE_OUTING_SUPPORTS : COURSE_OUTING_TRAINERS;

  const [year, setYear] = useState(DEFAULT_YEAR);
  const [events, setEvents] = useState<TrainingConfirmedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metaInfo, setMetaInfo] = useState<{
    totalBeforeDedup: number;
    totalAfterDedup: number;
    calendarCount: number;
  } | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string>(activePeople[0]?.id || '');

  const loadEvents = useCallback(async (targetYear: number) => {
    if (!isSupabaseConfigured || !supabaseFunctionsUrl) {
      setError('ยังไม่ได้ตั้งค่า Supabase');
      setEvents([]);
      setMetaInfo(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token || supabaseAnonKey;

      const res = await fetch(
        `${supabaseFunctionsUrl}/functions/v1/get-training-confirmed-events?year=${encodeURIComponent(String(targetYear))}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: supabaseAnonKey,
          },
        }
      );

      const payload = (await res.json()) as {
        error?: string;
        events?: TrainingConfirmedEvent[];
        calendars?: Array<{ id: string; summary: string }>;
        totalBeforeDedup?: number;
        totalAfterDedup?: number;
      };

      if (payload.error && !(payload.events && payload.events.length > 0)) {
        setError(payload.error);
        setEvents([]);
        setMetaInfo(null);
        return;
      }

      if (payload.error) setError(payload.error);
      else setError(null);

      setEvents(Array.isArray(payload.events) ? payload.events : []);
      setMetaInfo({
        totalBeforeDedup: payload.totalBeforeDedup || 0,
        totalAfterDedup: payload.totalAfterDedup || (payload.events || []).length,
        calendarCount: (payload.calendars || []).length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEvents([]);
      setMetaInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeRole) return;
    void loadEvents(year);
  }, [activeRole, year, loadEvents]);

  useEffect(() => {
    setSelectedPersonId(activePeople[0]?.id || '');
  }, [activeRole]);

  const summaries = useMemo(() => summarizeTrainingEventsByPeople(activePeople, events), [activePeople, events]);
  const selectedSummary = summaries.find((s) => s.id === selectedPersonId) || summaries[0];
  const monthlyGroups = useMemo(
    () => groupTrainerEventsByMonth(selectedSummary?.events || [], year),
    [selectedSummary?.events, year]
  );
  const monthsWithEvents = useMemo(
    () => monthlyGroups.filter((group) => group.eventCount > 0),
    [monthlyGroups]
  );
  const unmatchedCount = useMemo(() => {
    const matchedIds = new Set(summaries.flatMap((s) => s.events.map((e) => e.id)));
    return events.filter((e) => !matchedIds.has(e.id)).length;
  }, [events, summaries]);

  if (!meta) {
    return (
      <div className="p-6 sm:p-8">
        <p className="text-zinc-400 text-sm">ไม่พบหน้าที่ต้องการ</p>
        <Link to="/admin" className="mt-3 inline-block text-yellow-400 text-sm hover:underline">
          กลับ Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
      <header className="mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Course outing</p>
          <h1 className="text-xl sm:text-2xl font-bold text-yellow-300">{meta.title}</h1>
          <p className="mt-2 text-sm text-zinc-400">{meta.blurb}</p>
          {metaInfo && (
            <p className="mt-2 text-xs text-zinc-500">
              ปี {year} · Calendar {metaInfo.calendarCount} · Event {metaInfo.totalAfterDedup}
              {unmatchedCount > 0 ? ` · ไม่เข้าใคร ${unmatchedCount}` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-zinc-400" htmlFor="outing-year">
            ปี
          </label>
          <select
            id="outing-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y} className="bg-neutral-900">
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void loadEvents(year)}
            disabled={loading}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-gray-200 hover:bg-white/10 disabled:opacity-50"
          >
            {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 whitespace-pre-wrap">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 xl:grid-cols-9 gap-2 sm:gap-3 mb-6">
        {summaries.map((person) => {
          const active = person.id === selectedSummary?.id;
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => setSelectedPersonId(person.id)}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                active
                  ? 'border-yellow-400/50 bg-yellow-400/15'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
              }`}
            >
              <p className={`text-sm font-semibold ${active ? 'text-yellow-300' : 'text-white'}`}>
                {person.label}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                {person.eventCount} รายการ · {person.dayCount} วัน
              </p>
            </button>
          );
        })}
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="border-b border-white/10 px-4 sm:px-5 py-4">
          <h2 className="text-lg font-semibold text-white">{selectedSummary?.label}</h2>
          <p className="text-xs text-zinc-400 mt-1">
            {selectedSummary?.eventCount || 0} รายการ · รวม {selectedSummary?.dayCount || 0} วัน ·{' '}
            {monthsWithEvents.length} เดือนที่มีงาน
          </p>
        </div>

        {!loading && selectedSummary && selectedSummary.events.length > 0 && (
          <div className="border-b border-white/10 px-4 sm:px-5 py-3 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {monthlyGroups.map((group) => (
                <div
                  key={group.month}
                  className={`rounded-lg border px-2.5 py-2 text-center min-w-[4.5rem] ${
                    group.eventCount > 0
                      ? 'border-yellow-400/30 bg-yellow-400/10'
                      : 'border-white/5 bg-white/[0.02] opacity-40'
                  }`}
                >
                  <p className="text-[11px] text-zinc-400">{group.label}</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{group.dayCount}</p>
                  <p className="text-[10px] text-zinc-500">{group.eventCount} รายการ</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-zinc-400">กำลังดึงข้อมูลจาก Google Calendar...</div>
        ) : !selectedSummary || selectedSummary.events.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-zinc-500">ยังไม่มีรายการในปีนี้</div>
        ) : (
          <div className="divide-y divide-white/10">
            {monthsWithEvents.map((group) => (
              <div key={group.month}>
                <div className="px-4 sm:px-5 py-2.5 bg-white/[0.04] flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-yellow-300">{group.label}</h3>
                  <p className="text-xs text-zinc-400">
                    {group.eventCount} รายการ · {group.dayCount} วัน
                  </p>
                </div>
                <ul className="divide-y divide-white/5">
                  {group.events.map((event) => {
                    const days = countOutingDays(event.start, event.end);
                    return (
                      <li
                        key={event.id}
                        className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4"
                      >
                        <div className="sm:w-56 shrink-0 text-xs sm:text-sm text-zinc-400">
                          {formatOutingDateRange(event.start, event.end)}
                          <span className="ml-2 text-zinc-600">({days} วัน)</span>
                        </div>
                        <div className="min-w-0 flex-1 text-sm text-white/90 break-words">{event.summary}</div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminCourseOutingDashboardPage;
