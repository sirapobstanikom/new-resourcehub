// ดึง events จากปฏิทิน "Training Confirmed" ด้วย Service Account + Domain-wide Delegation
// (เทียบเท่าสคริปต์ Python ที่ with_subject ไปที่ phet@minddojo.me)
// Secrets: GOOGLE_SERVICE_ACCOUNT_JSON
// Optional: GOOGLE_CALENDAR_IMPERSONATE_EMAIL (default phet@minddojo.me)
// Optional: GOOGLE_TRAINING_CALENDAR_NAME (default Training Confirmed)
// Optional: GOOGLE_TRAINING_CALENDAR_ID (ข้ามการค้นหาชื่อถ้ามี)
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

async function getServiceAccountAccessToken(jsonStr: string, subjectEmail: string): Promise<string> {
  const sa = JSON.parse(jsonStr) as { client_email: string; private_key: string };
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
): Promise<Array<{ id: string; summary: string }>> {
  const matched: Array<{ id: string; summary: string }> = [];
  let pageToken: string | undefined;

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
      if (cal.id && cal.summary === targetName) {
        matched.push({ id: cal.id, summary: cal.summary });
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
): Promise<Array<{ id: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }>> {
  const items: Array<{
    id: string;
    summary?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
  }> = [];
  let pageToken: string | undefined;

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
    if (!res.ok) throw new Error(`events.list failed (${calendarId}): ${await res.text()}`);

    const data = (await res.json()) as {
      items?: typeof items;
      nextPageToken?: string;
    };
    items.push(...(data.items || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return items;
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

  const subjectEmail =
    Deno.env.get('GOOGLE_CALENDAR_IMPERSONATE_EMAIL') || 'phet@minddojo.me';
  const targetCalendarName =
    Deno.env.get('GOOGLE_TRAINING_CALENDAR_NAME') || 'Training Confirmed';
  const fixedCalendarId = Deno.env.get('GOOGLE_TRAINING_CALENDAR_ID') || '';

  const url = new URL(req.url);
  const yearParam = Number(url.searchParams.get('year') || '2026');
  const year = Number.isFinite(yearParam) && yearParam >= 2000 && yearParam <= 2100 ? yearParam : 2026;

  const timeMin = new Date(Date.UTC(year, 0, 1, 0, 0, 0)).toISOString();
  const timeMax = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0)).toISOString();

  try {
    const accessToken = await getServiceAccountAccessToken(jsonStr, subjectEmail);

    const calendars = fixedCalendarId
      ? [{ id: fixedCalendarId, summary: targetCalendarName }]
      : await listCalendarsByName(accessToken, targetCalendarName);

    if (calendars.length === 0) {
      return new Response(
        JSON.stringify({
          error: `ไม่พบ Calendar '${targetCalendarName}'`,
          year,
          calendars: [],
          events: [],
          totalBeforeDedup: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    return new Response(
      JSON.stringify({
        year,
        calendars: calendars.map((c) => ({ id: c.id, summary: c.summary })),
        events,
        totalBeforeDedup,
        totalAfterDedup: events.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e), events: [], calendars: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
