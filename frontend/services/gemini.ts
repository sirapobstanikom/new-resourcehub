
import { supabaseFunctionsUrl, supabaseAnonKey } from '../lib/supabase';
import type { MindDojoDimensionKey } from '../data/mindDojoDimensions';

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

async function callOpenAIProxyStream(
  messages: Array<{ role: string; content: string }>,
  temperature = 0.7,
  onDelta: (delta: string) => void,
): Promise<string> {
  if (!supabaseFunctionsUrl || !supabaseAnonKey) {
    throw new Error('Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const response = await fetch(`${supabaseFunctionsUrl}/functions/v1/openai-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ model: 'gpt-4o', messages, temperature, stream: true }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error || response.statusText);
  }

  if (!response.body) {
    throw new Error('OpenAI stream body missing');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  let full = '';
  let buffer = '';
  let finished = false;

  while (!finished) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;

    buffer += decoder.decode(value, { stream: true });

    // SSE is line-based: data: <json> \n
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      const line = rawLine.trim().replace(/\r$/, '');
      if (!line.startsWith('data:')) continue;

      const payload = line.slice('data:'.length).trim();
      if (payload === '[DONE]') {
        finished = true;
        break;
      }

      try {
        const json = JSON.parse(payload) as any;
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta.length > 0) {
          full += delta;
          onDelta(delta);
        }
      } catch {
        // ignore malformed partial JSON
      }
    }
  }

  return full;
}

/** เรียก OpenAI ผ่าน Supabase Edge Function — ใช้กับแชท/เวิร์กโฟลว์ที่ต้องการข้อความดิบ */
export async function openaiChat(
  messages: Array<{ role: string; content: string }>,
  temperature = 0.7,
): Promise<string> {
  return callOpenAIProxy(messages, temperature);
}

/** เรียก OpenAI แบบ stream (SSE) แล้วส่ง token delta ให้ UI ค่อยๆ เติม */
export async function openaiChatStream(
  messages: Array<{ role: string; content: string }>,
  temperature = 0.7,
  onDelta: (delta: string) => void,
): Promise<string> {
  return callOpenAIProxyStream(messages, temperature, onDelta);
}

export type MindDojoProfile = {
  name: string;
  position: string;
  industry: string;
  experienceLevel: string;
};

export type MindDojoScenario = {
  userRole: string;
  counterpart: string;
  context: string;
  situationSummary: string;
};

export type MindDojoDimensionScore = {
  score: number;
  brief: string;
};

export type MindDojoStructuredReport = {
  overall: number;
  dimensions: Record<MindDojoDimensionKey, MindDojoDimensionScore>;
  strengths: string[];
  improvements: string[];
  narrative: string;
};

/** เก็บใน sessionStorage สำหรับหน้า /assessment/minddojo/result */
export type MindDojoStoredReportPayload = {
  savedAt: number;
  profile: MindDojoProfile;
  scenario: MindDojoScenario;
  report: MindDojoStructuredReport;
};

const MINDDOJO_JSON_OPEN = '[[MINDDOJO_JSON]]';
const MINDDOJO_JSON_CLOSE = '[[/MINDDOJO_JSON]]';

