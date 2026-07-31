// ดึง events จากปฏิทิน "Training Confirmed" (+ Virtual Training Confirmed)
// ด้วย Service Account + Domain-wide Delegation
// Secrets: GOOGLE_SERVICE_ACCOUNT_JSON
// Optional: GOOGLE_CALENDAR_IMPERSONATE_EMAIL (default phet@minddojo.me)
// Optional: GOOGLE_TRAINING_CALENDAR_NAME (default Training Confirmed)
// Optional: GOOGLE_VIRTUAL_TRAINING_CALENDAR_NAME (default Virtual Training Confirmed)
// Optional: GOOGLE_TRAINING_CALENDAR_ID / GOOGLE_VIRTUAL_TRAINING_CALENDAR_ID
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  calendar: string;
};

type CalendarMeta = { id: string; summary: string };

async function getServiceAccountAccessToken(jsonStr: string, subjectEmail: string): Promise<string> {
  const sa = JSON.parse(jsonStr) as { client_email: string; private_key: string };
  // @ts-ignore Deno URL import
  const { SignJWT, importPKCS8 } = await import('https://esm.sh/jose@4.14.4');
  const key = await importPKCS8(sa.private_key, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    sub: subjectEmail,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) throw new Error(`Token failed: ${await tokenRes.text()}`);
  const data = (await tokenRes.json()) as { access_token: string };
  return data.access_token;
}

