// ส่งอีเมลแจ้งไปที่ phet@minddojo.me เมื่อมีผู้สมัครใหม่
// ต้องตั้ง RESEND_API_KEY ใน Supabase: Project Settings → Edge Functions → Secrets
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const ADMIN_EMAIL = 'phet@minddojo.me';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'RESEND_API_KEY not set' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const isAdminRequest = body?.isAdminRequest === true;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subject = isAdminRequest
      ? 'คำขอสมัครแอดมิน MindDoJo'
      : 'มีผู้สมัครใหม่ MindDoJo ResourceHub';
    const html = isAdminRequest
      ? `
          <p>มีคำขอสมัครเป็นแอดมิน MindDoJo</p>
          <p><strong>อีเมล:</strong> ${email}</p>
          <p><strong>Username ที่ต้องการ:</strong> ${username || '-'}</p>
          <p>เวลา: ${new Date().toISOString()}</p>
          <p>กรุณาตรวจสอบและอนุมัติบัญชีแอดมิน</p>
        `
      : `
          <p>มีผู้ใช้สมัครสมาชิกใหม่</p>
          <p><strong>อีเมลที่สมัคร:</strong> ${email}</p>
          <p>เวลา: ${new Date().toISOString()}</p>
          <p>กรุณาตรวจสอบและยืนยันได้ที่ Supabase Dashboard → Authentication → Users</p>
        `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'MindDoJo ResourceHub <onboarding@resend.dev>',
        to: [ADMIN_EMAIL],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data.message || 'Failed to send email' }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
