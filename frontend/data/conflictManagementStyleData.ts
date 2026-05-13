/** Conflict Management Style Assessment — 15 ข้อ · สเกล 1–4 (ไม่เคย–เสมอ) · คะแนน 5 รูปแบบจากชุดข้อที่กำหนด */

export type CmsQuestionNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export const CMS_SCALE_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'ไม่เคย',
  2: 'บางครั้ง',
  3: 'บ่อยครั้ง',
  4: 'เสมอ',
};

export const CMS_QUESTIONS: { num: CmsQuestionNum; text: string }[] = [
  {
    num: 1,
    text: 'ฉันพูดคุยประเด็นปัญหากับผู้อื่นเพื่อค้นหาวิธีแก้ไขที่ตอบสนองความต้องการของทุกคน',
  },
  { num: 2, text: 'ฉันพยายามเจรจาและใช้วิธีแลกเปลี่ยนในการแก้ปัญหา' },
  { num: 3, text: 'ฉันพยายามตอบสนองความคาดหวังของผู้อื่น' },
  { num: 4, text: 'ฉันแสดงความคิดเห็นของตนและยืนหยัดในประเด็นของตนเอง' },
  {
    num: 5,
    text: 'เมื่อเกิดความขัดแย้ง ฉันจะรวบรวมข้อมูลให้ได้มากที่สุดและเปิดช่องทางการสื่อสาร',
  },
  {
    num: 6,
    text: 'เมื่อมีการโต้เถียง ฉันมักพูดน้อยและพยายามออกจากสถานการณ์นั้นโดยเร็ว',
  },
  {
    num: 7,
    text: 'ฉันพยายามมองความขัดแย้งจากทั้งสองมุมมอง ทั้งของฉันและของผู้อื่น รวมถึงประเด็นที่เกี่ยวข้อง',
  },
  { num: 8, text: 'ฉันชอบประนีประนอมเพื่อแก้ไขปัญหาและก้าวต่อไป' },
  {
    num: 9,
    text: 'ฉันรู้สึกตื่นเต้นกับความขัดแย้ง และสนุกกับการใช้ไหวพริบในสถานการณ์เช่นนี้',
  },
  { num: 10, text: 'การมีข้อขัดแย้งกับผู้อื่นทำให้ฉันรู้สึกอึดอัดและกังวล' },
  { num: 11, text: 'ฉันพยายามตอบสนองความต้องการของเพื่อนและครอบครัว' },
  {
    num: 12,
    text: 'ฉันสามารถประเมินสิ่งที่ต้องทำได้อย่างถูกต้องและมักจะตัดสินใจได้ดี',
  },
  { num: 13, text: 'เมื่อสถานการณ์ถึงทางตัน ฉันมักประนีประนอม' },
  {
    num: 14,
    text: 'ฉันอาจไม่ได้ในสิ่งที่ต้องการ แต่ถือว่าเป็นราคาที่คุ้มค่าเพื่อรักษาความสงบ',
  },
  {
    num: 15,
    text: 'ฉันหลีกเลี่ยงความรู้สึกไม่ดีโดยการเก็บข้อขัดแย้งไว้กับตัวเอง',
  },
];

/** แบ่งหน้า: ข้อ 1–5, 6–10, 11–15 */
export const CMS_SECTION_QUESTION_NUMS: CmsQuestionNum[][] = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15],
];

export type CmsStyleId = 'avoiding' | 'accommodating' | 'competing' | 'collaborating' | 'compromising';

export const CMS_STYLES: {
  id: CmsStyleId;
  titleTh: string;
  titleEn: string;
  questionNums: readonly CmsQuestionNum[];
}[] = [
  { id: 'avoiding', titleTh: 'การหลีกหนี', titleEn: 'Avoiding', questionNums: [6, 10, 15] },
  { id: 'accommodating', titleTh: 'การยอมตาม', titleEn: 'Accommodating', questionNums: [3, 11, 14] },
  { id: 'competing', titleTh: 'การเอาชนะ', titleEn: 'Competing', questionNums: [4, 9, 12] },
  { id: 'collaborating', titleTh: 'การร่วมมือ', titleEn: 'Collaborating', questionNums: [1, 5, 7] },
  { id: 'compromising', titleTh: 'การประนีประนอม', titleEn: 'Compromising', questionNums: [2, 8, 13] },
];

const CMS_QUESTION_BY_NUM: Partial<Record<CmsQuestionNum, string>> = Object.fromEntries(
  CMS_QUESTIONS.map((q) => [q.num, q.text]),
);

export function getCmsQuestionByNum(num: CmsQuestionNum): { num: CmsQuestionNum; text: string } | undefined {
  const text = CMS_QUESTION_BY_NUM[num];
  if (!text) return undefined;
  return { num, text };
}

export function getCmsTotalQuestionCount(): number {
  return CMS_QUESTIONS.length;
}

export function sumAnswersForQuestions(answers: Record<number, number>, nums: readonly number[]): number {
  let s = 0;
  for (const n of nums) {
    const v = answers[n];
    if (typeof v === 'number' && v >= 1 && v <= 4) s += v;
  }
  return s;
}

export function getCmsStyleScores(answers: Record<number, number>): Record<CmsStyleId, number> {
  const out = {} as Record<CmsStyleId, number>;
  for (const st of CMS_STYLES) {
    out[st.id] = sumAnswersForQuestions(answers, st.questionNums);
  }
  return out;
}

export function isCmsComplete(answers: Record<number, number>): boolean {
  for (let n = 1; n <= 15; n++) {
    const v = answers[n];
    if (typeof v !== 'number' || v < 1 || v > 4) return false;
  }
  return true;
}
