import { PUBLIC_SITE_URL } from './seo';

export type ElevateQuestionType = 'choice' | 'text';

export type ElevateTestPhase = 'pretest' | 'posttest';

export type ElevateQuestion = {
  id: string;
  title: string;
  type: ElevateQuestionType;
  /** ตัวเลือก สำหรับ type === 'choice' */
  options?: string[];
  /** คำตอบถูก สำหรับ choice (ต้องตรงกับค่าใน options) */
  correctOption?: string;
  /** คำตอบตัวอย่าง/คำตอบถูก สำหรับ text (optional — ใช้เทียบตอนตรวจ) */
  correctAnswer?: string;
};

export type ElevateTestBank = {
  id: string;
  name: string;
  description: string;
  pretest: ElevateQuestion[];
  posttest: ElevateQuestion[];
  updatedAt: string;
};

export const ELEVATE_PPT_STORAGE_KEY = 'minddojo.elevate.pretest-posttest.banks.v1';

export function newElevateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyQuestion(type: ElevateQuestionType = 'choice'): ElevateQuestion {
  if (type === 'text') {
    return {
      id: newElevateId('q'),
      title: '',
      type: 'text',
      correctAnswer: '',
    };
  }
  return {
    id: newElevateId('q'),
    title: '',
    type: 'choice',
    options: ['ตัวเลือก 1', 'ตัวเลือก 2', 'ตัวเลือก 3', 'ตัวเลือก 4'],
    correctOption: 'ตัวเลือก 1',
  };
}

export function createEmptyBank(name = 'ชุดข้อสอบใหม่', existingIds: ReadonlySet<string> = new Set()): ElevateTestBank {
  const now = new Date().toISOString();
  return {
    id: elevateUniqueIdFromName(name, existingIds),
    name,
    description: '',
    pretest: [],
    posttest: [],
    updatedAt: now,
  };
}

function isQuestion(value: unknown): value is ElevateQuestion {
  if (!value || typeof value !== 'object') return false;
  const q = value as ElevateQuestion;
  return typeof q.id === 'string' && typeof q.title === 'string' && (q.type === 'choice' || q.type === 'text');
}

function normalizeQuestion(raw: ElevateQuestion): ElevateQuestion {
  if (raw.type === 'text') {
    return {
      id: raw.id || newElevateId('q'),
      title: raw.title || '',
      type: 'text',
      correctAnswer: raw.correctAnswer || '',
    };
  }
  const options = Array.isArray(raw.options) ? raw.options.map((o) => String(o)) : ['ตัวเลือก 1', 'ตัวเลือก 2'];
  const correctOption =
    raw.correctOption && options.includes(raw.correctOption) ? raw.correctOption : options[0] || '';
  return {
    id: raw.id || newElevateId('q'),
    title: raw.title || '',
    type: 'choice',
    options,
    correctOption,
  };
}

export function migrateElevateBanks(input: unknown): ElevateTestBank[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is ElevateTestBank => {
      if (!item || typeof item !== 'object') return false;
      const bank = item as ElevateTestBank;
      return typeof bank.id === 'string' && typeof bank.name === 'string';
    })
    .map((bank) => ({
      id: bank.id,
      name: bank.name || 'ไม่มีชื่อ',
      description: typeof bank.description === 'string' ? bank.description : '',
      pretest: (Array.isArray(bank.pretest) ? bank.pretest.filter(isQuestion) : []).map(normalizeQuestion),
      posttest: (Array.isArray(bank.posttest) ? bank.posttest.filter(isQuestion) : []).map(normalizeQuestion),
      updatedAt: bank.updatedAt || new Date().toISOString(),
    }));
}

