export type DlcSectionId = 'ai_mindset' | 'ai_literacy' | 'ai_application' | 'ai_leadership';

export interface DlcQuestion {
  id: string;
  text: string;
}

export interface DlcSection {
  id: DlcSectionId;
  title: string;
  questions: DlcQuestion[];
}

/** มิติละ 5 ข้อ × Scale 1–5 */
export const DLC_SECTIONS: DlcSection[] = [
  {
    id: 'ai_mindset',
    title: 'Section 1: AI Mindset',
    questions: [
      {
        id: 'ai_mindset_1',
        text: 'ฉันมองว่า AI เป็นมากกว่าแค่เครื่องมือ แต่เป็นข้อได้เปรียบเชิงกลยุทธ์ (Strategic Advantage)',
      },
      {
        id: 'ai_mindset_2',
        text: 'ฉันเปิดรับการทดลองใช้ AI แม้จะยังไม่มั่นใจในผลลัพธ์',
      },
      {
        id: 'ai_mindset_3',
        text: 'ฉันเชื่อว่า AI สามารถช่วยยกระดับคุณภาพการตัดสินใจ (Decision Quality) ได้',
      },
      {
        id: 'ai_mindset_4',
        text: 'ฉันมองการใช้ AI เป็นโอกาสในการพัฒนาตนเอง ไม่ใช่ความเสี่ยงในการถูกแทนที่',
      },
      {
        id: 'ai_mindset_5',
        text: 'ฉันมีความตั้งใจที่จะเรียนรู้และปรับตัวกับเทคโนโลยี AI อย่างต่อเนื่อง',
      },
    ],
  },
  {
    id: 'ai_literacy',
    title: 'Section 2: AI Literacy',
    questions: [
      {
        id: 'ai_literacy_1',
        text: 'ฉันเข้าใจว่า AI ทำงานโดยอาศัยข้อมูล (Data) และรูปแบบ (Patterns)',
      },
      {
        id: 'ai_literacy_2',
        text: 'ฉันเข้าใจความแตกต่างระหว่าง Machine Learning (การเรียนรู้ของเครื่อง) และ Generative AI (AI สร้างเนื้อหา)',
      },
      {
        id: 'ai_literacy_3',
        text: 'ฉันตระหนักถึงข้อจำกัดของ AI เช่น Hallucination (การสร้างข้อมูลผิด/แต่งขึ้น) และ Bias (อคติของข้อมูล)',
      },
      {
        id: 'ai_literacy_4',
        text: 'ฉันเข้าใจว่า AI ไม่ได้ให้คำตอบที่ถูกต้องเสมอไป และต้องมีการตรวจสอบ (Validation)',
      },
      {
        id: 'ai_literacy_5',
        text: 'ฉันสามารถตั้งคำถามหรือวิเคราะห์ผลลัพธ์จาก AI อย่างมีเหตุผล (Critical Thinking)',
      },
    ],
  },
  {
    id: 'ai_application',
    title: 'Section 3: AI Application',
    questions: [
      {
        id: 'ai_application_1',
        text: 'ฉันเคยใช้ AI ในการช่วยทำงาน เช่น การเขียน (Writing), การสรุป (Summarization), หรือการวิเคราะห์ (Analysis)',
      },
      {
        id: 'ai_application_2',
        text: 'ฉันสามารถเขียน Prompt (คำสั่งหรือคำถามเพื่อสั่ง AI) เพื่อให้ได้ผลลัพธ์ที่ต้องการ',
      },
      {
        id: 'ai_application_3',
        text: 'ฉันสามารถใช้ AI เพื่อช่วยวิเคราะห์ทางเลือก (Alternatives) ในการตัดสินใจ',
      },
      {
        id: 'ai_application_4',
        text: 'ฉันสามารถเลือกใช้ AI Tools (เครื่องมือ AI) ให้เหมาะสมกับลักษณะงาน',
      },
      {
        id: 'ai_application_5',
        text: 'ฉันสามารถปรับปรุงและพัฒนาผลงานจาก AI ให้มีคุณภาพมากขึ้น (Refinement)',
      },
    ],
  },
  {
    id: 'ai_leadership',
    title: 'Section 4: AI Leadership & Governance',
    questions: [
      {
        id: 'ai_leadership_1',
        text: 'ฉันสามารถแนะนำหรือสนับสนุนให้ทีมใช้ AI ได้อย่างเหมาะสม',
      },
      {
        id: 'ai_leadership_2',
        text: 'ฉันคำนึงถึงประเด็นด้านจริยธรรม (Ethics) และความเป็นส่วนตัวของข้อมูล (Data Privacy) ในการใช้ AI',
      },
      {
        id: 'ai_leadership_3',
        text: 'ฉันสามารถกำหนดแนวทาง (Guidelines) ในการใช้ AI ภายในทีมได้',
      },
      {
        id: 'ai_leadership_4',
        text: 'ฉันสามารถประเมินความเสี่ยง (Risk) จากการใช้ AI ได้',
      },
      {
        id: 'ai_leadership_5',
        text: 'ฉันสามารถตัดสินใจได้ว่า “ควรใช้ AI หรือไม่” ในสถานการณ์ต่างๆ โดยใช้กรอบการตัดสินใจ (Decision Framework)',
      },
    ],
  },
];