function clampScore(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function normalizeDimension(
  raw: unknown,
): { score: number; brief: string } {
  if (raw && typeof raw === 'object' && 'score' in raw) {
    const o = raw as { score?: unknown; brief?: unknown };
    return {
      score: clampScore(o.score),
      brief: typeof o.brief === 'string' ? o.brief : '',
    };
  }
  return { score: 0, brief: '' };
}

function reportFromParsedObject(o: Record<string, unknown>): MindDojoStructuredReport | null {
  if (!o || typeof o !== 'object') return null;
  const dims = (o.dimensions || {}) as Record<string, unknown>;
  const keys: MindDojoDimensionKey[] = [
    'clarity',
    'structure',
    'empathy',
    'activeListening',
    'persuasion',
    'professionalTone',
  ];
  const dimensions = {} as Record<MindDojoDimensionKey, MindDojoDimensionScore>;
  for (const k of keys) {
    dimensions[k] = normalizeDimension(dims[k]);
  }
  const strengths = Array.isArray(o.strengths)
    ? o.strengths.filter((x): x is string => typeof x === 'string')
    : [];
  const improvements = Array.isArray(o.improvements)
    ? o.improvements.filter((x): x is string => typeof x === 'string')
    : [];
  return {
    overall: clampScore(o.overall),
    dimensions,
    strengths,
    improvements,
    narrative: typeof o.narrative === 'string' ? o.narrative : '',
  };
}

function tryParseReportJsonString(inner: string): MindDojoStructuredReport | null {
  try {
    const o = JSON.parse(inner) as Record<string, unknown>;
    return reportFromParsedObject(o);
  } catch {
    return null;
  }
}

function parseMindDojoReportJson(raw: string): MindDojoStructuredReport | null {
  const start = raw.indexOf(MINDDOJO_JSON_OPEN);
  const end =
    start === -1 ? -1 : raw.indexOf(MINDDOJO_JSON_CLOSE, start + MINDDOJO_JSON_OPEN.length);
  if (start !== -1 && end !== -1) {
    const inner = raw.slice(start + MINDDOJO_JSON_OPEN.length, end).trim();
    const r = tryParseReportJsonString(inner);
    if (r) return r;
  }
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    const r = tryParseReportJsonString(fenced[1].trim());
    if (r) return r;
  }
  if (trimmed.startsWith('{')) {
    const r = tryParseReportJsonString(trimmed);
    if (r) return r;
  }
  return null;
}

