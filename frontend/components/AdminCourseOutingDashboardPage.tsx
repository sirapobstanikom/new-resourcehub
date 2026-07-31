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
  type TrainerOutingSummary,
  type TrainingConfirmedEvent,
} from '../lib/courseOutingTrainers';

const META = {
  trainer: {
    title: 'Dashboard รายการออกหลักสูตร · วิทยากร',
    blurb: 'สรุปจากปฏิทิน Training Confirmed และ Virtual Training Confirmed แยกตามวิทยากร',
  },
  support: {
    title: 'Dashboard รายการออกหลักสูตร · ทีมซับพอท',
    blurb: 'สรุปจากปฏิทิน Training Confirmed แยกตามทีมซับพอท',
  },
} as const;

type OutingRole = keyof typeof META;

const DEFAULT_YEAR = 2026;

function yearTotals(events: TrainingConfirmedEvent[], monthly: ReturnType<typeof groupTrainerEventsByMonth>) {
  return {
    courseCount: events.length,
    dayCount: events.reduce((sum, event) => sum + countOutingDays(event.start, event.end), 0),
    monthsWithTraining: monthly.filter((g) => g.eventCount > 0).length,
  };
}

function MonthlySummarySection({
  title,
  subtitle,
  year,
  loading,
  events,
  monthly,
  accent = 'yellow',
}: {
  title: string;
  subtitle: string;
  year: number;
  loading: boolean;
  events: TrainingConfirmedEvent[];
  monthly: ReturnType<typeof groupTrainerEventsByMonth>;
  accent?: 'yellow' | 'sky';
}) {
  const totals = yearTotals(events, monthly);
  const border =
    accent === 'sky' ? 'border-sky-400/25 bg-sky-400/[0.06]' : 'border-yellow-400/25 bg-yellow-400/[0.06]';
  const titleColor = accent === 'sky' ? 'text-sky-300' : 'text-yellow-300';
  const headerBorder = accent === 'sky' ? 'border-sky-400/15' : 'border-yellow-400/15';
  const activeCard =
    accent === 'sky' ? 'border-sky-400/35 bg-sky-400/10' : 'border-yellow-400/35 bg-yellow-400/10';
  const dayColor = accent === 'sky' ? 'text-sky-300' : 'text-yellow-300';

  return (
    <section className={`mb-6 rounded-2xl border ${border} overflow-hidden`}>
      <div className={`px-4 sm:px-5 py-4 border-b ${headerBorder} flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3`}>
        <div>
          <h2 className={`text-base sm:text-lg font-semibold ${titleColor}`}>{title}</h2>
          <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
            <p className="text-[11px] text-zinc-500">ทั้งปี</p>
            <p className="font-semibold text-white">
              {totals.courseCount} หลักสูตร · {totals.dayCount} วัน
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2">
            <p className="text-[11px] text-zinc-500">เดือนที่มีงาน</p>
            <p className="font-semibold text-white">{totals.monthsWithTraining} / 12</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-400">กำลังคำนวณสรุป...</div>
      ) : events.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-zinc-500">ยังไม่มี {title.replace('สรุป ', '')} ในปี {year}</div>
      ) : (
        <div className="p-3 sm:p-4 overflow-x-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2 min-w-0">
            {monthly.map((group) => {
              const hasData = group.eventCount > 0;
              return (
                <div
                  key={`${title}-${group.month}`}
                  className={`rounded-xl border px-2.5 py-3 text-center ${
                    hasData ? activeCard : 'border-white/5 bg-white/[0.02] opacity-45'
                  }`}
                >
                  <p className="text-[11px] text-zinc-400">{group.label}</p>
                  <p className="mt-1 text-lg font-bold text-white leading-none">{group.eventCount}</p>
                  <p className="mt-1 text-[10px] text-zinc-400">หลักสูตร</p>
                  <p className={`mt-2 text-sm font-semibold ${hasData ? dayColor : 'text-zinc-500'}`}>
                    {group.dayCount} วัน
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function PersonEventList({
  title,
  accent,
  loading,
  summary,
  year,
}: {
  title: string;
  accent: 'yellow' | 'sky';
  loading: boolean;
  summary: TrainerOutingSummary | undefined;
  year: number;
}) {
  const monthlyGroups = useMemo(
    () => groupTrainerEventsByMonth(summary?.events || [], year),
    [summary?.events, year]
  );
  const monthsWithEvents = useMemo(
    () => monthlyGroups.filter((group) => group.eventCount > 0),
    [monthlyGroups]
  );

  const titleColor = accent === 'sky' ? 'text-sky-300' : 'text-yellow-300';
  const activeChip =
    accent === 'sky' ? 'border-sky-400/30 bg-sky-400/10' : 'border-yellow-400/30 bg-yellow-400/10';

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="border-b border-white/10 px-4 sm:px-5 py-4">
        <h2 className={`text-lg font-semibold ${titleColor}`}>
          {title}
          {summary?.label ? <span className="text-white"> · {summary.label}</span> : null}
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          {summary?.eventCount || 0} รายการ · รวม {summary?.dayCount || 0} วัน · {monthsWithEvents.length} เดือนที่มีงาน
        </p>
      </div>

      {!loading && summary && summary.events.length > 0 && (
        <div className="border-b border-white/10 px-4 sm:px-5 py-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {monthlyGroups.map((group) => (
              <div
                key={`${title}-${group.month}`}
                className={`rounded-lg border px-2.5 py-2 text-center min-w-[4.5rem] ${
                  group.eventCount > 0 ? activeChip : 'border-white/5 bg-white/[0.02] opacity-40'
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
      ) : !summary || summary.events.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-zinc-500">ยังไม่มีรายการในปีนี้</div>
      ) : (
        <div className="divide-y divide-white/10">
          {monthsWithEvents.map((group) => (
            <div key={`${title}-list-${group.month}`}>
              <div className="px-4 sm:px-5 py-2.5 bg-white/[0.04] flex items-center justify-between gap-3">
                <h3 className={`text-sm font-semibold ${titleColor}`}>{group.label}</h3>
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
  );
}

const AdminCourseOutingDashboardPage: React.FC = () => {
  const { role } = useParams<{ role: string }>();
  const activeRole = role === 'trainer' || role === 'support' ? (role as OutingRole) : null;
  const meta = activeRole ? META[activeRole] : null;
  const activePeople = activeRole === 'support' ? COURSE_OUTING_SUPPORTS : COURSE_OUTING_TRAINERS;
  const showVirtual = activeRole === 'trainer';

  const [year, setYear] = useState(DEFAULT_YEAR);
  const [events, setEvents] = useState<TrainingConfirmedEvent[]>([]);
  const [virtualEvents, setVirtualEvents] = useState<TrainingConfirmedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [virtualError, setVirtualError] = useState<string | null>(null);
  const [metaInfo, setMetaInfo] = useState<{
    totalBeforeDedup: number;
    totalAfterDedup: number;
    calendarCount: number;
    virtualTotalAfterDedup: number;
    virtualCalendarCount: number;
    trainingCalendars: Array<{ id: string; summary: string }>;
    virtualCalendars: Array<{ id: string; summary: string }>;
  } | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string>(activePeople[0]?.id || '');

  const loadEvents = useCallback(
    async (targetYear: number) => {
      if (!isSupabaseConfigured || !supabaseFunctionsUrl) {
        setError('ยังไม่ได้ตั้งค่า Supabase');
        setEvents([]);
        setVirtualEvents([]);
        setMetaInfo(null);
        return;
      }

      setLoading(true);
      setError(null);
      setVirtualError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token || supabaseAnonKey;
        const qs = new URLSearchParams({
          year: String(targetYear),
          includeVirtual: showVirtual ? '1' : '0',
        });

        const res = await fetch(
          `${supabaseFunctionsUrl}/functions/v1/get-training-confirmed-events?${qs}`,
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
          virtualEvents?: TrainingConfirmedEvent[];
          virtualCalendars?: Array<{ id: string; summary: string }>;
          virtualTotalAfterDedup?: number;
          virtualError?: string;
        };

        if (payload.error && !(payload.events && payload.events.length > 0)) {
          setError(payload.error);
          setEvents([]);
          setVirtualEvents([]);
          setMetaInfo(null);
          return;
        }

        if (payload.error) setError(payload.error);
        else setError(null);

        if (payload.virtualError) setVirtualError(payload.virtualError);

        setEvents(Array.isArray(payload.events) ? payload.events : []);
        setVirtualEvents(Array.isArray(payload.virtualEvents) ? payload.virtualEvents : []);
        setMetaInfo({
          totalBeforeDedup: payload.totalBeforeDedup || 0,
          totalAfterDedup: payload.totalAfterDedup || (payload.events || []).length,
          calendarCount: (payload.calendars || []).length,
          virtualTotalAfterDedup:
            payload.virtualTotalAfterDedup || (payload.virtualEvents || []).length,
          virtualCalendarCount: (payload.virtualCalendars || []).length,
          trainingCalendars: payload.calendars || [],
          virtualCalendars: payload.virtualCalendars || [],
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setEvents([]);
        setVirtualEvents([]);
        setMetaInfo(null);
      } finally {
        setLoading(false);
      }
    },
    [showVirtual]
  );

  useEffect(() => {
    if (!activeRole) return;
    void loadEvents(year);
  }, [activeRole, year, loadEvents]);

  useEffect(() => {
    setSelectedPersonId(activePeople[0]?.id || '');
  }, [activeRole]);

  const summaries = useMemo(
    () => summarizeTrainingEventsByPeople(activePeople, events),
    [activePeople, events]
  );
  const virtualSummaries = useMemo(
    () => summarizeTrainingEventsByPeople(COURSE_OUTING_TRAINERS, virtualEvents),
    [virtualEvents]
  );
  const selectedSummary = summaries.find((s) => s.id === selectedPersonId) || summaries[0];
  const selectedVirtualSummary =
    virtualSummaries.find((s) => s.id === selectedPersonId) || virtualSummaries[0];

  const trainingMonthlySummary = useMemo(
    () => groupTrainerEventsByMonth(events, year),
    [events, year]
  );
  const virtualMonthlySummary = useMemo(
    () => groupTrainerEventsByMonth(virtualEvents, year),
    [virtualEvents, year]
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
            <div className="mt-2 space-y-1 text-xs text-zinc-500">
              <p>
                ปี {year} · Training Confirmed {metaInfo.totalAfterDedup}
                {showVirtual ? ` · Virtual ${metaInfo.virtualTotalAfterDedup}` : ''}
                {unmatchedCount > 0 ? ` · TC ไม่เข้าใคร ${unmatchedCount}` : ''}
              </p>
              {metaInfo.trainingCalendars[0] && (
                <p className="text-zinc-600 break-all">
                  แหล่ง TC: {metaInfo.trainingCalendars.map((c) => c.summary).join(', ')}
                  <span className="text-zinc-700"> ({metaInfo.trainingCalendars[0].id})</span>
                </p>
              )}
              {showVirtual && metaInfo.virtualCalendars[0] && (
                <p className="text-sky-400/70 break-all">
                  แหล่ง Virtual: {metaInfo.virtualCalendars.map((c) => c.summary).join(', ')}
                  <span className="text-sky-400/40"> ({metaInfo.virtualCalendars[0].id})</span>
                </p>
              )}
            </div>
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
      {showVirtual && virtualError && (
        <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 whitespace-pre-wrap">
          Virtual Training Confirmed: {virtualError}
        </div>
      )}

      <MonthlySummarySection
        title="สรุป Training Confirmed"
        subtitle={`จำนวนหลักสูตรและจำนวนวัน แยกรายเดือนของปี ${year}`}
        year={year}
        loading={loading}
        events={events}
        monthly={trainingMonthlySummary}
        accent="yellow"
      />

      {showVirtual && (
        <MonthlySummarySection
          title="สรุป Virtual Training Confirmed"
          subtitle={`จำนวนหลักสูตรและจำนวนวัน แยกรายเดือนของปี ${year}`}
          year={year}
          loading={loading}
          events={virtualEvents}
          monthly={virtualMonthlySummary}
          accent="sky"
        />
      )}

      <div className="mb-3">
        <h2 className="text-sm font-semibold text-zinc-300">
          {showVirtual ? 'สรุปตามวิทยากร (Training Confirmed)' : 'สรุปตามคน'}
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 xl:grid-cols-9 gap-2 sm:gap-3 mb-6">
        {summaries.map((person) => {
          const active = person.id === selectedSummary?.id;
          const virtualPerson = virtualSummaries.find((v) => v.id === person.id);
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
                TC {person.eventCount} · {person.dayCount} วัน
              </p>
              {showVirtual && (
                <p className="mt-0.5 text-xs text-sky-300/80">
                  Virtual {virtualPerson?.eventCount || 0} · {virtualPerson?.dayCount || 0} วัน
                </p>
              )}
            </button>
          );
        })}
      </div>

      {showVirtual && (
        <>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-sky-300">สรุป Virtual Training Confirmed ตามวิทยากร</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3 mb-6">
            {virtualSummaries.map((person) => {
              const active = person.id === selectedPersonId;
              return (
                <button
                  key={`virtual-${person.id}`}
                  type="button"
                  onClick={() => setSelectedPersonId(person.id)}
                  className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                    active
                      ? 'border-sky-400/50 bg-sky-400/15'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <p className={`text-sm font-semibold ${active ? 'text-sky-300' : 'text-white'}`}>
                    {person.label}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {person.eventCount} รายการ · {person.dayCount} วัน
                  </p>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className={`grid gap-6 ${showVirtual ? 'lg:grid-cols-1' : ''}`}>
        <PersonEventList
          title="Training Confirmed"
          accent="yellow"
          loading={loading}
          summary={selectedSummary}
          year={year}
        />
        {showVirtual && (
          <PersonEventList
            title="Virtual Training Confirmed"
            accent="sky"
            loading={loading}
            summary={selectedVirtualSummary}
            year={year}
          />
        )}
      </div>
    </div>
  );
};

export default AdminCourseOutingDashboardPage;
