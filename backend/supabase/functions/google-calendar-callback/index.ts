// รับ callback จาก Google OAuth แล้วเก็บ refresh_token ลง DB แล้ว redirect กลับแอป
// ต้องตั้ง GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ใน Supabase Edge Functions → Secrets
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
// SUPABASE_URL มักถูก inject; ถ้าไม่มี ใช้จาก request
function getSupabaseUrl(req: Request): string {
  const fromEnv = Deno.env.get('SUPABASE_URL');
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !SUPABASE_SERVICE_ROLE_KEY) {
    const u = new URL(req.url);
    const stateParam = u.searchParams.get('state');
    let returnUrl = '/admin/leave';
    if (stateParam) {
      try {
        const decoded = JSON.parse(atob(stateParam));
        if (decoded.returnUrl) returnUrl = decoded.returnUrl;
      } catch (_) {}
    }
    return Response.redirect(`${returnUrl}?error=config`, 302);
  }

  try {
    const url = new URL(req.url);
    const SUPABASE_URL = getSupabaseUrl(req);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state') || '';
    let returnUrl = '/admin/leave';
    let userId = '';

    if (state) {
      try {
        const decoded = JSON.parse(atob(state));
        if (decoded.userId) userId = decoded.userId;
        if (decoded.returnUrl) returnUrl = decoded.returnUrl;
      } catch (_) {
        returnUrl = '/admin/leave?error=invalid_state';
      }
    }

    if (!code || !userId) {
      return Response.redirect(`${returnUrl}?error=missing_code`, 302);
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return Response.redirect(`${returnUrl}?error=token_failed`, 302);
    }

    const tokenData = await tokenRes.json();
    const refreshToken = tokenData.refresh_token;
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 3600;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    if (!refreshToken) {
      return Response.redirect(`${returnUrl}?error=no_refresh_token`, 302);
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supabase.from('user_calendar_settings').upsert(
      {
        user_id: userId,
        refresh_token: refreshToken,
        access_token: accessToken,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      return Response.redirect(`${returnUrl}?error=db_failed&detail=${encodeURIComponent(String(error.code || error.message).slice(0, 100))}`, 302);
    }

    return Response.redirect(`${returnUrl}?calendar=connected`, 302);
  } catch (e) {
    return Response.redirect('/admin/leave?error=callback_failed', 302);
  }
});