/** รายงานโครงสร้างสำหรับ Dashboard — 6 มิติตาม MindDoJo Communication rubric */
export async function getMindDojoStructuredReport(input: {
  profile: MindDojoProfile;
  scenario: MindDojoScenario;
  simulationTranscript: string;
}): Promise<MindDojoStructuredReport | null> {
  const systemPrompt = `คุณเป็นผู้ประเมินด้านการสื่อสารในองค์กร (MindDoJo AI Assessment)
คุณได้รับเฉพาะ transcript การจำลองสถานการณ์ของผู้ใช้ — ห้ามสมมติข้อเท็จจริงนอก transcript / โปรไฟล์ / สถานการณ์ที่ให้

**เกณฑ์ให้คะแนน (0–100 ต่อมิติ)** ต้องอิงพฤติกรรมที่เห็นใน transcript เท่านั้น:
1) clarity — ความชัดเจนในการสื่อสาร (ประเด็นหลัก ภาษาเข้าใจง่าย ไม่คลุมเครือ)
2) structure — โครงสร้างการพูด/การเรียบเรียง (ลำดับความคิด เหตุผล ข้อเสนอ)
3) empathy — ความเข้าใจและใส่ใจความรู้สึกอีกฝ่าย
4) activeListening — การฟังและตอบสนองอย่างตั้งใจ (ถามต่อ สะท้อน อ้างอิงสิ่งที่อีกฝ่ายพูด)
5) persuasion — ความสามารถในการโน้มน้าว (เหตุผล ประโยชน์ร่วม ความเกี่ยวข้อง)
6) professionalTone — น้ำเสียงความเป็นมืออาชีพ (สุภาพ ควบคุมอารมณ์ เหมาะบริบทงาน)

คำนวณ overall เป็น 0–100 โดยสะท้อนภาพรวมทั้ง 6 มิติ (ไม่จำเป็นต้องเป็นเฉลี่ยเลขตรงๆ แต่ต้องสอดคล้อง)

ตอบ **เฉพาะ** บล็อก JSON เดียวตามรูปแบบนี้ (ไม่มี markdown code fence ภายนอก ไม่มีข้อความอื่นนอกบล็อก):

${MINDDOJO_JSON_OPEN}
{
  "overall": 0,
  "dimensions": {
    "clarity": { "score": 0, "brief": "ภาษาไทย 1 ประโยค" },
    "structure": { "score": 0, "brief": "..." },
    "empathy": { "score": 0, "brief": "..." },
    "activeListening": { "score": 0, "brief": "..." },
    "persuasion": { "score": 0, "brief": "..." },
    "professionalTone": { "score": 0, "brief": "..." }
  },
  "strengths": ["ข้อความไทย 3–5 ข้อ"],
  "improvements": ["ข้อความไทย 3–5 ข้อ"],
  "narrative": "ข้อความยาวเป็นภาษาไทย: วิเคราะห์เป็นช่วงตามบทสนทนา ยกตัวอย่างจาก transcript แนวทางฝึกและ framework สั้นๆ ปิดท้ายย้ำว่าใช้เพื่อพัฒนา ไม่ใช่การตัดสิน และไม่ครอบคลุมทุกทักษะ — น้ำเสียงมืออาชีพ อบอุ่น"
}
${MINDDOJO_JSON_CLOSE}

กฎ: brief แต่ละมิติต้องอ้างอิงสิ่งที่ผู้ใช้พูดหรือทำใน transcript ได้จริง ถ้าไม่มีหลักฐานให้คะแนนต่ำและบอกชัดว่าขาดข้อมูลใน transcript`;

  const userContent = `ข้อมูลผู้ใช้ (จากการสนทนา profiling):
- ชื่อ: ${input.profile.name}
- ตำแหน่ง/เป้าหมาย: ${input.profile.position}
- อุตสาหกรรม/บริบท: ${input.profile.industry}
- ระดับประสบการณ์: ${input.profile.experienceLevel}

สถานการณ์ที่จำลอง:
- บทบาทผู้ใช้: ${input.scenario.userRole}
- คู่สนทนา: ${input.scenario.counterpart}
- บริบท: ${input.scenario.context}
- สรุปสถานการณ์: ${input.scenario.situationSummary}

Transcript การจำลอง (ลำดับเวลา):
${input.simulationTranscript}`;

  try {
    const content = await callOpenAIProxy(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      0.35,
    );
    if (!content) return null;
    return parseMindDojoReportJson(content);
  } catch {
    return null;
  }
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

export interface DigitalLeadershipDimensionScore {
  title: string;
  score: number;
}

export interface DigitalLeadershipResultPayload {
  user: { name: string; email: string; company: string };
  rawSum: number;
  overallIndex: number;
  bandLevelEn: string;
  bandLine1Th: string;
  bandFocusTh: string;
  dimensions: DigitalLeadershipDimensionScore[];
}

export async function getDigitalLeadershipFeedback(
  payload: DigitalLeadershipResultPayload,
): Promise<string> {
  const dimLines = payload.dimensions
    .map((d) => `- ${d.title}: ${d.score} / 25 (ยิ่งสูงยิ่งสะท้อนความพร้อมในด้านนั้น)`)
    .join('\n');

  const systemPrompt = `You are an expert coach in digital leadership and responsible AI use in organizations.
The user completed "Digital Leadership Competency Assessment" (20 items, Likert 1–5 per item).
Overall index is on scale 5–25 (sum of all 20 responses divided by 4). Each of 4 dimensions also scores 5–25 (5 items × 1–5).
Bands: Beginner (index < 11), Developing (11–17), Advanced (18–21), AI Leader (≥22).

Write feedback in Thai for this one person. Rules:
- Tone: friendly, clear, professional, encouraging; address them by first name if natural from the given name
- Base everything only on the numeric results and dimension titles provided; do not invent past events or job facts
- Structure (plain text, use newlines; optional short bullets):
  1) สรุปภาพรวมระดับและความหมายสั้น ๆ (2–4 ประโยค)
  2) จุดแข็ง: อ้างอิงมิติที่คะแนนสูงกว่ามิติอื่นอย่างชัดเจน
  3) ช่องว่างที่ควรพัฒนา: มิติที่คะแนนต่ำกว่า หรือใกล้เคียงกันแต่ยังมีโอกาสเติบโต
  4) คำแนะนำเชิงปฏิบัติ 3–5 ข้อ (เช่น การเรียนรู้, การลองใช้ AI, การนำทีม, governance) ให้สอดคล้องกับระดับปัจจุบัน
  5) ปิดท้าย: กำลังใจ + next step ที่ทำได้ภายใน 1–2 สัปดาห์
- Do not repeat the raw numbers in a table; weave them into sentences naturally.`;

  const userContent = `ผู้ประเมิน: ${payload.user.name}
อีเมล: ${payload.user.email}
บริษัท: ${payload.user.company}

ดัชนีรวม (5–25): ${payload.overallIndex.toFixed(1)} | คะแนนดิบรวม (20–100): ${payload.rawSum}
ระดับสรุป: ${payload.bandLevelEn}
คำอธิบายระดับ: ${payload.bandLine1Th}
โฟกัสพัฒนาตามเกณฑ์: ${payload.bandFocusTh}

คะแนนแต่ละมิติ (5–25):
${dimLines}`;

  try {
    const content = await callOpenAIProxy(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      0.55,
    );
    return content || 'ไม่สามารถสร้าง feedback ได้ในขณะนี้';
  } catch {
    return 'ไม่สามารถโหลด feedback จาก AI ได้ กรุณาตรวจสอบการเชื่อมต่อและ Supabase (openai-proxy + OPENAI_API_KEY)';
  }
}

export type DiscType = 'D' | 'I' | 'S' | 'C';

export interface DiscFeedbackPayload {
  user: { name: string; email: string; company: string };
  scores: Record<DiscType, number>;
  primaryType: DiscType;
  ranking: DiscType[];
}

export async function getDiscFeedback(payload: DiscFeedbackPayload): Promise<string> {
  const top2 = payload.ranking.slice(0, 2).join(' และ ');
  const bottom2 = payload.ranking.slice(-2).join(' และ ');

  const scoresText = Object.entries(payload.scores)
    .map(([t, s]) => `${t}: ${s}`)
    .join(', ');

  const systemPrompt = `You are a professional DISC coach.
Write feedback in Thai for an individual user based on their DISC assessment results.

Rules:
- Tone: friendly, clear, professional, encouraging
- Avoid hallucinating specific facts about the user; only use provided inputs
- Output format (plain text, use newlines):
  1) สรุปภาพรวม (2-3 ประโยค)
  2) จุดแข็งที่ควรใช้ (2-3 bullet)
  3) สิ่งที่ควรพัฒนา (2-3 bullet)
  4) คำแนะนำการทำงาน/สื่อสาร (3 bullet)
  5) ปิดท้าย: กำลังใจ + next step 1-2 ประโยค
`;

  const userContent = `ผู้ประเมิน: ${payload.user.name}
อีเมล: ${payload.user.email}
บริษัท: ${payload.user.company}

ผล DISC:
- บุคลิกภาพหลัก: ${payload.primaryType}
- อันดับคะแนนสูงสุด: ${top2}
- ด้านที่ควรพัฒนา (ต่ำสุด): ${bottom2}
- คะแนนรวมต่อประเภท: ${scoresText}

ช่วยเขียน feedback ให้ตรงกับผลด้านบนโดยเน้นการนำไปใช้ได้จริง`;

  try {
    const content = await callOpenAIProxy(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      0.55,
    );
    return content || 'ไม่สามารถสร้าง feedback ได้ในขณะนี้';
  } catch (error) {
    return 'ไม่สามารถโหลด feedback จาก AI ได้ กรุณาตรวจสอบการเชื่อมต่อและ Supabase (openai-proxy + OPENAI_API_KEY)';
  }
}
