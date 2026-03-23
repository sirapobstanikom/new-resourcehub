// ดึง events จาก Google Calendar ของ user (ต้องส่ง Authorization: Bearer <session access_token>)
// ต้องตั้ง GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ใน Supabase Edge Functions → Secrets
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Authorization required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: 'Server config missing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const anonKey = SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAuth = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(token);

    if (userError || !user?.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: row, error: rowError } = await supabaseAdmin
      .from('user_calendar_settings')
      .select('refresh_token, access_token, token_expires_at')
      .eq('user_id', user.id)
      .single();

    if (rowError || !row?.refresh_token) {
      return new Response(
        JSON.stringify({ error: 'Calendar not connected', events: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let accessToken = row.access_token;
    const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
    if (!accessToken || Date.now() >= expiresAt - 60_000) {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          refresh_token: row.refresh_token,
          grant_type: 'refresh_token',
        }),
      });
      if (!tokenRes.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh token', events: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;
      const newExpires = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
      await supabaseAdmin
        .from('user_calendar_settings')
        .update({ access_token: accessToken, token_expires_at: newExpires, updated_at: newExpires })
        .eq('user_id', user.id);
    }

    const url = new URL(req.url);
    const timeMin = url.searchParams.get('timeMin') || new Date().toISOString();
    const timeMax = url.searchParams.get('timeMax') || new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!calRes.ok) {
      const errText = await calRes.text();
      return new Response(
        JSON.stringify({ error: 'Calendar API error', details: errText, events: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const calData = await calRes.json();
    const events = (calData.items || []).map((e: { id: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }; status?: string }) => ({
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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
