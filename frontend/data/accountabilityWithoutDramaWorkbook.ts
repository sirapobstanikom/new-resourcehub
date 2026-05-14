/** Reference workbook: Accountability Without Drama — CK Power May 2026 (workshop) */

export const ACCOUNTABILITY_WORKBOOK_META = {
  titleEn: 'ACCOUNTABILITY WITHOUT DRAMA',
  titleTh: 'การสร้างความรับผิดชอบโดยไม่ทำลายความสัมพันธ์',
  line1: 'Role Play Workbook  ·  CK Power — May 2026  ·  Confidential',
  line2: 'People Management for Leaders  ·  คนคือหัวใจของการบริหาร',
  line3: 'CK Power  ·  May 2026',
  footerNote: 'Prepared by MindDojo for CK Power  ·  May 2026  ·  For Workshop Use Only',
} as const;

export const ACCOUNTABILITY_WORKBOOK_CASES: readonly {
  readonly id: string;
  readonly titleEn: string;
  readonly titleTh: string;
}[] = [
  {
    id: '01',
    titleEn: 'THE HABITUAL PATTERN',
    titleTh: 'รูปแบบพฤติกรรมซ้ำๆ: เมื่อการโค้ชไม่ได้ผล',
  },
  {
    id: '02',
    titleEn: 'THE CHECKED-OUT VETERAN',
    titleTh: 'พนักงานอาวุโสที่หมดแรงจูงใจ',
  },
  {
    id: '03',
    titleEn: 'THE CONFIDENT YOUNG ENGINEER',
    titleTh: 'วิศวกรรุ่นใหม่ที่มั่นใจสูง',
  },
  {
    id: '04',
    titleEn: 'PEER ACCOUNTABILITY WITHOUT AUTHORITY',
    titleTh: 'ความรับผิดชอบระหว่างเพื่อนร่วมงาน: เมื่อไม่มีอำนาจโดยตรง',
  },
] as const;

export const ACCOUNTABILITY_WORKBOOK_HOW_TO_USE = {
  headingEn: 'HOW TO USE THIS WORKBOOK',
  headingTh: 'วิธีใช้คู่มือนี้',
  bodyEn:
    "Each case has a Manager Role Card and an Employee Role Card. Distribute separately — the surprise is part of the learning. Use the 5-step formula to guide the manager's approach.",
  bodyTh:
    'แต่ละกรณีมี บัตรบทบาทผู้จัดการ และ บัตรบทบาทพนักงาน แจกแยกกัน — ความประหลาดใจเป็นส่วนหนึ่งของการเรียนรู้ ใช้สูตร 5 ขั้นตอนเป็นแนวทางสำหรับผู้จัดการ',
} as const;

export const ACCOUNTABILITY_WORKBOOK_FORMULA_HEADING = {
  en: 'THE 5-STEP ACCOUNTABILITY FORMULA',
  th: 'สูตรการสร้างความรับผิดชอบ 5 ขั้นตอน',
} as const;

export const ACCOUNTABILITY_WORKBOOK_FORMULA_STEPS: readonly {
  readonly step: string;
  readonly titleEn: string;
  readonly titleTh: string;
  readonly bodyEn: string;
  readonly bodyTh: string;
}[] = [
  {
    step: 'STEP 1',
    titleEn: 'SET UP',
    titleTh: 'เปิดการสนทนา',
    bodyEn: "Name the purpose of the conversation — don't ambush.",
    bodyTh: 'ระบุวัตถุประสงค์ของบทสนทนา อย่าทำให้อีกฝ่ายตกใจ',
  },
  {
    step: 'STEP 2',
    titleEn: 'DESCRIBE',
    titleTh: 'อธิบายข้อเท็จจริง',
    bodyEn: 'State the facts only — no judgment or interpretation.',
    bodyTh: 'บอกเฉพาะสิ่งที่สังเกตพบ ไม่มีการตัดสิน',
  },
  {
    step: 'STEP 3',
    titleEn: 'IMPACT',
    titleTh: 'บอกผลกระทบ',
    bodyEn: 'Explain the consequence to the team, client, or project.',
    bodyTh: 'อธิบายผลลัพธ์ต่อทีม ลูกค้า หรือโครงการ',
  },
  {
    step: 'STEP 4',
    titleEn: 'UNDERSTAND',
    titleTh: 'ทำความเข้าใจ',
    bodyEn: "Ask, don't assume. This is the step most managers skip.",
    bodyTh: 'ถาม ไม่ใช่สมมติ นี่คือขั้นตอนที่ผู้จัดการมักข้ามมากที่สุด',
  },
  {
    step: 'STEP 5',
    titleEn: 'AGREE',
    titleTh: 'ตกลงร่วมกัน',
    bodyEn: "Co-create the solution. Ask: 'What do you need from me?'",
    bodyTh: "สร้างแนวทางแก้ไขร่วมกัน ถาม: 'คุณต้องการอะไรจากฉัน?'",
  },
] as const;

export const ACCOUNTABILITY_WORKBOOK_TIMING_HEADING = {
  en: 'TIMING',
  th: 'เวลา',
} as const;

export const ACCOUNTABILITY_WORKBOOK_TIMING_ROWS: readonly {
  readonly caseId: string;
  readonly labelEn: string;
  readonly labelTh: string;
  readonly duration: string;
}[] = [
  {
    caseId: '01',
    labelEn: 'THE HABITUAL PATTERN',
    labelTh: 'รูปแบบพฤติกรรมซ้ำๆ: เมื่อการโค้ชไม่ได้ผล',
    duration: '~20 min',
  },
  {
    caseId: '02',
    labelEn: 'THE CHECKED-OUT VETERAN',
    labelTh: 'พนักงานอาวุโสที่หมดแรงจูงใจ',
    duration: '~20 min',
  },
  {
    caseId: '03',
    labelEn: 'THE CONFIDENT YOUNG ENGINEER',
    labelTh: 'วิศวกรรุ่นใหม่ที่มั่นใจสูง',
    duration: '~20 min',
  },
  {
    caseId: '04',
    labelEn: 'PEER ACCOUNTABILITY WITHOUT AUTHORITY',
    labelTh: 'ความรับผิดชอบระหว่างเพื่อนร่วมงาน: เมื่อไม่มีอำนาจโดยตรง',
    duration: '~20 min',
  },
] as const;