export const DLC_SCALE_LABELS: Record<number, string> = {
  1: 'ไม่เห็นด้วยเลย',
  2: 'ไม่ค่อยเห็นด้วย',
  3: 'เฉยๆ / ไม่แน่ใจ',
  4: 'เห็นด้วย',
  5: 'เห็นด้วยมาก',
};

export function getDlcTotalQuestionCount(): number {
  return DLC_SECTIONS.reduce((n, s) => n + s.questions.length, 0);
}

export function getDlcAllQuestionIds(): string[] {
  return DLC_SECTIONS.flatMap((s) => s.questions.map((q) => q.id));
}

/** ผลรวมข้อตอบ 1–5 ทั้ง 20 ข้อ → ช่วง 20–100 */
export function getDlcRawSum(answers: Record<string, number>): number {
  return getDlcAllQuestionIds().reduce((sum, id) => sum + (answers[id] ?? 0), 0);
}

/** ดัชนีรวม 5–25 ตามเกณฑ์ผลลัพธ์ที่กำหนด (เทียบเท่าค่าเฉลี่ยต่อข้อ × 5) */
export function getDlcOverallIndex(rawSum: number): number {
  return rawSum / 4;
}

export type DlcBandId = 'beginner' | 'developing' | 'advanced' | 'ai_leader';

export function getDlcBand(index: number): DlcBandId {
  if (index < 11) return 'beginner';
  if (index < 18) return 'developing';
  if (index < 22) return 'advanced';
  return 'ai_leader';
}

export const DLC_BAND_LABELS: Record<
  DlcBandId,
  { levelEn: string; line1: string; line2: string }
> = {
  beginner: {
    levelEn: 'Beginner',
    line1: 'ยังไม่มั่นใจ ต้องเริ่มจากพื้นฐาน',
    line2: 'เน้น Mindset + Demo',
  },
  developing: {
    levelEn: 'Developing',
    line1: 'เริ่มใช้ได้ แต่ยังไม่เป็นระบบ',
    line2: 'สอน Prompt + Use case',
  },
  advanced: {
    levelEn: 'Advanced',
    line1: 'ใช้งานได้ดี',
    line2: 'ยกระดับ Decision Making',
  },
  ai_leader: {
    levelEn: 'AI Leader',
    line1: 'พร้อมนำทีม',
    line2: 'เน้น Strategy + Governance',
  },
};

export const DLC_BAND_DOT: Record<DlcBandId, string> = {
  beginner: '🔴',
  developing: '🟡',
  advanced: '🔵',
  ai_leader: '🟢',
};

export function getDlcSectionSum(section: DlcSection, answers: Record<string, number>): number {
  return section.questions.reduce((sum, q) => sum + (answers[q.id] ?? 0), 0);
}

/** คะแนนต่อมิติ 5–25 (5 ข้อ × 1–5) */
export function getDlcSectionIndex(section: DlcSection, answers: Record<string, number>): number {
  return getDlcSectionSum(section, answers);
}
