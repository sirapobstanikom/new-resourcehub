import { openaiChat } from './openai';
import {
  FACE_METRIC_IDS,
  FACE_METRIC_LABELS,
  FACE_MOOD_IDS,
  FACE_MOODS,
  MOOD_FORMULAS,
  metricDeviations,
  metricLevels,
  type FaceMetricId,
  type FaceMetrics,
  type FaceMoodId,
  type FaceMoodScores,
  type FaceNorms,
} from '../lib/faceMoodData';

export interface FaceMoodAiVerdict {
  moodId: FaceMoodId;
  moodScores: FaceMoodScores;
  summary: string;
  tip: string;
}

const AI_TIMEOUT_MS = 20000;

/** คำอธิบายว่าค่านี้วัดอะไร (ส่งให้ AI เข้าใจทิศทางของตัวเลข) */
const METRIC_MEANINGS: Record<FaceMetricId, string> = {
  cornerDrop: 'ระดับมุมปากเทียบกลางริมฝีปาก (โครงหน้า)',
  mouthAsym: 'ความต่างของความสูงมุมปากซ้าย-ขวา (โครงหน้า)',
  lipThickness: 'ความหนาริมฝีปากตอนปิดปาก (โครงหน้า)',
  eyeOpen: 'ความกว้างของช่องตา (โครงหน้า)',
  browHeight: 'ระยะคิ้วถึงตา (โครงหน้า)',
  browSlant: 'หัวคิ้วสูงกว่าหางคิ้วแค่ไหน (โครงหน้า)',
  browGap: 'ระยะห่างระหว่างหัวคิ้วสองข้าง (โครงหน้า)',
  smile: 'แรงกล้ามเนื้อยิ้มขณะสแกน (กล้ามเนื้อชั่วขณะ)',
  jawOpen: 'การเผยอปาก (กล้ามเนื้อชั่วขณะ)',
  browDown: 'แรงกล้ามเนื้อขมวดคิ้ว (กล้ามเนื้อชั่วขณะ)',
  browInnerUp: 'แรงกล้ามเนื้อยกหัวคิ้ว (กล้ามเนื้อชั่วขณะ)',
  eyeSquint: 'แรงหรี่ตา (กล้ามเนื้อชั่วขณะ)',
  lipPress: 'แรงเม้มปาก (กล้ามเนื้อชั่วขณะ)',
  mouthFrown: 'แรงดึงมุมปากลง (กล้ามเนื้อชั่วขณะ)',
  noseSneer: 'แรงย่นจมูก (กล้ามเนื้อชั่วขณะ)',
  upperLipRaise: 'แรงยกริมฝีปากบน (กล้ามเนื้อชั่วขณะ)',
  smileAsym: 'ความต่างของแรงยิ้มซ้าย-ขวา (กล้ามเนื้อชั่วขณะ)',
};

/** นิยามอารมณ์พื้นฐานตาม Ekman */
const EKMAN_DEFINITIONS: Record<FaceMoodId, string> = {
  happiness: 'ความสุข ความพอใจ — ยิ้ม มุมปากยก',
  sadness: 'ความเศร้า ผิดหวัง สูญเสีย — มุมปากลู่ลง หัวคิ้วยก หน้าดูห่อเหี่ยว',
  fear: 'ความกลัวต่อภัยหรืออันตราย — ตาเบิกกว้าง อ้าปาก กล้ามเนื้อเกร็ง',
  anger: 'ความโกรธจากความไม่ยุติธรรมหรือความคับข้องใจ — คิ้วต่ำชิดกัน ตาแคบจ้อง ปากเม้ม',
  surprise: 'ความประหลาดใจต่อเรื่องที่ไม่คาดคิด — ตาเบิกกว้าง คิ้วยกสูง อ้าปาก',
  contempt: 'การดูแคลนหรือเหยียด — ยิ้มมุมปากข้างเดียว หรือยกริมฝีปากข้างเดียว',
  disgust: 'ความรังเกียจต่อสิ่งที่น่าขยะแขยง — ย่นจมูก ยกริมฝีปากบน หน้าบึ้ง',
};

const moodCues = (mood: FaceMoodId) =>
  (Object.entries(MOOD_FORMULAS[mood]) as [FaceMetricId, number][])
    .map(([id, w]) => (w > 0 ? FACE_METRIC_LABELS[id].high : FACE_METRIC_LABELS[id].low))
    .join(', ');

