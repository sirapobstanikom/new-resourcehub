import { PUBLIC_SITE_URL } from './seo';

export type ElevateQuestionType = 'choice' | 'text' | 'rating_1_5';

export type ElevateTestPhase = 'pretest' | 'posttest';

export const ELEVATE_RATING_OPTIONS = ['1', '2', '3', '4', '5'] as const;

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
  if (type === 'rating_1_5') {
    return {
      id: newElevateId('q'),
      title: 'ระดับความรู้ของคุณตอนนี้ (1 = น้อย, 5 = มาก)',
      type: 'rating_1_5',
      options: [...ELEVATE_RATING_OPTIONS],
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
  return (
    typeof q.id === 'string' &&
    typeof q.title === 'string' &&
    (q.type === 'choice' || q.type === 'text' || q.type === 'rating_1_5')
  );
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
  if (raw.type === 'rating_1_5') {
    return {
      id: raw.id || newElevateId('q'),
      title: raw.title || 'ระดับความรู้ของคุณตอนนี้ (1 = น้อย, 5 = มาก)',
      type: 'rating_1_5',
      options: [...ELEVATE_RATING_OPTIONS],
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

export function validateRatingQuestion(question: ElevateQuestion): string | null {
  if (!question.title.trim()) return 'กรุณาพิมพ์โจทย์';
  return null;
}

export function validateQuestion(question: ElevateQuestion): string | null {
  if (question.type === 'choice') return validateChoiceQuestion(question);
  if (question.type === 'rating_1_5') return validateRatingQuestion(question);
  return validateTextQuestion(question);
}

export function questionTypeLabel(type: ElevateQuestionType): string {
  if (type === 'choice') return 'ช้อยส์ (มีข้อถูก)';
  if (type === 'rating_1_5') return 'ประเมิน 1–5';
  return 'ตอบคำถาม (ข้อความ)';
}

export function countScored(questions: ElevateQuestion[]): number {
  return questions.filter((q) => {
    if (q.type === 'choice') return Boolean(q.correctOption);
    if (q.type === 'rating_1_5') return true;
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

/** หน้า Dashboard ของชุดข้อสอบ */
export function elevateDashboardPath(bankId: string): string {
  return `/elevate-pretest-posttest-editor/dashboard/${encodeURIComponent(bankId)}`;
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
    if (q.type === 'rating_1_5') {
      total += 5;
      const value = Number(given);
      const points = Number.isFinite(value) && value >= 1 && value <= 5 ? value : 0;
      score += points;
      return { questionId: q.id, correct: points > 0 ? null : false };
    }
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

export function loadElevateResponsesLocal(): ElevateTestResponse[] {
  try {
    const raw = localStorage.getItem(ELEVATE_PPT_RESPONSE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ElevateTestResponse[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row) =>
        row &&
        typeof row.id === 'string' &&
        typeof row.bankId === 'string' &&
        (row.phase === 'pretest' || row.phase === 'posttest')
    );
  } catch {
    return [];
  }
}

export function scorePercent(score: number, total: number): number {
  if (!total || total <= 0) return 0;
  return (score / total) * 100;
}

function normalizeRespondentName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export type ElevatePairedResult = {
  name: string;
  pretestScore: number;
  pretestTotal: number;
  pretestPercent: number;
  posttestScore: number;
  posttestTotal: number;
  posttestPercent: number;
  /** เพิ่มขึ้นเป็น % จากคะแนนเดิม ((post-pre)/pre*100) */
  gainFromBaselinePercent: number | null;
  /** เพิ่มขึ้นเป็น จุดเปอร์เซ็นต์ (post% - pre%) */
  gainPoints: number;
};

export type ElevateDashboardStats = {
  bankId: string;
  pretestCount: number;
  posttestCount: number;
  avgPretestPercent: number;
  avgPosttestPercent: number;
  /** ความรู้เพิ่มขึ้นโดยรวมจากค่าเฉลี่ย ((post-pre)/pre*100) */
  knowledgeGainPercent: number | null;
  /** เพิ่มขึ้นเป็นจุดเปอร์เซ็นต์ */
  knowledgeGainPoints: number;
  paired: ElevatePairedResult[];
  unpairedPretest: ElevateTestResponse[];
  unpairedPosttest: ElevateTestResponse[];
  latestPretest: ElevateTestResponse[];
  latestPosttest: ElevateTestResponse[];
};

function latestByName(rows: ElevateTestResponse[]): Map<string, ElevateTestResponse> {
  const map = new Map<string, ElevateTestResponse>();
  const sorted = [...rows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  for (const row of sorted) {
    const key = normalizeRespondentName(row.respondentName);
    if (!key || map.has(key)) continue;
    map.set(key, row);
  }
  return map;
}

export function computeElevateDashboard(
  bankId: string,
  allResponses: ElevateTestResponse[]
): ElevateDashboardStats {
  const forBank = allResponses.filter((r) => r.bankId === bankId);
  const pretestRows = forBank.filter((r) => r.phase === 'pretest');
  const posttestRows = forBank.filter((r) => r.phase === 'posttest');

  const latestPre = latestByName(pretestRows);
  const latestPost = latestByName(posttestRows);

  const avg = (values: number[]) =>
    values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

  const prePercents = [...latestPre.values()].map((r) => scorePercent(r.score, r.total));
  const postPercents = [...latestPost.values()].map((r) => scorePercent(r.score, r.total));
  const avgPre = avg(prePercents);
  const avgPost = avg(postPercents);
  const gainPoints = avgPost - avgPre;
  const gainFromBaseline = avgPre > 0 ? ((avgPost - avgPre) / avgPre) * 100 : null;

  const paired: ElevatePairedResult[] = [];
  const unpairedPretest: ElevateTestResponse[] = [];
  const unpairedPosttest: ElevateTestResponse[] = [];

  for (const [key, pre] of latestPre) {
    const post = latestPost.get(key);
    if (!post) {
      unpairedPretest.push(pre);
      continue;
    }
    const pretestPercent = scorePercent(pre.score, pre.total);
    const posttestPercent = scorePercent(post.score, post.total);
    paired.push({
      name: pre.respondentName.trim() || post.respondentName.trim(),
      pretestScore: pre.score,
      pretestTotal: pre.total,
      pretestPercent,
      posttestScore: post.score,
      posttestTotal: post.total,
      posttestPercent,
      gainFromBaselinePercent:
        pretestPercent > 0 ? ((posttestPercent - pretestPercent) / pretestPercent) * 100 : null,
      gainPoints: posttestPercent - pretestPercent,
    });
  }

  for (const [key, post] of latestPost) {
    if (!latestPre.has(key)) unpairedPosttest.push(post);
  }

  paired.sort((a, b) => b.gainPoints - a.gainPoints);

  return {
    bankId,
    pretestCount: latestPre.size,
    posttestCount: latestPost.size,
    avgPretestPercent: avgPre,
    avgPosttestPercent: avgPost,
    knowledgeGainPercent: gainFromBaseline,
    knowledgeGainPoints: gainPoints,
    paired,
    unpairedPretest,
    unpairedPosttest,
    latestPretest: [...latestPre.values()],
    latestPosttest: [...latestPost.values()],
  };
}

export function formatElevatePercent(value: number, digits = 1): string {
  return value.toLocaleString('th-TH', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
