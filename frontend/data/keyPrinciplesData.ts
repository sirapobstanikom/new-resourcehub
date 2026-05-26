/** Key Principles Assessment — 25 ข้อ · สเกล 1–5 · 5 ส่วน */

export const KP_TOTAL_QUESTIONS = 25;

export const KP_SCALE_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'ไม่ตรงกับฉันเลย',
  2: 'ตรงกับฉันเล็กน้อย',
  3: 'ตรงกับฉันปานกลาง',
  4: 'ตรงกับฉันมาก',
  5: 'ตรงกับฉันมากที่สุด',
};

export type KpQuestionNum =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  | 21 | 22 | 23 | 24 | 25;

export type KpSectionId = 'self_esteem' | 'empathy' | 'involvement' | 'support' | 'share';

export type KpBandId = 'develop' | 'growth' | 'strength';

export interface KpSection {
  id: KpSectionId;
  titleEn: string;
  titleTh: string;
  questionNums: KpQuestionNum[];
}

export const KP_SECTIONS: KpSection[] = [
  {
    id: 'self_esteem',
    titleEn: 'Self Esteem',
    titleTh: 'Self Esteem',
    questionNums: [1, 5, 8, 19, 22],
  },
  {
    id: 'empathy',
    titleEn: 'Empathy',
    titleTh: 'Empathy',
    questionNums: [3, 7, 15, 21, 23],
  },
  {
    id: 'involvement',
    titleEn: 'Involvement',
    titleTh: 'Involvement',
    questionNums: [2, 10, 13, 17, 20],
  },
  {
    id: 'support',
    titleEn: 'Support',
    titleTh: 'Support',
    questionNums: [4, 11, 14, 18, 24],
  },
  {
    id: 'share',
    titleEn: 'Share',
    titleTh: 'Share',
    questionNums: [6, 9, 12, 16, 25],
  },
];

export interface KpScoreBand {
  id: KpBandId;
  min: number;
  max: number;
  meaningTh: string;
}

export const KP_SCORE_BANDS: KpScoreBand[] = [
  {
    id: 'develop',
    min: 5,
    max: 15,
    meaningTh: 'เป็นสิ่งที่ท่านต้องพิจารณาและเฝ้าพัฒนาอย่างใกล้ชิด',
  },
  {
    id: 'growth',
    min: 16,
    max: 20,
    meaningTh: 'เป็นสิ่งที่ท่านยังสามารถพัฒนาต่อไปได้อีก',
  },
  {
    id: 'strength',
    min: 21,
    max: 25,
    meaningTh: 'เป็นจุดเด่นหรือจุดแข็ง สามารถนำมาเป็นประโยชน์ได้',
  },
];

export interface KpQuestion {
  num: KpQuestionNum;
  text: string;
}

export const KP_QUESTIONS: KpQuestion[] = [
  { num: 1, text: 'ฉันให้เกียรติและรักษาหน้าผู้อื่นเสมอ' },
  {
    num: 2,
    text: 'ฉันกล้าที่จะขอความช่วยเหลือจากผู้อื่น รวมทั้งเปิดโอกาสให้คนอื่นมีส่วนร่วมในงาน',
  },
  {
    num: 3,
    text: 'ฉันแสดงให้คู่สนทนารู้ว่าฉันตั้งใจฟังและเข้าใจความรู้สึกของเขาก่อนจะพูดเรื่องต่อไป',
  },
  {
    num: 4,
    text: 'ฉันจะช่วยผู้อื่นอยู่เสมอเมื่อเขามีเรื่องเดือดร้อน แต่ฉันจะไม่เอางานหรือปัญหานั้นมาแก้ไขเองด้วยตัวเอง',
  },
  {
    num: 5,
    text: 'ฉันมักจะชมเชยและบอกให้เพื่อนร่วมงานรู้ว่าพวกเขาสำคัญต่อองค์กรแค่ไหน',
  },
  {
    num: 6,
    text: 'ฉันกล้าแชร์ความรู้สึกตรงๆ ตามความเหมาะสมเพื่อสร้างความไว้เนื้อเชื่อใจ',
  },
  {
    num: 7,
    text: 'ฉันมีความสามารถในการทำให้ผู้อื่นกล้าเปิดใจเล่าความรู้สึก (ทั้งเรื่องดีและเรื่องแย่) ให้ฟัง',
  },
  {
    num: 8,
    text: 'ฉันจะแสดงออกชัดเจนว่าฉันเชื่อมั่นในฝีมือและความสามารถของผู้อื่นเสมอ',
  },
  {
    num: 9,
    text: 'ฉันยินดีแชร์ข้อมูลที่รู้และอธิบายเหตุผลเบื้องหลังความคิดของตัวเองอย่างเปิดเผย',
  },
  { num: 10, text: 'ฉันชอบที่จะให้ผู้อื่นเข้ามาร่วมคิดร่วมทำตามความเหมาะสม' },
  {
    num: 11,
    text: 'ฉันสบายใจที่จะสอนงานคนอื่นตามที่ฉันรู้ทั้งหมดแล้วปล่อยให้เขาลองทำเอง',
  },
  { num: 12, text: 'เมื่อมีประเด็นสำคัญ ฉันกล้าพูดสิ่งที่คิดออกมาตรงๆ' },
  {
    num: 13,
    text: 'ฉันชอบเอาไอเดียของคนอื่นมารวมในแผนงาน แทนที่จะคิดและทำคนเดียว',
  },
  {
    num: 14,
    text: 'ฉันเข้าไปช่วยสนับสนุนงานคนอื่น โดยไม่ได้ไปแย่งความรับผิดชอบหลักของเขามา',
  },
  {
    num: 15,
    text: 'ฉันมักจะตรวจสอบและสรุปให้แน่ใจว่าผู้อื่นรู้สึกอย่างไร เพื่อเช็คให้ชัวร์ว่าฉันเข้าใจความรู้สึกเขาถูกต้อง',
  },
  {
    num: 16,
    text: 'ฉันยินดีแชร์ความผิดพลาดของตัวเองเพื่อให้คนอื่นได้เรียนรู้เป็นบทเรียน',
  },
  {
    num: 17,
    text: 'ฉันกล้าที่จะเดินไปถามไอเดีย คำแนะนำ หรือวิธีแก้ปัญหาจากผู้อื่น',
  },
  {
    num: 18,
    text: 'ฉันเก่งเรื่องการช่วยคนอื่นแก้ปัญหา และช่วยหาเครื่องมือหรือทรัพยากรที่จำเป็นให้เขาได้',
  },
  {
    num: 19,
    text: 'ฉันให้ความสำคัญกับการชมเวลาเห็นผู้อื่นทำงานสำเร็จหรือเมื่อเขาเสนอไอเดียดีๆ',
  },
  {
    num: 20,
    text: 'ฉันพร้อมสนับสนุนไอเดียคนอื่น แม้วิธีนั้นจะไม่ใช่วิธีที่ฉันคิดไว้ในใจก็ตาม',
  },
  { num: 21, text: 'ฉันเข้าใจอารมณ์และความรู้สึกของคนอื่นได้อย่างแม่นยำ' },
  {
    num: 22,
    text: 'ฉันเป็นคนชมคนเก่งและชมได้ถูกจังหวะเวลาที่เห็นคนอื่นทำดี',
  },
  {
    num: 23,
    text: 'ฉันเป็นผู้ฟังที่ดีและพร้อมแสดงความเห็นอกเห็นใจต่อผู้พูดอย่างจริงใจ',
  },
  {
    num: 24,
    text: 'เวลาช่วยงานใคร ฉันจะเน้นให้ไอเดียหรือช่วยเท่าที่จำเป็น เพื่อให้เขาได้ลงมือทำเอง',
  },
  {
    num: 25,
    text: 'ฉันสามารถบอกคนอื่นถึงข้อกังวลหรือปัญหาเกี่ยวกับงานและการตัดสินใจต่างๆ ได้อย่างชัดเจน',
  },
];

