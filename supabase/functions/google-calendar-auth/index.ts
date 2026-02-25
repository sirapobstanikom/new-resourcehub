// ส่ง redirect ไป Google OAuth เพื่อเชื่อมต่อ Calendar
// ต้องตั้ง GOOGLE_CLIENT_ID ใน Supabase Edge Functions → Secrets
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
// SUPABASE_URL มักถูก inject โดย Supabase; ถ้าไม่มี ใช้จาก request URL
function getSupabaseUrl(req: Request): string {
  const fromEnv = Deno.env.get('SUPABASE_URL');
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!GOOGLE_CLIENT_ID) {
    return new Response(
      JSON.stringify({ error: 'GOOGLE_CLIENT_ID not set. ตั้งใน Supabase Dashboard → Edge Functions → Secrets' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const url = new URL(req.url);
    const state = url.searchParams.get('state') || '';
    if (!state) {
      return new Response(
        JSON.stringify({ error: 'state (base64 userId,returnUrl) required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = getSupabaseUrl(req);

    const redirectUri = `${SUPABASE_URL}/functions/v1/google-calendar-callback`;
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPE);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        Location: authUrl.toString(),
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
