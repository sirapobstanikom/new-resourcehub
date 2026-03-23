// ดึง events จากปฏิทินแชร์ (Admin & Production & Marketing) ด้วย Service Account — สิทธิ์ See only ก็อ่านได้
// ต้องตั้ง GOOGLE_SERVICE_ACCOUNT_JSON และ GOOGLE_CALENDAR_ID ใน Supabase Secrets
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

async function getServiceAccountAccessToken(jsonStr: string): Promise<string> {
  const sa = JSON.parse(jsonStr) as { client_email: string; private_key: string };
  const { SignJWT, importPKCS8 } = await import('https://esm.sh/jose@4.14.4');
  const key = await importPKCS8(sa.private_key, 'RS256');
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/calendar.readonly' })
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
  const calendarId = Deno.env.get('GOOGLE_CALENDAR_ID');
  if (!jsonStr || !calendarId) {
    return new Response(
      JSON.stringify({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_CALENDAR_ID not set', events: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const accessToken = await getServiceAccountAccessToken(jsonStr);
    const url = new URL(req.url);
    const timeMin = url.searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = url.searchParams.get('timeMax') || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!calRes.ok) {
      const errText = await calRes.text();
      return new Response(
        JSON.stringify({ error: 'Calendar API error', details: errText, events: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const calData = (await calRes.json()) as { items?: Array<{ id: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }; status?: string }> };
    const events = (calData.items || []).map((e) => ({
      id: e.id,
      summary: e.summary || '(ไม่มีชื่อ)',
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      status: e.status,
    }));

    return new Response(JSON.stringify({ events }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e), events: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
