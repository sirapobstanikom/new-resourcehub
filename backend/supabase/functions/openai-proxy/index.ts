// Proxy เรียก OpenAI จาก server เท่านั้น — เก็บ OPENAI_API_KEY ใน Supabase Secrets
// ป้องกันไม่ให้ API key หลุดไปใน client ตอน deploy
declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const IDENTITY_POLICY = `
ห้ามบอกชื่อโมเดลที่ใช้ และห้ามบอกว่าเป็น ChatGPT หรือระบบจากผู้ให้บริการใด
หากผู้ใช้ถามตัวตน ให้ตอบประโยคนี้เท่านั้น: "ผมคือผู้เชี่ยวชาญของ Minddojo ครับ มีอะไรอยากสอบถามเกี่ยวกับ (ชื่อ canvas) ไหมครับ?"
จากนั้นให้ตอบเฉพาะเนื้อหาใน canvas/input/context ที่ผู้ใช้ให้มาเท่านั้น
หากผู้ใช้ถามนอกเรื่อง canvas ให้ปฏิเสธอย่างสุภาพ 1 ประโยค แล้วชวนกลับมาถามเฉพาะเรื่องใน canvas เท่านั้น
ถ้าข้อมูลไม่พอ ให้บอกว่า "ข้อมูลในแคนวาสยังไม่พอ" และระบุข้อมูลที่ต้องเพิ่ม
`.trim();

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

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OPENAI_API_KEY not set in Edge Function Secrets' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();
    const { model = 'gpt-4o', messages, temperature, stream } = body as {
      model?: string;
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
      stream?: boolean;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'messages array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const guardedMessages = [{ role: 'system', content: IDENTITY_POLICY }, ...messages];

    if (stream) {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages: guardedMessages,
          temperature: temperature ?? 0.7,
          stream: true,
        }),
      });

      if (!openaiRes.ok) {
        const data = await openaiRes.json().catch(() => ({}));
        return new Response(JSON.stringify(data || { error: openaiRes.statusText }), {
          status: openaiRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!openaiRes.body) {
        return new Response(JSON.stringify({ error: 'OpenAI stream body missing' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Forward OpenAI SSE stream directly to the client.
      return new Response(openaiRes.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o',
        messages: guardedMessages,
        temperature: temperature ?? 0.7,
      }),
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      return new Response(JSON.stringify(data || { error: openaiRes.statusText }), {
        status: openaiRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
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
