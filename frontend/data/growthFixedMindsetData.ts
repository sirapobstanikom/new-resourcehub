/**
 * Growth vs Fixed Mindset Assessment — 10 ข้อ · สเกล 4 ตัวเลือก (1–4)
 * คะแนนต่อข้อ 0–3 ตามแผนที่ของแต่ละข้อ · รวม 0–30
 */

export const GF_GROWTH_IMAGE_URL =
  'https://static.wixstatic.com/media/b96dd1_bfb5a3f1bf8b45d49f85c2c21d4c80f9~mv2.png';

export const GF_FIXED_IMAGE_URL =
  'https://static.wixstatic.com/media/b96dd1_24c1ea6a60674585862a8041355cfa1d~mv2.png';

export const GF_SCALE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'เห็นด้วยอย่างมาก',
  2: 'เห็นด้วย',
  3: 'ไม่เห็นด้วย',
  4: 'ไม่เห็นด้วยอย่างมาก',
};

export const GF_INTRO_DESCRIPTION = [
  'แบบประเมินนี้เป็นแบบประเมินเพื่อนำ Mindset ที่ระบุได้เพียงคร่าวๆ ว่าคุณนั้นชื่นชอบหรือมีลักษณะความเชื่อที่ผลต่อพฤติกรรมอย่างไร',
  'โดยแบบประเมินนี้ไม่ได้เป็นตัวตัดสินว่าคุณดีหรือไม่ดี ถูกต้องหรือไม่ถูกต้อง เพราะแบบประเมินนี้จะช่วยสะท้อนจุดแข็งและจุดอ่อนของแต่ละคนที่มีแตกต่างกันเพียงเท่านั้น',
  'คำชี้แจง: พิจารณาข้อความต่อไปนี้และเลือกว่าเห็นด้วยหรือไม่เห็นด้วยกับข้อความนี้ในระดับใด',
] as const;

/** คะแนนที่ได้จากตัวเลือก 1–4 ของแต่ละข้อ */
export const GF_SCORE_MAP: Record<number, [number, number, number, number]> = {
  1: [0, 1, 2, 3],
  2: [3, 2, 1, 0],
  3: [0, 1, 2, 3],
  4: [3, 2, 1, 0],
  5: [0, 1, 2, 3],
  6: [3, 2, 1, 0],
  7: [0, 1, 2, 3],
  8: [3, 2, 1, 0],
  9: [0, 1, 2, 3],
  10: [3, 2, 1, 0],
};

export type GfQuestionNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface GfQuestion {
  num: GfQuestionNum;
  text: string;
}

export const GF_QUESTIONS: GfQuestion[] = [
  { num: 1, text: 'ความฉลาดของคุณเป็นสิ่งที่มีมาตั้งแต่เกิดอยู่แล้ว ไม่สามารถเปลี่ยนแปลงได้' },
  { num: 2, text: 'ไม่ว่าคุณจะฉลาดมากน้อยเพียงใด คุณก็ยังสามารถฉลาดได้มากยิ่งขึ้นไม่มากก็น้อย' },
  { num: 3, text: 'เพียงไม่กี่คนเท่านั้นที่จะฝึกฝนจนเล่นกีฬาเก่งจริงๆ เพราะนักกีฬาเกิดมาพร้อมกับความสามารถอยู่แล้ว' },
  { num: 4, text: 'คุณพยายามมากเท่าใด ผลลัพธ์ก็จะดีมากยิ่งขึ้นเท่านั้น' },
  { num: 5, text: 'คุณรู้สึกไม่ดีเมื่อจะต้องได้รับ Feedback' },
  { num: 6, text: 'คุณรู้สึกไม่ดีเมื่อพ่อแม่ โค้ช หรือครูให้ Feedback การทำงาน' },
  { num: 7, text: 'คนที่เขาฉลาดจริงๆ จะไม่ต้องพยายามอะไรมาก' },
  { num: 8, text: 'คุณสามารถเปลี่ยนแปลงและพัฒนาความฉลาดของคุณได้' },
  { num: 9, text: 'คุณคือคนประเภทหนึ่งที่ไม่มีอะไรในชีวิตที่จะสามารถเปลี่ยนแปลงได้' },
  { num: 10, text: 'สาเหตุสำคัญที่คนอยากทำงานเกี่ยวกับการเรียนรู้คือคุณอยากจะเรียนรู้สิ่งใหม่ๆ' },
];

export type GfBandId = 'strong_growth' | 'growth' | 'fixed_lean' | 'strong_fixed';

export interface GfBand {
  id: GfBandId;
  min: number;
  max: number;
  levelTh: string;
  imageUrl: string;
}

