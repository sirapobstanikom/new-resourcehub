import * as XLSX from 'xlsx';

export type EvaTrainingComments = {
  topics: string;
  feelings: string;
  future: string;
};

export type EvaTrainingParticipant = {
  id: number;
  name: string;
  organization: string;
  preKnowledge: number;
  postKnowledge: number;
  trainerRating: number;
  contentRating: number;
  facilityRating: number;
  utilityRating: number;
  recommendationRating: number;
  comments: EvaTrainingComments;
  date: string;
};

export type EvaTrainingStats = {
  totalParticipants: number;
  avgPreScore: number;
  avgPostScore: number;
  knowledgeGain: number;
  avgTrainerScore: number;
  avgContentScore: number;
  avgFacilityScore: number;
  overallSatisfaction: number;
};

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function parseNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/[, ]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function findKey(row: Record<string, unknown>, needle: string): string | undefined {
  const target = normalizeHeader(needle);
  const keys = Object.keys(row);
  return keys.find((k) => normalizeHeader(k) === target) || keys.find((k) => normalizeHeader(k).includes(target));
}

function readNumber(row: Record<string, unknown>, needle: string): number {
  const key = findKey(row, needle);
  return key ? parseNumber(row[key]) : 0;
}

/** คืนค่าข้อความดิบจากเซลล์ — ไม่แต่ง ไม่ยุบช่องว่าง */
function readRawText(row: Record<string, unknown>, needle: string): string {
  const key = findKey(row, needle);
  if (!key) return '';
  const value = row[key];
  if (value == null) return '';
  return String(value);
}

function avg(values: number[]): number {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return 0;
  return finite.reduce((sum, v) => sum + v, 0) / finite.length;
}

function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv');
}

function parseCsvText(text: string): Record<string, unknown>[] {
  const workbook = XLSX.read(text, { type: 'string' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
}

function parseExcelBuffer(buffer: ArrayBuffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
}

export async function parseEvaTrainingFile(file: File): Promise<Record<string, unknown>[]> {
  if (isCsvFile(file)) {
    return parseCsvText(await file.text());
  }
  return parseExcelBuffer(await file.arrayBuffer());
}

export function mapEvaTrainingRows(rows: Record<string, unknown>[]): EvaTrainingParticipant[] {
  return rows.map((row, index) => {
    const trainerRating = avg([
      readNumber(row, 'ความรู้ของวิทยากร'),
      readNumber(row, 'การอธิบายที่เข้าใจง่าย'),
      readNumber(row, 'การสร้างบรรยายกาศ'),
      readNumber(row, 'การช่วยเหลือในการไขข้อข้องใจ'),
    ]);
    const contentRating = avg([
      readNumber(row, 'เนื้อหาตรงต่อวัตถุประสงค์'),
      readNumber(row, 'ความชัดเจนและลำดับของเนื้อหา'),
      readNumber(row, 'กิจกรรมเสริมสร้างการเรียนรู้'),
      readNumber(row, 'ความเหมาะสมของระยะเวลา'),
    ]);
    const facilityRating = avg([
      readNumber(row, 'การเดินทางและสถานที่'),
      readNumber(row, 'โสตทัศนูปกรณ์'),
      readNumber(row, 'อาหาร'),
    ]);
    const utilityRating = avg([
      readNumber(row, 'มีประโยชน์ต่อคุณ'),
      readNumber(row, 'นำสิ่งที่เรียนรู้ไปใช้ได้'),
    ]);

    return {
      id: index,
      name: `Participant ${index + 1}`,
      organization: readRawText(row, 'องค์กร') || 'ไม่ระบุ',
      preKnowledge: readNumber(row, 'ก่อนเข้าอบรม'),
      postKnowledge: readNumber(row, 'หลังเข้าอบรม'),
      trainerRating,
      contentRating,
      facilityRating,
      utilityRating,
      recommendationRating: readNumber(row, 'แนะนำหลักสูตรนี้ให้ผู้อื่น'),
      comments: {
        topics: readRawText(row, 'หัวข้อในหลักสูตรที่ท่านอยากให้เพิ่มเติม'),
        feelings: readRawText(row, 'รู้สึกอย่างไรกับการเรียนครั้งนี้'),
        future: readRawText(row, 'อยากเรียนหลักสูตรไหนเพิ่มเติม'),
      },
      date: readRawText(row, 'Created Date'),
    };
  });
}

export function computeEvaTrainingStats(participants: EvaTrainingParticipant[]): EvaTrainingStats {
  if (participants.length === 0) {
    return {
      totalParticipants: 0,
      avgPreScore: 0,
      avgPostScore: 0,
      knowledgeGain: 0,
      avgTrainerScore: 0,
      avgContentScore: 0,
      avgFacilityScore: 0,
      overallSatisfaction: 0,
    };
  }

  const avgPre = avg(participants.map((p) => p.preKnowledge));
  const avgPost = avg(participants.map((p) => p.postKnowledge));
  const gain = avgPre > 0 ? ((avgPost - avgPre) / avgPre) * 100 : 0;

  return {
    totalParticipants: participants.length,
    avgPreScore: avgPre,
    avgPostScore: avgPost,
    knowledgeGain: gain,
    avgTrainerScore: avg(participants.map((p) => p.trainerRating)),
    avgContentScore: avg(participants.map((p) => p.contentRating)),
    avgFacilityScore: avg(participants.map((p) => p.facilityRating)),
    overallSatisfaction: (avgPost / 5) * 100,
  };
}

function isBlankFeedback(value: string): boolean {
  const trimmed = value.trim();
  return !trimmed || trimmed === '-' || trimmed === '–' || trimmed === "'-";
}

/**
 * ข้อเสนอแนะจากผู้เข้าอบรม — ดึงจากคอลัมน์ในไฟล์ตรงๆ
 * ไม่สรุป ไม่จัดเรียงใหม่ ไม่ตัดทอนด้วย AI
 */
export function extractRawSuggestions(participants: EvaTrainingParticipant[]): string[] {
  const items: string[] = [];
  for (const p of participants) {
    const text = p.comments.topics;
    if (!isBlankFeedback(text)) items.push(text);
  }
  return items;
}

/** ความประทับใจ — ข้อความดิบจากไฟล์ */
export function extractRawImpressions(participants: EvaTrainingParticipant[]): string[] {
  const items: string[] = [];
  for (const p of participants) {
    const text = p.comments.feelings;
    if (!isBlankFeedback(text)) items.push(text);
  }
  return items;
}

export function formatScore(value: number, digits = 1): string {
  return value.toLocaleString('th-TH', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
