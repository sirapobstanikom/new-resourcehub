/**
 * Reactive vs Proactive Mindset Assessment — ข้อมูลและการคำนวณคะแนน
 * Proactive ข้อ: 1,4,6,8,10,11,13,15,16,18,20 | Reactive (กลับคะแนน): 2,3,5,7,9,12,14,17,19
 */

export const RP_REACTIVE_QUESTION_NUMS = new Set([2, 3, 5, 7, 9, 12, 14, 17, 19]);

export const RP_SCALE_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'ไม่ตรงกับฉันเลย',
  2: 'ตรงกับฉันเล็กน้อย',
  3: 'ตรงกับฉันปานกลาง',
  4: 'ตรงกับฉันมาก',
  5: 'ตรงกับฉันมากที่สุด',
};

export type RpQuestionNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

export interface RpQuestion {
  num: RpQuestionNum;
  text: string;
}

/** 20 ข้อ ตามเอกสาร */
export const RP_QUESTIONS: RpQuestion[] = [
  { num: 1, text: 'เมื่อเกิดปัญหาในการทำงาน ฉันมักมองหาสิ่งที่ตนเองสามารถลงมือทำได้ก่อน' },
  { num: 2, text: 'เมื่อแผนงานเปลี่ยนกะทันหัน ฉันมักรู้สึกหงุดหงิดและต่อต้านการเปลี่ยนแปลง' },
  { num: 3, text: 'ฉันมักรอให้คนอื่นแก้ปัญหาก่อน มากกว่าจะเริ่มลงมือจากสิ่งที่ตนเองทำได้' },
  {
    num: 4,
    text: 'เมื่อได้รับงานที่ไม่ชัดเจน ฉันจะถามเพื่อทำความเข้าใจเป้าหมายและความคาดหวัง',
  },
  { num: 5, text: 'ฉันมักใช้เวลาไปกับการกังวลเรื่องที่ควบคุมไม่ได้ มากกว่าการวางแผนรับมือ' },
  { num: 6, text: 'เมื่อเกิดความผิดพลาด ฉันพยายามหาบทเรียนและวิธีป้องกันไม่ให้เกิดซ้ำ' },
  { num: 7, text: 'หากทีมอื่นส่งงานล่าช้า ฉันมักหยุดรอและรู้สึกว่างานของตนเองทำต่อไม่ได้' },
  { num: 8, text: 'ฉันกล้าสื่อสารข้อจำกัด ปัญหา หรือความเสี่ยงล่วงหน้า ก่อนที่จะเกิดผลกระทบใหญ่' },
  { num: 9, text: 'เมื่อได้รับ Feedback ฉันมักรู้สึกว่าถูกตำหนิ และพยายามอธิบายเพื่อปกป้องตนเอง' },
  { num: 10, text: 'ฉันมอง Feedback เป็นข้อมูลที่ช่วยให้ตนเองปรับปรุงและพัฒนาได้' },
  { num: 11, text: 'เมื่อมีงานหลายอย่างพร้อมกัน ฉันสามารถจัดลำดับความสำคัญและสื่อสารสิ่งที่ทำได้จริง' },
  { num: 12, text: 'ฉันมักพูดว่า “ทำไม่ได้ เพราะ…” มากกว่าการมองหาทางเลือกอื่น' },
  {
    num: 13,
    text: 'เมื่อเจอสถานการณ์ที่ไม่เป็นไปตามแผน ฉันพยายามหาทางเลือกใหม่เพื่อให้เป้าหมายยังเดินต่อได้',
  },
  {
    num: 14,
    text: 'ฉันมักรู้สึกว่าผลงานของฉันขึ้นอยู่กับปัจจัยภายนอกเป็นหลัก เช่น หัวหน้า เพื่อนร่วมงาน หรือระบบ',
  },
  { num: 15, text: 'ฉันรับผิดชอบต่อวิธีการตอบสนองของตนเอง แม้สถานการณ์จะไม่เป็นใจ' },
  { num: 16, text: 'เมื่อไม่เห็นด้วยกับผู้อื่น ฉันสามารถสื่อสารมุมมองของตนเองอย่างสร้างสรรค์' },
  { num: 17, text: 'ฉันมักบ่นหรือพูดถึงปัญหาซ้ำ ๆ โดยยังไม่ได้เริ่มหาวิธีแก้ไข' },
  { num: 18, text: 'ก่อนเริ่มงานสำคัญ ฉันพยายามคาดการณ์ความเสี่ยงและเตรียมแผนรับมือ' },
  { num: 19, text: 'เมื่อเกิดปัญหาในทีม ฉันมักพูดคุยลับหลังมากกว่าพูดคุยกับผู้เกี่ยวข้องโดยตรง' },
  { num: 20, text: 'ฉันเชื่อว่าตนเองสามารถสร้างอิทธิพลเชิงบวกต่อทีมได้ แม้ไม่ได้ควบคุมทุกอย่าง' },
];

export type RpBandId = 'highly_proactive' | 'proactive' | 'mixed' | 'reactive';

export interface RpBand {
  id: RpBandId;
  min: number;
  max: number;
  levelTh: string;
  levelEn: string;
  descriptionTh: string;
}