const SYSTEM_PROMPT = `คุณคือผู้เชี่ยวชาญด้านการอ่านใบหน้าตามทฤษฎี 7 อารมณ์พื้นฐานสากลของ Paul Ekman และระบบ FACS
รวมถึงงานวิจัยที่พบว่าหน้านิ่ง (resting face) ที่โครงหน้าคล้ายสัญญาณของอารมณ์ใด คนอื่นจะอ่านหน้านั้นเป็นอารมณ์นั้น (emotion overgeneralization)
คุณจะได้รับค่าที่ระบบวัดจากใบหน้าจริงของผู้ใช้ขณะทำหน้านิ่ง เทียบกับกลุ่มคนทั่วไปเป็นเปอร์เซ็นไทล์ (50 = เท่าคนทั่วไป, 90 = มากกว่าคนส่วนใหญ่, 10 = น้อยกว่าคนส่วนใหญ่)
หน้าที่: สรุปว่าหน้านิ่งนี้ "ดูคล้ายอารมณ์ไหน" ในสายตาคนอื่น เลือก 1 ใน 7 อารมณ์

7 อารมณ์ตาม Ekman และค่าที่วัดได้ซึ่งตรงกับสัญญาณของอารมณ์นั้น:
${FACE_MOOD_IDS.map((id) => `- ${id} (${FACE_MOODS[id].title}): ${EKMAN_DEFINITIONS[id]} | ค่าที่บ่งชี้: ${moodCues(id)}`).join('\n')}

หลักการตัดสิน:
- ให้น้ำหนักค่าโครงหน้ามากกว่าค่ากล้ามเนื้อชั่วขณะ เพราะผู้ใช้ทำหน้านิ่ง
- ค่าที่ห่างจาก 50 มาก (ต่ำกว่า 25 หรือสูงกว่า 75) สำคัญกว่าค่าที่ใกล้ 50
- ถ้ากล้ามเนื้อยิ้มสูง ค่าคิ้วต่ำ/ตาหรี่/ปากบางที่ตามมาเป็นผลของการยิ้ม ไม่ใช่สัญญาณของความโกรธหรือรังเกียจ
- fear กับ surprise ต่างกันที่คิ้ว: surprise คิ้วยกสูงทั้งแนว, fear หัวคิ้วยกและชิดกัน (คิ้วลู่)
- contempt ต้องมีความไม่สมมาตรของมุมปาก, disgust ต้องมีสัญญาณที่จมูกหรือริมฝีปากบน
- ดูภาพรวมหลายค่าร่วมกัน ไม่ตัดสินจากค่าเดียว
- ห้ามกล่าวถึงบุคลิกภาพ นิสัย หรือความสามารถจริงของผู้ใช้ และห้ามบอกว่าผู้ใช้รู้สึกอารมณ์นั้นจริง พูดเฉพาะ "หน้านิ่งดูคล้ายอารมณ์ไหน" และผลต่อความรู้สึกของคนที่เห็น ใช้น้ำเสียงเป็นมิตร ไม่ตัดสิน

ตอบเป็น JSON อย่างเดียว ไม่มีข้อความอื่น:
{"mood":"<หนึ่งใน ${FACE_MOOD_IDS.join(', ')}>","scores":{${FACE_MOOD_IDS.map((id) => `"${id}":0`).join(',')}},"summary":"ภาษาไทย 2–3 ประโยค อธิบายด้วยภาษาง่าย ๆ ว่าลักษณะไหนของใบหน้าทำให้ดูเป็นแบบนี้ ห้ามใส่ตัวเลข เปอร์เซ็นไทล์ หรือค่า z เรียกผู้ใช้ว่า 'คุณ'","tip":"ภาษาไทย 1–2 ประโยค คำแนะนำการใช้สีหน้าในการสื่อสารที่ทำงาน"}
scores คือความน่าจะเป็นของแต่ละแบบ (0–100) รวมกันได้ 100 และ mood ต้องเป็นแบบที่ได้คะแนนสูงสุด`;

const parseJson = (raw: string): Record<string, unknown> | null => {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/** ให้ GPT สรุปแบบหน้าจากค่าที่วัดได้ (ส่งเฉพาะตัวเลข ไม่ส่งรูป) — คืน null ถ้าเรียกไม่สำเร็จหรือคำตอบใช้ไม่ได้ */
export async function getFaceMoodVerdict(metrics: FaceMetrics, norms: FaceNorms): Promise<FaceMoodAiVerdict | null> {
  const levels = metricLevels(metrics, norms);
  const z = metricDeviations(metrics, norms);
  const measurements = FACE_METRIC_IDS.map(
    (id) =>
      `- ${METRIC_MEANINGS[id]}: เปอร์เซ็นไทล์ ${Math.round(levels[id] * 100)} (${levels[id] >= 0.5 ? FACE_METRIC_LABELS[id].high : FACE_METRIC_LABELS[id].low}, z = ${z[id].toFixed(2)})`,
  ).join('\n');

  try {
    const raw = await Promise.race([
      openaiChat(
        [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `ค่าที่วัดได้จากหน้านิ่งของผู้ใช้ (ค่ากลางจากทุกเฟรมที่หน้าตรงระหว่างสแกน):\n${measurements}` },
        ],
        0.2,
      ),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), AI_TIMEOUT_MS)),
    ]);
    const json = parseJson(raw);
    if (!json) return null;

    const rawScores = (json.scores ?? {}) as Record<string, unknown>;
    const values = FACE_MOOD_IDS.map((id) => Math.max(Number(rawScores[id]) || 0, 0));
    const total = values.reduce((a, b) => a + b, 0);
    if (total <= 0) return null;
    const moodScores = Object.fromEntries(FACE_MOOD_IDS.map((id, i) => [id, values[i] / total])) as FaceMoodScores;
    const moodId = FACE_MOOD_IDS.reduce((best, id) => (moodScores[id] > moodScores[best] ? id : best), FACE_MOOD_IDS[0]);

    return {
      moodId,
      moodScores,
      summary: typeof json.summary === 'string' ? json.summary.trim() : '',
      tip: typeof json.tip === 'string' ? json.tip.trim() : '',
    };
  } catch {
    return null;
  }
}
