declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') || '';
const LINE_NOTIFY_ALL_FRIENDS = (Deno.env.get('LINE_NOTIFY_ALL_FRIENDS') || '').toLowerCase() === 'true';
const LINE_ADMIN_TARGET_IDS = (Deno.env.get('LINE_ADMIN_TARGET_IDS') || '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);
const APP_BASE_URL = (Deno.env.get('APP_BASE_URL') || '').replace(/\/$/, '');

const LEAVE_TYPE_LABELS: Record<string, string> = {
  personal_vacation: 'ลากิจ / ลาพักร้อน',
  personal: 'ลากิจ',
  vacation: 'ลาพักร้อน',
  sick: 'ลาป่วย',
  wfh: 'Work from Home',
  unpaid: 'ลาไม่รับเงินเดือน',
  other: 'ลาอื่นๆ',
};

type NotifyPayload = {
  event_type?: 'leave_created' | 'leave_cancel_requested' | 'leave_cancelled';
  leave_id?: string | null;
  user_display_name?: string | null;
  user_email?: string | null;
  leave_type?: string | null;
  slot_label?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  reason?: string | null;
  cancel_reason?: string | null;
};

function hasBearerToken(authHeader: string | null): boolean {
  const token = authHeader?.replace(/^Bearer\s+/i, '')?.trim();
  return Boolean(token);
}

function buildMessage(payload: NotifyPayload): string {
  const eventLabel =
    payload.event_type === 'leave_cancelled'
      ? 'ยกเลิกรายการลาแล้ว'
      : payload.event_type === 'leave_cancel_requested'
        ? 'มีคำขอยกเลิกการลา'
        : 'มีคำขอลาใหม่';
  const who = payload.user_display_name?.trim() || payload.user_email?.trim() || 'ไม่ระบุผู้ลา';
  const typeLabel =
    payload.leave_type === 'wfh' && /\[WFH_SWAP:\d{4}-\d{2}-\d{2}\]/.test(payload.reason || '')
      ? 'สลับวัน WFH'
      : LEAVE_TYPE_LABELS[payload.leave_type || ''] || payload.leave_type || '-';
  const slot = payload.slot_label?.trim() || '-';
  const dateRange =
    payload.start_date && payload.end_date
      ? payload.start_date === payload.end_date
        ? payload.start_date
        : `${payload.start_date} ถึง ${payload.end_date}`
      : '-';
  const note = payload.cancel_reason?.trim() || payload.reason?.trim() || '-';
  const link = APP_BASE_URL ? `${APP_BASE_URL}/admin/leave/manage` : '/admin/leave/manage';

  return [
    `แจ้งเตือนระบบลา: ${eventLabel}`,
    `ผู้ลา: ${who}`,
    `ประเภท: ${typeLabel}`,
    `ช่วงลา: ${slot}`,
    `วันที่: ${dateRange}`,
    `เหตุผล: ${note}`,
    `จัดการคำขอ: ${link}`,
  ].join('\n');
}

async function pushToLine(to: string, text: string): Promise<Response> {
  return fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to,
      messages: [{ type: 'text', text }],
    }),
  });
}

async function broadcastToLine(text: string): Promise<Response> {
  return fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messages: [{ type: 'text', text }],
    }),
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    return new Response(JSON.stringify({ error: 'LINE_CHANNEL_ACCESS_TOKEN not set' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!LINE_NOTIFY_ALL_FRIENDS && LINE_ADMIN_TARGET_IDS.length === 0) {
    return new Response(JSON.stringify({ error: 'LINE_ADMIN_TARGET_IDS not set' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!hasBearerToken(req.headers.get('Authorization'))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = (await req.json()) as NotifyPayload;
    const message = buildMessage(payload);

    if (LINE_NOTIFY_ALL_FRIENDS) {
      const r = await broadcastToLine(message);
      const bodyText = await r.text();
      return new Response(
        JSON.stringify({
          ok: r.ok,
          mode: 'broadcast_all_friends',
          result: { ok: r.ok, status: r.status, body: bodyText },
        }),
        {
          status: r.ok ? 200 : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const results: Array<{ to: string; ok: boolean; status: number; body: string }> = [];
    for (const to of LINE_ADMIN_TARGET_IDS) {
      const r = await pushToLine(to, message);
      const bodyText = await r.text();
      results.push({ to, ok: r.ok, status: r.status, body: bodyText });
    }
    const allOk = results.every((x) => x.ok);
    return new Response(JSON.stringify({ ok: allOk, results }), {
      status: allOk ? 200 : 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