export function loadStoredElevateBanks(): ElevateTestBank[] {
  try {
    const raw = localStorage.getItem(ELEVATE_PPT_STORAGE_KEY);
    if (!raw) return [];
    return migrateElevateBanks(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveElevateBanksToStorage(banks: ElevateTestBank[]): void {
  localStorage.setItem(ELEVATE_PPT_STORAGE_KEY, JSON.stringify(banks));
}

export function validateChoiceQuestion(question: ElevateQuestion): string | null {
  if (!question.title.trim()) return 'กรุณาพิมพ์โจทย์';
  if (question.type !== 'choice') return null;
  const options = (question.options || []).map((o) => o.trim()).filter(Boolean);
  if (options.length < 2) return 'ช้อยส์ต้องมีอย่างน้อย 2 ตัวเลือก';
  if (!question.correctOption || !options.includes(question.correctOption.trim())) {
    return 'กรุณาเลือกคำตอบที่ถูกต้อง';
  }
  return null;
}

export function validateTextQuestion(question: ElevateQuestion): string | null {
  if (!question.title.trim()) return 'กรุณาพิมพ์โจทย์';
  return null;
}

export function validateQuestion(question: ElevateQuestion): string | null {
  return question.type === 'choice' ? validateChoiceQuestion(question) : validateTextQuestion(question);
}

export function questionTypeLabel(type: ElevateQuestionType): string {
  return type === 'choice' ? 'ช้อยส์ (มีข้อถูก)' : 'ตอบคำถาม (ข้อความ)';
}

export function countScored(questions: ElevateQuestion[]): number {
  return questions.filter((q) => {
    if (q.type === 'choice') return Boolean(q.correctOption);
    return Boolean(q.correctAnswer?.trim());
  }).length;
}

export function isElevateTestPhase(value: string | undefined): value is ElevateTestPhase {
  return value === 'pretest' || value === 'posttest';
}

/**
 * สร้าง id/slug จากชื่อข้อสอบ (ช่องว่างเป็น -) — ใช้ในลิงก์ผู้ใช้
 * ตัวอย่าง: "ELEVATE Case A" → "elevate-ELEVATE-Case-A"
 */
export function elevateSlugFromName(name: string): string {
  const trimmed = name.trim() || 'ชุดข้อสอบ';
  const slug = trimmed.replace(/\s+/g, '-');
  return `elevate-${slug}`;
}

export function elevateUniqueIdFromName(name: string, existingIds: ReadonlySet<string>): string {
  let id = elevateSlugFromName(name);
  if (!existingIds.has(id)) return id;
  let n = 2;
  while (existingIds.has(`${id}-${n}`)) n += 1;
  return `${id}-${n}`;
}

/** path หน้าผู้ใช้งาน เช่น /elevate-pretest-posttest/elevate-Case-A/pretest */
export function elevateUserFormPath(bankId: string, phase: ElevateTestPhase): string {
  return `/elevate-pretest-posttest/${encodeURIComponent(bankId)}/${phase}`;
}

/** ลิงก์จริงบนโดเมน production (ไม่ใช่ localhost) */
export function elevateUserFormUrl(bankId: string, phase: ElevateTestPhase): string {
  return `${PUBLIC_SITE_URL}${elevateUserFormPath(bankId, phase)}`;
}

export function findElevateBankById(banks: ElevateTestBank[], bankId: string | undefined): ElevateTestBank | null {
  if (!bankId) return null;
  let decoded = bankId;
  try {
    decoded = decodeURIComponent(bankId);
  } catch {
    decoded = bankId;
  }
  return (
    banks.find((bank) => bank.id === decoded || bank.id === bankId) ||
    banks.find((bank) => elevateSlugFromName(bank.name) === decoded) ||
    null
  );
}

export function gradeElevateAnswers(
  questions: ElevateQuestion[],
  answers: Record<string, string>
): { score: number; total: number; details: Array<{ questionId: string; correct: boolean | null }> } {
  let score = 0;
  let total = 0;
  const details = questions.map((q) => {
    const given = (answers[q.id] || '').trim();
    if (q.type === 'choice' && q.correctOption) {
      total += 1;
      const correct = given === q.correctOption.trim();
      if (correct) score += 1;
      return { questionId: q.id, correct };
    }
    if (q.type === 'text' && q.correctAnswer?.trim()) {
      total += 1;
      const correct = given.toLowerCase() === q.correctAnswer.trim().toLowerCase();
      if (correct) score += 1;
      return { questionId: q.id, correct };
    }
    return { questionId: q.id, correct: null };
  });
  return { score, total, details };
}

export const ELEVATE_PPT_RESPONSE_STORAGE_KEY = 'minddojo.elevate.pretest-posttest.responses.v1';

export type ElevateTestResponse = {
  id: string;
  bankId: string;
  bankName: string;
  phase: ElevateTestPhase;
  respondentName: string;
  answers: Record<string, string>;
  score: number;
  total: number;
  createdAt: string;
};

export function saveElevateResponseLocal(response: ElevateTestResponse): void {
  try {
    const raw = localStorage.getItem(ELEVATE_PPT_RESPONSE_STORAGE_KEY);
    const prev = raw ? (JSON.parse(raw) as ElevateTestResponse[]) : [];
    const list = Array.isArray(prev) ? prev : [];
    localStorage.setItem(ELEVATE_PPT_RESPONSE_STORAGE_KEY, JSON.stringify([response, ...list]));
  } catch {
    // ignore storage failures
  }
}
