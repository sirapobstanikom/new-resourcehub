export type HrCaseOptionId = 'A' | 'B' | 'C' | 'D';

export type HrChallengeCase = {
  id: string;
  title: string;
  scenario: string;
  question: string;
  options: Record<HrCaseOptionId, string>;
  correctOption: HrCaseOptionId;
  explanation: string;
};

export const HR_CHALLENGE_CASES: HrChallengeCase[] = [
  {
    id: 'turnover',
    title: 'Case 1 — Turnover สูงขึ้น',
    scenario: 'พนักงานลาออกเพิ่มขึ้น 30%',
    question: 'ถ้าคุณเป็น HR จะทำอะไรก่อน?',
    options: {
      A: 'ขึ้นเงินเดือนทุกคน',
      B: 'ทำ Exit Interview และวิเคราะห์ข้อมูล',
      C: 'รับคนใหม่แทน',
      D: 'ลด KPI',
    },
    correctOption: 'B',
    explanation:
      'ก่อนลงมือแก้ปัญหา ควรฟังเสียงจากผู้ลาออกและวิเคราะห์ข้อมูลเพื่อหาสาเหตุจริง — จึงจะออกแบบแนวทางที่ตอบโจทย์ธุรกิจได้แม่นยำ',
  },
  {
    id: 'training-performance',
    title: 'Case 2 — Training vs Performance',
    scenario: 'Training เยอะแต่ Performance ไม่ดี',
    question: 'คุณจะทำอย่างไร?',
    options: {
      A: 'เพิ่มจำนวนคอร์ส',
      B: 'วิเคราะห์ Skill Gap ก่อนจัดอบรม',
      C: 'ส่งทุกคนไปอบรม',
      D: 'ยกเลิกการอบรม',
    },
    correctOption: 'B',
    explanation:
      'ก่อนลงทุนกับการอบรม ควรวิเคราะห์ Skill Gap เพื่อให้การเรียนรู้ตอบโจทย์ธุรกิจ — ไม่ใช่แค่เพิ่มจำนวนคอร์ส',
  },
  {
    id: 'evaluation-consistency',
    title: 'Case 3 — ประเมินผลไม่สม่ำเสมอ',
    scenario: 'ผู้จัดการแต่ละทีมประเมินพนักงานไม่เหมือนกัน',
    question: 'ควรเริ่มจากอะไร?',
    options: {
      A: 'เปลี่ยนผู้จัดการ',
      B: 'สร้าง Competency Framework',
      C: 'เพิ่มโบนัส',
      D: 'ให้ HR ประเมินแทน',
    },
    correctOption: 'B',
    explanation:
      'Competency Framework ช่วยให้เกณฑ์ประเมินชัดเจนและเท่าเทียม — เป็นฐานที่ HR และผู้จัดการใช้ร่วมกันได้',
  },
  {
    id: 'engagement',
    title: 'Case 4 — Engagement ต่ำ',
    scenario: 'ผลสำรวจ Engagement ต่ำกว่าเป้าในหลายทีม',
    question: 'HR ควรเริ่มจากอะไร?',
    options: {
      A: 'จัดกิจกรรม Team Building ทุกเดือน',
      B: 'เจาะลึกข้อมูลและสัมภาษณ์พนักงานกลุ่มเป้าหมาย',
      C: 'เพิ่มสวัสดิการทันที',
      D: 'ส่งเมลเตือนผู้จัดการให้ดูแลทีม',
    },
    correctOption: 'B',
    explanation:
      'Engagement ต่ำมักมีหลายสาเหตุ — ต้องฟังและวิเคราะห์ข้อมูลก่อน จึงจะออกแบบแนวทางที่ได้ผลจริง',
  },
  {
    id: 'onboarding',
    title: 'Case 5 — Onboarding ไม่ครบ',
    scenario: 'พนักงานใหม่ผ่าน Probation แล้วยังทำงานไม่คล่อง',
    question: 'คุณจะแก้อย่างไร?',
    options: {
      A: 'ต่อ Probation อีก 1 เดือน',
      B: 'ทบทวน Onboarding Journey และ Skill ที่ขาด',
      C: 'ย้ายไปทีมอื่น',
      D: 'ให้เรียนคอร์ส Online เพิ่ม',
    },
    correctOption: 'B',
    explanation:
      'Onboarding ที่ดีต้องเชื่อม Skill, งานจริง และ Mentor — วิเคราะห์ช่องว่างก่อนปรับ Journey จะได้ผลยั่งยืน',
  },
];

export const HR_CHALLENGE_QUESTIONS_PER_ROUND = 3;

export function pickRandomCase(): HrChallengeCase {
  const idx = Math.floor(Math.random() * HR_CHALLENGE_CASES.length);
  return HR_CHALLENGE_CASES[idx];
}

/** สุ่มเคสไม่ซ้ำกัน n ข้อ */
export function pickRandomCases(count: number): HrChallengeCase[] {
  const shuffled = [...HR_CHALLENGE_CASES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export type CaseAnswer = {
  caseId: string;
  selectedOption: HrCaseOptionId;
  correct: boolean;
};

export type PrizeTier = 'grand' | 'premium' | 'sticker';

/** คะแนน = ค่าเฉลี่ย 3 ข้อ (ถูก = 100, ผิด = 0) → 0 / 33 / 67 / 100 */
export function generateAiScoreFromAnswers(
  answers: CaseAnswer[],
  total = HR_CHALLENGE_QUESTIONS_PER_ROUND
): number {
  const correctCount = answers.filter((a) => a.correct).length;
  return Math.round((correctCount / Math.max(1, total)) * 100);
}

export function prizeForScore(score: number): { tier: PrizeTier; label: string; detail: string } {
  if (score >= 90) {
    return {
      tier: 'grand',
      label: 'ลุ้นรางวัลใหญ่',
      detail: 'ถูก 3/3 ข้อ (90–100 คะแนน) — ลุ้นรางวัลใหญ่จาก MindDoJo',
    };
  }
  if (score >= 34) {
    return {
      tier: 'premium',
      label: 'แก้ว / สมุด MindDoJo',
      detail: 'ถูก 2/3 ข้อ (34–89 คะแนน) — รับแก้วหรือสมุด MindDoJo',
    };
  }
  return {
    tier: 'sticker',
    label: 'สติกเกอร์ MindDoJo',
    detail: 'ถูก 0–1 ข้อ (0–33 คะแนน) — รับสติกเกอร์ MindDoJo',
  };
}

export function titleForScore(score: number): string {
  if (score >= 90) return 'Excellent Problem Solver';
  if (score >= 34) return 'Strong HR Strategist';
  return 'Growing HR Mindset';
}
