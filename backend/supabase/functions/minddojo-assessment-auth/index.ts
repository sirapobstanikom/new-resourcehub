/// <reference path="../esm-sh-supabase.d.ts" />
// สมัคร / เข้าสู่ระบบ MindDoJo AI Assessment + แอดมินอนุมัติ username (แยกตารางจาก admin)
//
// Deploy: จากโฟลเดอร์ backend/supabase
//   npx supabase@latest functions deploy minddojo-assessment-auth
//   หรือใช้ --no-verify-jwt ถ้าไม่มี config.toml
// JWT verify ปิดใน backend/supabase/config.toml ([functions.minddojo-assessment-auth])
// หรือปิดใน Dashboard → Edge Functions → minddojo-assessment-auth
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SALT = 'minddojo-assessment-v1';

async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(SALT + password);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

function isValidUsername(u: string): boolean {
  return /^[a-z0-9_]{3,32}$/.test(u);
}

async function getUserFromJwt(req: Request): Promise<{ id: string; email: string | undefined } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ') || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const jwt = authHeader.slice(7);
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (error || !user) return null;
  return { id: user.id, email: user.email };
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

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Server configuration missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const action = typeof body?.action === 'string' ? body.action : '';

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === 'register') {
      const username = normalizeUsername(typeof body?.username === 'string' ? body.username : '');
      const password = typeof body?.password === 'string' ? body.password : '';
      if (!isValidUsername(username)) {
        return new Response(
          JSON.stringify({
            error: 'Username ใช้ได้เฉพาะ a-z ตัวเลข _ ความยาว 3–32 ตัว',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (password.length < 6) {
        return new Response(JSON.stringify({ error: 'รหัสผ่านอย่างน้อย 6 ตัวอักษร' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: existing } = await svc
        .from('minddojo_assessment_accounts')
        .select('id, status')
        .eq('username', username)
        .maybeSingle();

      const passwordHash = await hashPassword(password);

      if (existing) {
        if (existing.status === 'approved') {
          return new Response(JSON.stringify({ error: 'Username นี้มีบัญชีแล้ว ให้เข้าสู่ระบบ' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (existing.status === 'pending') {
          return new Response(JSON.stringify({ error: 'Username นี้อยู่ระหว่างรออนุมัติจากแอดมิน' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const { error: upErr } = await svc
          .from('minddojo_assessment_accounts')
          .update({
            password_hash: passwordHash,
            status: 'pending',
            rejected_at: null,
            approved_at: null,
          })
          .eq('id', existing.id);
        if (upErr) {
          return new Response(JSON.stringify({ error: upErr.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ ok: true, message: 'ส่งคำขอสมัครใหม่แล้ว รอแอดมินอนุมัติ' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: insErr } = await svc.from('minddojo_assessment_accounts').insert({
        username,
        password_hash: passwordHash,
        status: 'pending',
      });
      if (insErr) {
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ ok: true, message: 'สมัครสำเร็จ รอแอดมินอนุมัติ' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'login') {
      const username = normalizeUsername(typeof body?.username === 'string' ? body.username : '');
      const password = typeof body?.password === 'string' ? body.password : '';
      if (!username || !password) {
        return new Response(JSON.stringify({ error: 'กรอก username และรหัสผ่าน' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const passwordHash = await hashPassword(password);
      const { data: rows, error } = await svc
        .from('minddojo_assessment_accounts')
        .select('id, status, username')
        .eq('username', username)
        .eq('password_hash', passwordHash)
        .limit(1);

      if (error || !rows?.length) {
        return new Response(JSON.stringify({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const row = rows[0] as { status: string; username: string };
      if (row.status === 'pending') {
        return new Response(JSON.stringify({ error: 'บัญชียังรออนุมัติจากแอดมิน' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (row.status === 'rejected') {
        return new Response(JSON.stringify({ error: 'บัญชีถูกปฏิเสธ กรุณาสมัครใหม่หรือติดต่อแอดมิน' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ ok: true, username: row.username }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminUser = await getUserFromJwt(req);
    if (!adminUser) {
      return new Response(JSON.stringify({ error: 'ต้องเข้าสู่ระบบแอดมิน' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'admin_list') {
      const { data, error } = await svc
        .from('minddojo_assessment_accounts')
        .select('id, username, status, created_at, approved_at, rejected_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ ok: true, rows: data ?? [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'admin_approve') {
      const username = normalizeUsername(typeof body?.username === 'string' ? body.username : '');
      if (!username) {
        return new Response(JSON.stringify({ error: 'ต้องระบุ username' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const now = new Date().toISOString();
      const { data: updated, error } = await svc
        .from('minddojo_assessment_accounts')
        .update({ status: 'approved', approved_at: now, rejected_at: null })
        .eq('username', username)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!updated) {
        return new Response(JSON.stringify({ error: 'ไม่พบคำขอ pending สำหรับ username นี้' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'admin_reject') {
      const username = normalizeUsername(typeof body?.username === 'string' ? body.username : '');
      if (!username) {
        return new Response(JSON.stringify({ error: 'ต้องระบุ username' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const now = new Date().toISOString();
      const { data: updated, error } = await svc
        .from('minddojo_assessment_accounts')
        .update({ status: 'rejected', rejected_at: now })
        .eq('username', username)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!updated) {
        return new Response(JSON.stringify({ error: 'ไม่พบคำขอ pending สำหรับ username นี้' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'admin_delete') {
      const username = normalizeUsername(typeof body?.username === 'string' ? body.username : '');
      if (!username) {
        return new Response(JSON.stringify({ error: 'ต้องระบุ username' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: deleted, error } = await svc
        .from('minddojo_assessment_accounts')
        .delete()
        .eq('username', username)
        .select('id');
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!deleted?.length) {
        return new Response(JSON.stringify({ error: 'ไม่พบบัญชีนี้' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