export const RP_BANDS: RpBand[] = [
  {
    id: 'highly_proactive',
    min: 81,
    max: 100,
    levelTh: 'Highly Proactive',
    levelEn: 'Highly Proactive',
    descriptionTh:
      'มีแนวโน้มรับผิดชอบต่อการตอบสนองของตนเองสูง มองหาสิ่งที่ควบคุมได้ และลงมือสร้างผลลัพธ์อย่างสม่ำเสมอ',
  },
  {
    id: 'proactive',
    min: 61,
    max: 80,
    levelTh: 'Proactive',
    levelEn: 'Proactive',
    descriptionTh:
      'มีแนวโน้มคิดและทำงานเชิงรุกค่อนข้างดี สามารถจัดการปัญหาและมองหาทางเลือกได้ แต่อาจยังมีบางสถานการณ์ที่กลับไปตอบสนองแบบ Reactive',
  },
  {
    id: 'mixed',
    min: 41,
    max: 60,
    levelTh: 'Mixed Mindset',
    levelEn: 'Mixed Mindset',
    descriptionTh:
      'มีทั้งพฤติกรรม Reactive และ Proactive ขึ้นอยู่กับสถานการณ์ อาจยังใช้พลังงานกับความกังวลหรือปัจจัยภายนอกในบางเรื่อง',
  },
  {
    id: 'reactive',
    min: 20,
    max: 40,
    levelTh: 'Reactive',
    levelEn: 'Reactive',
    descriptionTh:
      'มีแนวโน้มตอบสนองต่อสถานการณ์แบบเชิงรับ มักให้ความสำคัญกับสิ่งที่ควบคุมไม่ได้ และอาจรู้สึกว่าตนเองมีอิทธิพลต่อผลลัพธ์น้อย',
  },
];

export interface RpDimension {
  id: string;
  titleEn: string;
  titleTh: string;
  descriptionTh: string;
  /** หมายเลขข้อ 1–20 */
  questionNums: RpQuestionNum[];
}

export const RP_DIMENSIONS: RpDimension[] = [
  {
    id: 'ownership',
    titleEn: 'Ownership & Responsibility',
    titleTh: 'ความเป็นเจ้าของและความรับผิดชอบ',
    descriptionTh: 'วัดความสามารถในการรับผิดชอบต่อการตอบสนองและผลลัพธ์ของตนเอง',
    questionNums: [1, 6, 14, 15, 20],
  },
  {
    id: 'influence',
    titleEn: 'Focus on Circle of Influence',
    titleTh: 'โฟกัสวงอิทธิพล',
    descriptionTh: 'วัดความสามารถในการโฟกัสกับสิ่งที่ควบคุมได้ แทนการจมอยู่กับสิ่งที่กังวล',
    questionNums: [3, 5, 7, 12, 13],
  },
  {
    id: 'communication',
    titleEn: 'Constructive Communication',
    titleTh: 'การสื่อสารเชิงสร้างสรรค์',
    descriptionTh:
      'วัดการสื่อสารเชิงสร้างสรรค์ การขอความชัดเจน การรับ Feedback และการพูดคุยกับผู้เกี่ยวข้องโดยตรง',
    questionNums: [4, 8, 9, 16, 19],
  },
  {
    id: 'planning',
    titleEn: 'Planning & Adaptability',
    titleTh: 'การวางแผนและการปรับตัว',
    descriptionTh: 'วัดการวางแผน การจัดลำดับความสำคัญ และการปรับตัวต่อการเปลี่ยนแปลง',
    questionNums: [2, 10, 11, 17, 18],
  },
];

/** แบ่งหน้าทำแบบประเมิน มิติละ 5 ข้อ */
export const RP_SECTION_QUESTION_NUMS: RpQuestionNum[][] = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20],
];

export const RP_CLOSING_MESSAGE =
  'Proactive Mindset ไม่ได้หมายถึงการควบคุมทุกอย่างได้ แต่หมายถึงการเลือกตอบสนองต่อสถานการณ์ด้วยความรับผิดชอบ และใช้พลังงานกับสิ่งที่เราสามารถลงมือทำหรือสร้างอิทธิพลได้';

export function isReactiveQuestion(num: number): boolean {
  return RP_REACTIVE_QUESTION_NUMS.has(num);
}

/** คะแนนที่ใช้คำนวณหลังกลับข้อ Reactive แล้ว (ช่วง 1–5) */
export function getRpAdjustedScore(questionNum: number, raw: number): number {
  const r = Math.min(5, Math.max(1, Math.round(raw)));
  return isReactiveQuestion(questionNum) ? 6 - r : r;
}

export function getRpTotalScore(answers: Record<number, number>): number {
  let sum = 0;
  for (let n = 1; n <= 20; n++) {
    const raw = answers[n];
    if (typeof raw !== 'number' || raw < 1 || raw > 5) continue;
    sum += getRpAdjustedScore(n, raw);
  }
  return sum;
}

export function getRpBand(total: number): RpBand {
  for (const b of RP_BANDS) {
    if (total >= b.min && total <= b.max) return b;
  }
  return RP_BANDS[RP_BANDS.length - 1]!;
}

export function getRpDimensionSum(dimension: RpDimension, answers: Record<number, number>): number {
  let s = 0;
  for (const n of dimension.questionNums) {
    const raw = answers[n];
    if (typeof raw !== 'number' || raw < 1 || raw > 5) continue;
    s += getRpAdjustedScore(n, raw);
  }
  return s;
}

const DIM_MAX = 25;

export function getRpDimensionPercent(dimension: RpDimension, answers: Record<number, number>): number {
  const sum = getRpDimensionSum(dimension, answers);
  return DIM_MAX > 0 ? (sum / DIM_MAX) * 100 : 0;
}

export function getRpTotalQuestionCount(): number {
  return RP_QUESTIONS.length;
}

export function getRpQuestionByNum(num: RpQuestionNum): RpQuestion | undefined {
  return RP_QUESTIONS.find((q) => q.num === num);
}

export function isRpComplete(answers: Record<number, number>): boolean {
  for (let n = 1; n <= 20; n++) {
    const v = answers[n];
    if (typeof v !== 'number' || v < 1 || v > 5) return false;
  }
  return true;
}