async function listCalendarsByName(
  accessToken: string,
  targetName: string
): Promise<CalendarMeta[]> {
  const matched: CalendarMeta[] = [];
  let pageToken: string | undefined;
  const target = normalizeCalendarName(targetName);

  do {
    const url = new URL('https://www.googleapis.com/calendar/v3/users/me/calendarList');
    url.searchParams.set('maxResults', '250');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`calendarList failed: ${await res.text()}`);

    const data = (await res.json()) as {
      items?: Array<{ id?: string; summary?: string }>;
      nextPageToken?: string;
    };

    for (const cal of data.items || []) {
      if (cal.id && normalizeCalendarName(cal.summary || '') === target) {
        matched.push({ id: cal.id, summary: cal.summary || targetName });
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return matched;
}

async function listEventsForCalendar(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<
  Array<{
    id: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
  }>
> {
  const items: Array<{
    id: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
  }> = [];
  let pageToken: string | undefined;
  const calendarIdPreview =
    calendarId.length > 80 ? `${calendarId.slice(0, 40)}…(${calendarId.length} chars)` : calendarId;

  do {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
    );
    url.searchParams.set('timeMin', timeMin);
    url.searchParams.set('timeMax', timeMax);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '2500');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `events.list failed for calendar "${calendarIdPreview}": ${body.slice(0, 400)}`
      );
    }

    const data = (await res.json()) as {
      items?: typeof items;
      nextPageToken?: string;
    };
    items.push(...(data.items || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
}

/** รับเฉพาะ Calendar ID จริง — กันใส่ JSON service account ผิดช่อง */
function sanitizeCalendarId(raw: string | undefined, secretName: string): string {
  const value = (raw || '').trim().replace(/^["']|["']$/g, '');
  if (!value) return '';

  if (value.startsWith('{') || value.includes('private_key') || value.includes('client_email')) {
    throw new Error(
      `${secretName} ใส่ผิดค่า — ได้ JSON ของ service account แทน Calendar ID ` +
        `ให้ใส่เฉพาะ Calendar ID เช่น xxx@group.calendar.google.com ` +
        `(หาได้จาก Google Calendar → Settings → Integrate calendar)`
    );
  }

  if (value.length > 300 || value.includes('\n')) {
    throw new Error(
      `${secretName} ดูไม่ใช่ Calendar ID (ยาวเกินไปหรือมีบรรทัดใหม่) — ใส่เฉพาะ ID บรรทัดเดียว`
    );
  }

  return value;
}

async function collectEvents(
  accessToken: string,
  calendars: CalendarMeta[],
  timeMin: string,
  timeMax: string
): Promise<{ events: CalendarEvent[]; totalBeforeDedup: number }> {
  const allEvents = new Map<string, CalendarEvent>();
  let totalBeforeDedup = 0;

  for (const cal of calendars) {
    const items = await listEventsForCalendar(accessToken, cal.id, timeMin, timeMax);
    totalBeforeDedup += items.length;
    for (const e of items) {
      if (!e.id || allEvents.has(e.id)) continue;
      allEvents.set(e.id, {
        id: e.id,
        summary: e.summary || '-',
        start: e.start?.dateTime || e.start?.date || '-',
        end: e.end?.dateTime || e.end?.date || '-',
        calendar: cal.summary,
      });
    }
  }

  const events = Array.from(allEvents.values()).sort((a, b) => a.start.localeCompare(b.start));
  return { events, totalBeforeDedup };
}

async function getCalendarMeta(
  accessToken: string,
  calendarId: string
): Promise<CalendarMeta | null> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { id?: string; summary?: string };
  if (!data.id) return null;
  return { id: data.id, summary: data.summary || data.id };
}

function normalizeCalendarName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function resolveCalendars(
  accessToken: string,
  expectedName: string,
  fixedId: string
): Promise<{ calendars: CalendarMeta[]; source: string; warning?: string }> {
  const expected = normalizeCalendarName(expectedName);

  // 1) ค้นจากชื่อก่อน — แม่นยำกว่า ID ที่อาจใส่ผิด
  const byName = await listCalendarsByName(accessToken, expectedName);
  if (byName.length > 0) {
    return { calendars: byName, source: 'calendarList-by-name' };
  }

  // 2) ใช้ fixed ID เฉพาะเมื่อตรวจชื่อจริงจาก Google แล้วตรงกับที่คาดหวัง
  if (fixedId) {
    const meta = await getCalendarMeta(accessToken, fixedId);
    if (!meta) {
      return {
        calendars: [],
        source: 'fixed-id-not-found',
        warning: `Calendar ID ไม่พบหรือไม่มีสิทธิ์: ${fixedId}`,
      };
    }
    const actual = normalizeCalendarName(meta.summary);
    if (actual !== expected) {
      return {
        calendars: [],
        source: 'fixed-id-name-mismatch',
        warning:
          `GOOGLE_*_CALENDAR_ID ชี้ไปปฏิทินชื่อ "${meta.summary}" แต่ต้องการ "${expectedName}" ` +
          `(id: ${meta.id}) — ไม่ใช้ ID นี้เพื่อกันดึงผิดปฏิทิน`,
      };
    }
    return { calendars: [meta], source: 'fixed-id-verified' };
  }

  return { calendars: [], source: 'none' };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return new Response(JSON.stringify({ error: 'Authorization required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const jsonStr = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (!jsonStr) {
    return new Response(
      JSON.stringify({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON not set', events: [], calendars: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const subjectEmail = Deno.env.get('GOOGLE_CALENDAR_IMPERSONATE_EMAIL') || 'phet@minddojo.me';
  const trainingCalendarName = Deno.env.get('GOOGLE_TRAINING_CALENDAR_NAME') || 'Training Confirmed';
  const virtualCalendarName =
    Deno.env.get('GOOGLE_VIRTUAL_TRAINING_CALENDAR_NAME') || 'Virtual Training Confirmed';

  let fixedTrainingId = '';
  let fixedVirtualId = '';
  let trainingIdError: string | undefined;
  let virtualIdError: string | undefined;
  try {
    fixedTrainingId = sanitizeCalendarId(
      Deno.env.get('GOOGLE_TRAINING_CALENDAR_ID'),
      'GOOGLE_TRAINING_CALENDAR_ID'
    );
  } catch (e) {
    trainingIdError = String(e).replace(/^Error:\s*/, '');
  }
  try {
    fixedVirtualId = sanitizeCalendarId(
      Deno.env.get('GOOGLE_VIRTUAL_TRAINING_CALENDAR_ID'),
      'GOOGLE_VIRTUAL_TRAINING_CALENDAR_ID'
    );
  } catch (e) {
    virtualIdError = String(e).replace(/^Error:\s*/, '');
  }

  const url = new URL(req.url);
  const yearParam = Number(url.searchParams.get('year') || '2026');
  const year = Number.isFinite(yearParam) && yearParam >= 2000 && yearParam <= 2100 ? yearParam : 2026;
  const includeVirtual = url.searchParams.get('includeVirtual') !== '0';

  const timeMin = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
  const timeMax = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0)).toISOString();

  try {
    if (trainingIdError) {
      return new Response(
        JSON.stringify({
          error: trainingIdError,
          events: [],
          virtualEvents: [],
          calendars: [],
          virtualCalendars: [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = await getServiceAccountAccessToken(jsonStr, subjectEmail);

    let virtualIdIgnoredWarning: string | undefined;
    // กันใส่ ID เดียวกันทั้ง Training และ Virtual
    if (fixedTrainingId && fixedVirtualId && fixedTrainingId === fixedVirtualId) {
      virtualIdIgnoredWarning =
        'GOOGLE_VIRTUAL_TRAINING_CALENDAR_ID ซ้ำกับ Training — ข้าม ID นี้แล้วค้นจากชื่อ Virtual Training Confirmed แทน';
      fixedVirtualId = '';
      virtualIdError = undefined;
    }

    const trainingResolved = await resolveCalendars(
      accessToken,
      trainingCalendarName,
      fixedTrainingId
    );
    const calendars = trainingResolved.calendars;
    if (calendars.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            trainingResolved.warning ||
            `ไม่พบ Calendar '${trainingCalendarName}'`,
          year,
          calendars: [],
          events: [],
          virtualEvents: [],
          virtualCalendars: [],
          totalBeforeDedup: 0,
          trainingSource: trainingResolved.source,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const training = await collectEvents(accessToken, calendars, timeMin, timeMax);
    const trainingIds = new Set(calendars.map((c) => c.id));

    let virtualEvents: CalendarEvent[] = [];
    let virtualCalendars: CalendarMeta[] = [];
    let virtualTotalBeforeDedup = 0;
    let virtualError: string | undefined = virtualIdError;
    let virtualSource = 'skipped';

    if (includeVirtual && !virtualIdError) {
      try {
        const virtualResolved = await resolveCalendars(
          accessToken,
          virtualCalendarName,
          fixedVirtualId
        );
        virtualSource = virtualResolved.source;
        virtualCalendars = virtualResolved.calendars.filter((c) => !trainingIds.has(c.id));

        if (virtualResolved.calendars.length > 0 && virtualCalendars.length === 0) {
          virtualError =
            `ปฏิทิน Virtual ที่พบเป็นตัวเดียวกับ Training Confirmed (id: ${virtualResolved.calendars[0]?.id}) — ข้ามเพื่อกันดึงซ้ำ`;
        } else if (virtualCalendars.length === 0) {
          virtualError =
            virtualResolved.warning ||
            `ไม่พบ Calendar '${virtualCalendarName}' — ตรวจชื่อปฏิทินใน Google หรือตั้ง GOOGLE_VIRTUAL_TRAINING_CALENDAR_ID ให้ถูก (ต้องไม่ใช่ ID ของ Training Confirmed)`;
        } else {
          const virtual = await collectEvents(accessToken, virtualCalendars, timeMin, timeMax);
          virtualEvents = virtual.events;
          virtualTotalBeforeDedup = virtual.totalBeforeDedup;
          const warnings = [virtualIdIgnoredWarning, virtualResolved.warning].filter(Boolean);
          if (warnings.length) virtualError = warnings.join(' | ');
        }
      } catch (e) {
        virtualError = String(e).replace(/^Error:\s*/, '');
        virtualSource = 'error';
      }
    }

    return new Response(
      JSON.stringify({
        year,
        calendars: calendars.map((c) => ({ id: c.id, summary: c.summary })),
        events: training.events,
        totalBeforeDedup: training.totalBeforeDedup,
        totalAfterDedup: training.events.length,
        trainingSource: trainingResolved.source,
        virtualCalendars: virtualCalendars.map((c) => ({ id: c.id, summary: c.summary })),
        virtualEvents,
        virtualTotalBeforeDedup,
        virtualTotalAfterDedup: virtualEvents.length,
        virtualSource,
        virtualError,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e), events: [], virtualEvents: [], calendars: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
