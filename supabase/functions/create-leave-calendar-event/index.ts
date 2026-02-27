// สร้างอีเวนต์การลาลง Google Calendar ด้วย Service Account (ปฎิทิน Admin & Production & Marketing)
// ต้องตั้ง GOOGLE_SERVICE_ACCOUNT_JSON (เนื้อไฟล์ JSON ทั้งก้อน) และ GOOGLE_CALENDAR_ID ใน Supabase Secrets
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const LEAVE_TYPE_LABELS: Record<string, string> = {
  personal: 'ลากิจ',
  sick: 'ลาป่วย',
  wfh: 'Work from Home',
  unpaid: 'ลาไม่รับเงินเดือน',
};

async function getServiceAccountAccessToken(jsonStr: string): Promise<string> {
  const sa = JSON.parse(jsonStr) as { client_email: string; private_key: string };
  const { SignJWT, importPKCS8 } = await import('https://esm.sh/jose@4.14.4');
  const key = await importPKCS8(sa.private_key, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/calendar.events' })
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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
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
  const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
  if (!jsonStr || !calendarId) {
    return new Response(
      JSON.stringify({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_CALENDAR_ID not set' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = (await req.json()) as {
      user_display_name?: string;
      user_email?: string;
      leave_type?: string;
      start_date?: string;
      end_date?: string;
      reason?: string;
    };
    const displayName = body.user_display_name || body.user_email || 'ผู้ลา';
    const leaveType = body.leave_type || 'personal';
    const startDate = body.start_date;
    const endDate = body.end_date;
    const reason = body.reason || '';

    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: 'start_date and end_date required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = await getServiceAccountAccessToken(jsonStr);
    const typeLabel = LEAVE_TYPE_LABELS[leaveType] || leaveType;
    const summary = `[ลา] ${displayName} — ${typeLabel}`;
    const description = reason ? `เหตุผล: ${reason}` : '';

    const eventBody = {
      summary,
      description: description || undefined,
      start: { date: startDate },
      end: { date: endDate },
    };

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (!calRes.ok) {
      const errText = await calRes.text();
      return new Response(
        JSON.stringify({ error: 'Calendar API failed', details: errText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const event = (await calRes.json()) as { id?: string; htmlLink?: string };
    return new Response(
      JSON.stringify({ ok: true, eventId: event.id, htmlLink: event.htmlLink }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
