/** วิทยากรที่สรุปจากปฏิทิน Training Confirmed */
export const COURSE_OUTING_TRAINERS = [
  { id: 'gee', label: 'Gee', aliases: ['gee'] },
  { id: 'tonji', label: 'Tonji', aliases: ['tonji'] },
  { id: 'pipo', label: 'Pipo', aliases: ['pipo'] },
  { id: 'noon', label: 'Noon', aliases: ['noon'] },
  { id: 'ping', label: 'Ping', aliases: ['ping'] },
  { id: 'robert', label: 'Robert', aliases: ['robert'] },
  { id: 'mos', label: 'Mos', aliases: ['mos'] },
] as const;

export type CourseOutingTrainerId = (typeof COURSE_OUTING_TRAINERS)[number]['id'];

/** ทีมซับพอทที่สรุปจากปฏิทิน Training Confirmed */
export const COURSE_OUTING_SUPPORTS = [
  { id: 'amm', label: 'Amm', aliases: ['amm'] },
  { id: 'film', label: 'Film', aliases: ['film'] },
  { id: 'poom', label: 'Poom', aliases: ['poom'] },
  { id: 'phet', label: 'Phet', aliases: ['phet'] },
  { id: 'nay', label: 'Nay', aliases: ['nay'] },
  { id: 'prim', label: 'Prim', aliases: ['prim'] },
  { id: 'bung', label: 'Bung', aliases: ['bung'] },
  { id: 'nahm', label: 'Nahm', aliases: ['nahm'] },
  { id: 'nk', label: 'NK', aliases: ['nk'] },
] as const;

export type CourseOutingSupportId = (typeof COURSE_OUTING_SUPPORTS)[number]['id'];

export type TrainingConfirmedEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  calendar?: string;
};

export type TrainerOutingSummary = {
  id: string;
  label: string;
  events: TrainingConfirmedEvent[];
  eventCount: number;
  dayCount: number;
};

export type CourseOutingPerson = {
  id: string;
  label: string;
  aliases: string[];
};

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

type Ymd = { y: number; m: number; d: number };

function parseDateOnly(value: string): Ymd | null {
  if (!DATE_ONLY_RE.test(value)) return null;
  const y = Number(value.slice(0, 4));
  const m = Number(value.slice(5, 7));
  const d = Number(value.slice(8, 10));
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function ymdToKey(ymd: Ymd): string {
  return `${ymd.y}-${String(ymd.m).padStart(2, '0')}-${String(ymd.d).padStart(2, '0')}`;
}

/** บวก/ลบวันแบบปฏิทิน ไม่ผ่าน timezone */
function addCalendarDays(ymd: Ymd, delta: number): Ymd {
  const utc = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d + delta));
  return {
    y: utc.getUTCFullYear(),
    m: utc.getUTCMonth() + 1,
    d: utc.getUTCDate(),
  };
}

function diffCalendarDays(start: Ymd, endExclusive: Ymd): number {
  const s = Date.UTC(start.y, start.m - 1, start.d);
  const e = Date.UTC(endExclusive.y, endExclusive.m - 1, endExclusive.d);
  return Math.round((e - s) / (24 * 60 * 60 * 1000));
}

function bangkokYmdFromInstant(value: string): Ymd | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function bangkokTimeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatYmdThai(ymd: Ymd): string {
  // ใช้เที่ยงวัน UTC กันเลื่อนวันตอน format ด้วย Asia/Bangkok
  const date = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d, 12, 0, 0));
  return date.toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isMidnightInBangkok(value: string): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === 'hour')?.value;
  const minute = parts.find((p) => p.type === 'minute')?.value;
  const second = parts.find((p) => p.type === 'second')?.value;
  return hour === '00' && minute === '00' && second === '00';
}

/** นับจำนวนวันออกงานจาก start/end ของ Google Calendar */
export function countOutingDays(start: string, end: string): number {
  if (!start || start === '-' || !end || end === '-') return 0;

  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);

  // all-day: Google ใช้ end แบบ exclusive
  if (startDate && endDate) {
    return Math.max(diffCalendarDays(startDate, endDate), 1);
  }

  const startYmd = bangkokYmdFromInstant(start);
  const endYmd = bangkokYmdFromInstant(end);
  if (!startYmd || !endYmd) return 0;

  // timed ที่จบเที่ยงคืนพอดี = exclusive end day
  const endExclusive = isMidnightInBangkok(end) ? endYmd : addCalendarDays(endYmd, 1);
  return Math.max(diffCalendarDays(startYmd, endExclusive), 1);
}