export const GF_BANDS: GfBand[] = [
  {
    id: 'strong_growth',
    min: 22,
    max: 30,
    levelTh: 'คุณมี Growth Mindset ที่แข็งแรงมาก',
    imageUrl: GF_GROWTH_IMAGE_URL,
  },
  {
    id: 'growth',
    min: 17,
    max: 21,
    levelTh: 'คุณมี Growth Mindset มากกว่า Fixed Mindset',
    imageUrl: GF_GROWTH_IMAGE_URL,
  },
  {
    id: 'fixed_lean',
    min: 11,
    max: 16,
    levelTh: 'คุณมี Fixed Mindset มากกว่า Growth Mindset',
    imageUrl: GF_FIXED_IMAGE_URL,
  },
  {
    id: 'strong_fixed',
    min: 0,
    max: 10,
    levelTh: 'คุณมี Fixed Mindset ที่แข็งแรงมาก',
    imageUrl: GF_FIXED_IMAGE_URL,
  },
];

export const GF_SECTION_QUESTION_NUMS: GfQuestionNum[][] = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
];

export const GF_MINDSET_EXPLANATIONS = [
  {
    id: 'growth',
    title: 'Growth Mindset (กรอบความคิดแบบเติบโต)',
    body:
      'คนที่มีกรอบความคิดแบบเติบโตจะเน้นไปที่การเรียนรู้และพัฒนาตนเอง พวกเขามองความล้มเหลวเป็นโอกาสในการเติบโต เป้าหมายคือการพัฒนาศักยภาพและความสามารถของตนเองอย่างต่อเนื่อง การมองโลกในแง่นี้ทำให้พวกเขาเปิดรับต่อการเปลี่ยนแปลงและมองไปยังอนาคตมากกว่าที่จะยึดติดอยู่กับปัจจุบัน',
  },
  {
    id: 'fixed',
    title: 'Fixed Mindset (กรอบความคิดแบบยึดติด)',
    body:
      'คนที่มีกรอบความคิดแบบยึดติดมักจะมุ่งเน้นที่ผลลัพธ์และความสำเร็จในปัจจุบัน โดยพยายามพิสูจน์ตนเองเพื่อรับคำชมและหลีกเลี่ยงคำตำหนิ เป้าหมายหลักคือการสร้างภาพลักษณ์ที่ดีให้คนอื่นยอมรับ และมักจะหลีกเลี่ยงการทำสิ่งที่มีความเสี่ยงต่อการล้มเหลว',
  },
] as const;

export const GF_MINDSET_CLOSING_NOTE =
  'นอกจากนี้ กรอบความคิดทั้งแบบยึดติดและแบบเติบโตยังมีพื้นฐานมาจากความเชื่อและประสบการณ์ที่เราได้รับมาตลอดชีวิต ซึ่งสามารถเปลี่ยนแปลงได้ ไม่ว่าในช่วงใดของชีวิต การเปลี่ยนกรอบความคิดสามารถช่วยให้เราบรรลุเป้าหมายและได้รับความพึงพอใจมากขึ้น อีกทั้ง คนเราสามารถมีกรอบความคิดแบบยึดติดในเรื่องหนึ่งและมีกรอบความคิดแบบเติบโตในอีกเรื่องหนึ่งได้ ขึ้นอยู่กับประสบการณ์และมุมมองที่เรามีต่อสิ่งนั้น';

export const GF_CLOSING_MESSAGE = GF_MINDSET_CLOSING_NOTE;

export function getGfAdjustedScore(questionNum: number, choice: number): number {
  const c = Math.min(4, Math.max(1, Math.round(choice))) as 1 | 2 | 3 | 4;
  const map = GF_SCORE_MAP[questionNum];
  if (!map) return 0;
  return map[c - 1] ?? 0;
}

export function getGfTotalScore(answers: Record<number, number>): number {
  let sum = 0;
  for (let n = 1; n <= 10; n++) {
    const raw = answers[n];
    if (typeof raw !== 'number' || raw < 1 || raw > 4) continue;
    sum += getGfAdjustedScore(n, raw);
  }
  return sum;
}

export function getGfBand(total: number): GfBand {
  for (const b of GF_BANDS) {
    if (total >= b.min && total <= b.max) return b;
  }
  return GF_BANDS[GF_BANDS.length - 1]!;
}

export function getGfTotalQuestionCount(): number {
  return GF_QUESTIONS.length;
}

export function getGfQuestionByNum(num: GfQuestionNum): GfQuestion | undefined {
  return GF_QUESTIONS.find((q) => q.num === num);
}

export function isGfComplete(answers: Record<number, number>): boolean {
  for (let n = 1; n <= 10; n++) {
    const v = answers[n];
    if (typeof v !== 'number' || v < 1 || v > 4) return false;
  }
  return true;
}
