
import { supabaseFunctionsUrl, supabaseAnonKey } from '../lib/supabase';

async function callOpenAIProxy(messages: Array<{ role: string; content: string }>, temperature = 0.7) {
  if (!supabaseFunctionsUrl || !supabaseAnonKey) {
    throw new Error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  const response = await fetch(`${supabaseFunctionsUrl}/functions/v1/openai-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ model: 'gpt-4o', messages, temperature }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error || response.statusText);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export async function getToolInsights(toolName: string, userContext: string = "") {
  const systemPrompt = `As an Innovation Expert, provide a high-level summary and actionable steps for using the tool: "${toolName}". 
  Format the response with:
  1. What it is (brief)
  2. Why it matters
  3. 3-5 Actionable steps to start
  Keep it professional, encouraging, and concise. Use Markdown.`;

  try {
    const content = await callOpenAIProxy([
      { role: 'system', content: 'You are a professional Innovation Consultant.' },
      { role: 'user', content: `${systemPrompt}${userContext ? `\n\nUser context: ${userContext}` : ""}` }
    ], 0.7);
    return content || 'Failed to fetch AI insights.';
  } catch (error) {
    return "Failed to fetch AI insights. Please check Supabase config and openai-proxy (OPENAI_API_KEY in Secrets).";
  }
}

export type LeadershipRating = 'S' | 'ME' | 'AFI' | 'ASD';

export interface LeadershipResultPayload {
  user: { name: string; email: string; company: string };
  results: Record<string, Record<string, LeadershipRating>>;
}

export async function getLeadershipFeedback(payload: LeadershipResultPayload): Promise<string> {
  const resultsText = Object.entries(payload.results)
    .map(([dimId, caps]) => {
      const capList = Object.entries(caps)
        .map(([capId, r]) => `${capId}: ${r}`)
        .join(', ');
      return `${dimId}: ${capList}`;
    })
    .join('\n');

  const systemPrompt = `You are a professional Leadership Coach. The user has completed "แบบประเมินสมรรถนะภาวะผู้นำ" (Dynamic Leadership Capability Wheel).
S = จุดแข็ง, ME = ดี, AFI = ควรพัฒนา, ASD = ต้องพัฒนาอย่างจริงจัง
คะแนน: ต้องพัฒนาอย่างจริงจัง=1, ควรพัฒนา=2, ดี=3, จุดแข็ง=4 — คะแนนสูงขึ้น = สมรรถนะด้านนั้นแข็งแกร่งขึ้น
ให้ feedback เป็นภาษาไทย:
1. สรุปภาพรวมสมรรถนะ (2-3 ประโยค)
2. จุดแข็งที่ควรใช้ต่อ (ตาม S / คะแนนสูง)
3. ด้านที่ควรพัฒนา (ตาม AFI/ASD / คะแนนต่ำ) พร้อมข้อเสนอแนะสั้นๆ 1-2 ข้อต่อด้าน
4. สรุปท้ายด้วยกำลังใจและขั้นตอนถัดไปที่แนะนำ
ใช้ภาษาที่เป็นกันเอง ชัดเจน และสร้างแรงบันดาลใจ.`;

  const userContent = `ผู้ประเมิน: ${payload.user.name}, อีเมล: ${payload.user.email}, บริษัท: ${payload.user.company}\n\nผลประเมินแต่ละด้าน:\n${resultsText}`;

  try {
    const content = await callOpenAIProxy([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ], 0.6);
    return content || 'ไม่สามารถสร้าง feedback ได้ในขณะนี้';
  } catch (error) {
    return 'ไม่สามารถโหลด feedback จาก AI ได้ กรุณาตรวจสอบการเชื่อมต่อและ Supabase (openai-proxy + OPENAI_API_KEY)';
  }
}