export function formatOutingDateRange(start: string, end: string): string {
  if (!start || start === '-') return '-';

  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);

  if (startDate && endDate) {
    // all-day end exclusive → วันสุดท้ายจริง = end - 1 วัน (เลขปฏิทิน ไม่ใช้ toISOString)
    const lastDay = addCalendarDays(endDate, -1);
    if (ymdToKey(lastDay) === ymdToKey(startDate) || diffCalendarDays(startDate, endDate) <= 1) {
      return formatYmdThai(startDate);
    }
    return `${formatYmdThai(startDate)} – ${formatYmdThai(lastDay)}`;
  }

  if (startDate) {
    const startLabel = formatYmdThai(startDate);
    if (!end || end === '-') return startLabel;
    return `${startLabel} – ${bangkokTimeLabel(end)}`;
  }

  const startLabel = bangkokTimeLabel(start);
  if (!end || end === '-' || end === start) return startLabel;

  const startYmd = bangkokYmdFromInstant(start);
  const endYmd = bangkokYmdFromInstant(end);
  if (startYmd && endYmd) {
    const endExclusive = isMidnightInBangkok(end) ? endYmd : addCalendarDays(endYmd, 1);
    const lastDay = addCalendarDays(endExclusive, -1);
    const days = Math.max(diffCalendarDays(startYmd, endExclusive), 1);
    // งานหลายวันที่เริ่ม/จบเที่ยงคืน แสดงแค่วันที่
    if (days > 1 && (isMidnightInBangkok(end) || isMidnightInBangkok(start))) {
      if (ymdToKey(lastDay) === ymdToKey(startYmd)) return formatYmdThai(startYmd);
      return `${formatYmdThai(startYmd)} – ${formatYmdThai(lastDay)}`;
    }
  }

  return `${startLabel} – ${bangkokTimeLabel(end)}`;
}

function summaryMatchesAlias(summary: string, alias: string): boolean {
  const needle = alias.toLowerCase();
  // จับคำทั้งคำ เช่น "Mos", "Gee" ไม่ให้ชน substring แปลกๆ ง่ายเกินไป
  const re = new RegExp(`(?:^|[^a-z0-9])${needle}(?:[^a-z0-9]|$)`, 'i');
  return re.test(summary);
}

export function summarizeTrainingEventsByPeople(
  people: readonly CourseOutingPerson[],
  events: TrainingConfirmedEvent[]
): TrainerOutingSummary[] {
  return people.map((person) => {
    const matched = events.filter((event) => person.aliases.some((alias) => summaryMatchesAlias(event.summary || '', alias)));
    const dayCount = matched.reduce((sum, event) => sum + countOutingDays(event.start, event.end), 0);
    return {
      id: person.id,
      label: person.label,
      events: matched,
      eventCount: matched.length,
      dayCount,
    };
  });
}

export function summarizeTrainingEventsByTrainer(events: TrainingConfirmedEvent[]): TrainerOutingSummary[] {
  return summarizeTrainingEventsByPeople(COURSE_OUTING_TRAINERS, events);
}

/** เดือนของวันเริ่มอีเวนต์ ตาม Asia/Bangkok (1–12) */
export function getOutingEventMonth(start: string): number | null {
  if (!start || start === '-') return null;
  const dateOnly = parseDateOnly(start);
  if (dateOnly) return dateOnly.m;
  const ymd = bangkokYmdFromInstant(start);
  return ymd?.m ?? null;
}

export type TrainerMonthlyOutingGroup = {
  month: number;
  label: string;
  events: TrainingConfirmedEvent[];
  eventCount: number;
  dayCount: number;
};

const THAI_MONTH_SHORT = [
  '',
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;

export function groupTrainerEventsByMonth(
  events: TrainingConfirmedEvent[],
  year: number
): TrainerMonthlyOutingGroup[] {
  const buckets = new Map<number, TrainingConfirmedEvent[]>();
  for (let m = 1; m <= 12; m++) buckets.set(m, []);

  for (const event of events) {
    const month = getOutingEventMonth(event.start);
    if (!month) continue;
    buckets.get(month)?.push(event);
  }

  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthEvents = buckets.get(month) || [];
    return {
      month,
      label: `${THAI_MONTH_SHORT[month]} ${year + 543}`,
      events: monthEvents,
      eventCount: monthEvents.length,
      dayCount: monthEvents.reduce((sum, event) => sum + countOutingDays(event.start, event.end), 0),
    };
  });
}