/** หน้าทำแบบประเมิน: ข้อ 1–5, 6–10, … 25 */
export const KP_PAGE_QUESTION_NUMS: KpQuestionNum[][] = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20],
  [21, 22, 23, 24, 25],
];

export const KP_PAGE_TITLES = [
  'ข้อที่ 1–5',
  'ข้อที่ 6–10',
  'ข้อที่ 11–15',
  'ข้อที่ 16–20',
  'ข้อที่ 21–25',
] as const;

export function getKpQuestionByNum(n: number): KpQuestion | undefined {
  return KP_QUESTIONS.find((q) => q.num === n);
}

export function getKpTotalQuestionCount(): number {
  return KP_QUESTIONS.length;
}

export function isKpComplete(answers: Record<number, number>): boolean {
  for (let n = 1; n <= KP_TOTAL_QUESTIONS; n++) {
    const v = answers[n];
    if (typeof v !== 'number' || v < 1 || v > 5) return false;
  }
  return true;
}

export function getKpSectionSum(sectionId: KpSectionId, answers: Record<number, number>): number {
  const section = KP_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return 0;
  return section.questionNums.reduce((sum, n) => sum + (answers[n] ?? 0), 0);
}

export function getKpBand(score: number): KpScoreBand {
  const clamped = Math.max(5, Math.min(25, score));
  const band =
    KP_SCORE_BANDS.find((b) => clamped >= b.min && clamped <= b.max) ?? KP_SCORE_BANDS[KP_SCORE_BANDS.length - 1];
  return band;
}

export function getKpSectionResult(
  sectionId: KpSectionId,
  answers: Record<number, number>,
): { section: KpSection; sum: number; band: KpScoreBand } {
  const section = KP_SECTIONS.find((s) => s.id === sectionId)!;
  const sum = getKpSectionSum(sectionId, answers);
  return { section, sum, band: getKpBand(sum) };
}

export function getKpAllSectionResults(
  answers: Record<number, number>,
): { section: KpSection; sum: number; band: KpScoreBand }[] {
  return KP_SECTIONS.map((section) => {
    const sum = getKpSectionSum(section.id, answers);
    return { section, sum, band: getKpBand(sum) };
  });
}

/** คะแนนรวมทุกส่วน (สูงสุด 125) */
export function getKpTotalScore(answers: Record<number, number>): number {
  let sum = 0;
  for (let n = 1; n <= KP_TOTAL_QUESTIONS; n++) sum += answers[n] ?? 0;
  return sum;
}

/** บันทึกลง Supabase — คะแนนรวมต่อส่วน (5–25) */
export function getKpSectionScores(answers: Record<number, number>): Record<KpSectionId, number> {
  return Object.fromEntries(KP_SECTIONS.map((s) => [s.id, getKpSectionSum(s.id, answers)])) as Record<
    KpSectionId,
    number
  >;
}
