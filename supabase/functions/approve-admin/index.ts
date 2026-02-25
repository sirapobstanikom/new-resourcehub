// อนุมัติคำขอแอดมิน: รับ token + รหัสผ่านที่ phet ตั้งให้ แล้วสร้างบัญชีแอดมิน
// เรียกจากหน้า /admin/approve?token=xxx (phet กดลิงก์ในเมลแล้วตั้งรหัสผ่านให้แอดมินคนนั้น)
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const SALT = 'minddojo-admin-v1';

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(SALT + password);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: 'Server config missing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const token = typeof body?.token === 'string' ? body.token.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!token || !password || password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'token and password (min 6 chars) required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: requests, error: fetchErr } = await supabase
      .from('admin_signup_requests')
      .select('id, email, username, status')
      .eq('token', token)
      .limit(1);

    if (fetchErr || !requests?.length) {
      return new Response(
        JSON.stringify({ error: 'ไม่พบคำขอหรือ token หมดอายุ' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const row = requests[0];
    if (row.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'คำขอนี้ได้รับการอนุมัติไปแล้ว' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const passwordHash = await hashPassword(password);

    const { error: insertErr } = await supabase.from('admin_users').insert({
      username: row.username,
      email: row.email,
      password_hash: passwordHash,
    });

    if (insertErr) {
      if (insertErr.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'username นี้มีในระบบแล้ว' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase
      .from('admin_signup_requests')
      .update({ status: 'approved' })
      .eq('id', row.id);

    return new Response(
      JSON.stringify({ ok: true, message: 'อนุมัติแล้ว แอดมินคนนี้สามารถเข้าสู่ระบบได้' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
