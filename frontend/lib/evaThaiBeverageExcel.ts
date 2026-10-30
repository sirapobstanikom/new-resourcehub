import ExcelJS from 'exceljs';
import {
  THAI_BEVERAGE_CAN_LIMITED_EVA_NAME,
  type EvaEvaluationTemplate,
  type EvaExportAnswer,
} from './evaTemplates';

type Argb = string;

const COLORS = {
  titleFill: '1E1E1E',
  titleFont: 'FFCC00',
  headerFill: 'FFCC00',
  headerFont: '111111',
  metaHeader: 'FFE082',
  dim1: 'BBDEFB',
  dim2: 'C8E6C9',
  dim3: 'FFE0B2',
  dim4: 'E1BEE7',
  avgFill: 'FFF59D',
  totalFill: 'FFCC00',
  zebra: 'FAFAF8',
  white: 'FFFFFF',
  border: 'D6D4CC',
  score1: 'FFCDD2',
  score2: 'FFE0B2',
  score3: 'FFF9C4',
  score4: 'C8E6C9',
  score5: '81C784',
};

const DIM_SHORT = [
  { key: 'ม1', titleMatch: /มิติที่\s*1|การสื่อสาร/i, headerBg: COLORS.dim1 },
  { key: 'ม2', titleMatch: /มิติที่\s*2|ความช่วยเหลือ/i, headerBg: COLORS.dim2 },
  { key: 'ม3', titleMatch: /มิติที่\s*3|ความร่วมมือ|ไว้วางใจ/i, headerBg: COLORS.dim3 },
  { key: 'ม4', titleMatch: /มิติที่\s*4|ประสานงาน|แก้ปัญหา/i, headerBg: COLORS.dim4 },
] as const;

function fillSolid(argb: Argb): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const edge: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: COLORS.border } };
  return { top: edge, left: edge, bottom: edge, right: edge };
}

function applyHeader(cell: ExcelJS.Cell, bg: Argb) {
  cell.fill = fillSolid(bg);
  cell.font = { bold: true, color: { argb: COLORS.headerFont }, size: 11, name: 'Calibri' };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = thinBorder();
}

function applyBody(
  cell: ExcelJS.Cell,
  opts: { bg?: Argb; bold?: boolean; align?: 'left' | 'center' | 'right' } = {}
) {
  cell.fill = fillSolid(opts.bg || COLORS.white);
  cell.font = { bold: Boolean(opts.bold), color: { argb: '1F2937' }, size: 11, name: 'Calibri' };
  cell.alignment = { vertical: 'middle', horizontal: opts.align || 'center', wrapText: true };
  cell.border = thinBorder();
}

function scoreFill(value: number | string | null | undefined): Argb {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return COLORS.white;
  if (n <= 1) return COLORS.score1;
  if (n <= 2) return COLORS.score2;
  if (n <= 3) return COLORS.score3;
  if (n <= 4) return COLORS.score4;
  return COLORS.score5;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function formatDateTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function findTextAnswer(answers: EvaExportAnswer[], pattern: RegExp): string {
  const hit = answers.find(
    (a) => a.promptType === 'text' && pattern.test(a.prompt || '') && (a.answer || '').trim()
  );
  return (hit?.answer || '').replace(/\s+/g, ' ').trim();
}

function parseRating(value: string | undefined): number | null {
  const n = Number((value || '').trim());
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return n;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

type DimColumn = {
  dimKey: string;
  dimTitle: string;
  itemIndex: number;
  header: string;
  fullLabel: string;
  headerBg: Argb;
  matcher: (answer: EvaExportAnswer) => boolean;
};

function buildDimColumns(template: EvaEvaluationTemplate): DimColumn[] {
  const ratingPrompts = template.prompts.filter((p) => p.type === 'rating_1_5');
  const cols: DimColumn[] = [];

  ratingPrompts.forEach((prompt, promptIdx) => {
    const dimMeta =
      DIM_SHORT.find((d) => d.titleMatch.test(prompt.title)) ||
      DIM_SHORT[Math.min(promptIdx, DIM_SHORT.length - 1)];
    const items = (prompt.ratingSubItems?.length
      ? prompt.ratingSubItems.map((i) => i.text)
      : prompt.ratingItems) || [];

    items.forEach((text, itemIdx) => {
      cols.push({
        dimKey: dimMeta.key,
        dimTitle: prompt.title,
        itemIndex: itemIdx + 1,
        header: `${dimMeta.key}-${itemIdx + 1}`,
        fullLabel: `${prompt.title} :: ${text}`,
        headerBg: dimMeta.headerBg,
        matcher: (answer) => {
          if (answer.promptType !== 'rating_1_5') return false;
          const samePrompt = (answer.prompt || '').trim() === prompt.title.trim();
          const sameSub = (answer.subPrompt || '').trim() === text.trim();
          return samePrompt && sameSub;
        },
      });
    });
  });

  return cols;
}

function resolveDimScores(
  answers: EvaExportAnswer[],
  cols: DimColumn[]
): { byHeader: Record<string, number | null>; byDim: Record<string, number | null>; overall: number | null } {
  const byHeader: Record<string, number | null> = {};
  const byDimLists: Record<string, number[]> = {};

  cols.forEach((col) => {
    const hit = answers.find((a) => col.matcher(a));
    const score = parseRating(hit?.answer);
    byHeader[col.header] = score;
    if (!byDimLists[col.dimKey]) byDimLists[col.dimKey] = [];
    if (score != null) byDimLists[col.dimKey].push(score);
  });

  const byDim: Record<string, number | null> = {};
  Object.entries(byDimLists).forEach(([key, list]) => {
    const a = avg(list);
    byDim[key] = a == null ? null : Number(a.toFixed(2));
  });

  const all = Object.values(byHeader).filter((v): v is number => v != null);
  const overallAvg = avg(all);

  return {
    byHeader,
    byDim,
    overall: overallAvg == null ? null : Number(overallAvg.toFixed(2)),
  };
}

/** Excel เฉพาะ TBA EVA — เน้นเรทติ้ง 1–5 ของแต่ละคนให้เห็นชัด */
export async function downloadThaiBeverageCanEvaStyledExcel(
  template: EvaEvaluationTemplate,
  entries: Array<{ createdAt: string; answers: EvaExportAnswer[] }>,
  fileName: string
): Promise<void> {
  const cols = buildDimColumns(template);
  const dimKeys = Array.from(new Set(cols.map((c) => c.dimKey)));

  const rows = [...entries]
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    .map((entry, idx) => {
      const name =
        findTextAnswer(entry.answers, /ชื่อ/) ||
        findTextAnswer(entry.answers, /name/i) ||
        `ผู้ตอบ ${idx + 1}`;
      const team = findTextAnswer(entry.answers, /ทีม|กลุ่ม|team/i);
      const scores = resolveDimScores(entry.answers, cols);
      return {
        ลำดับ: idx + 1,
        ชื่อ: name,
        ทีม: team || '—',
        เวลาส่ง: formatDateTime(entry.createdAt),
        scores,
      };
    });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'MindDoJo EVA';
  wb.created = new Date();

  const summary = wb.addWorksheet('เรทติ้งรายคน', {
    views: [{ state: 'frozen', ySplit: 2, xSplit: 4 }],
  });

  const summaryHeaders = [
    'ลำดับ',
    'ชื่อ',
    'ทีม',
    'เวลาส่ง',
    ...dimKeys.map((k) => `${k} เฉลี่ย`),
    'คะแนนรวมเฉลี่ย',
    ...cols.map((c) => c.header),
  ];

  summary.mergeCells(1, 1, 1, summaryHeaders.length);
  const title = summary.getCell(1, 1);
  title.value = `${THAI_BEVERAGE_CAN_LIMITED_EVA_NAME} — เรทติ้งคะแนนรายคน (1=ไม่ทำเลย … 5=ทำตลอด)`;
  title.fill = fillSolid(COLORS.titleFill);
  title.font = { bold: true, color: { argb: COLORS.titleFont }, size: 13, name: 'Calibri' };
  title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  summary.getRow(1).height = 28;

  const headerRow = summary.getRow(2);
  summaryHeaders.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    let bg: Argb = COLORS.headerFill;
    if (i < 4) bg = COLORS.metaHeader;
    else if (i < 4 + dimKeys.length) {
      const dim = DIM_SHORT.find((d) => h.startsWith(d.key));
      bg = dim?.headerBg || COLORS.avgFill;
    } else if (i === 4 + dimKeys.length) bg = COLORS.totalFill;
    else {
      const col = cols[i - (5 + dimKeys.length)];
      bg = col?.headerBg || COLORS.headerFill;
    }
    applyHeader(cell, bg);
  });
  headerRow.height = 30;

  rows.forEach((row, rIdx) => {
    const excelRow = summary.getRow(rIdx + 3);
    const zebra = rIdx % 2 === 1 ? COLORS.zebra : COLORS.white;
    const values: Array<string | number> = [
      row.ลำดับ,
      row.ชื่อ,
      row.ทีม,
      row.เวลาส่ง,
      ...dimKeys.map((k) => row.scores.byDim[k] ?? '—'),
      row.scores.overall ?? '—',
      ...cols.map((c) => row.scores.byHeader[c.header] ?? '—'),
    ];

    values.forEach((value, cIdx) => {
      const cell = excelRow.getCell(cIdx + 1);
      cell.value = value;
      let bg = zebra;
      let bold = false;
      if (cIdx >= 4 && cIdx <= 4 + dimKeys.length) {
        bg = scoreFill(typeof value === 'number' ? value : null);
        bold = true;
      } else if (cIdx > 4 + dimKeys.length) {
        bg = scoreFill(typeof value === 'number' ? value : null);
        bold = typeof value === 'number';
      }
      applyBody(cell, {
        bg,
        bold: cIdx === 1 || bold,
        align: cIdx === 1 || cIdx === 2 || cIdx === 3 ? 'left' : 'center',
      });
    });
    excelRow.height = 22;
  });

  summary.getColumn(1).width = 8;
  summary.getColumn(2).width = 24;
  summary.getColumn(3).width = 16;
  summary.getColumn(4).width = 20;
  for (let i = 5; i <= summaryHeaders.length; i += 1) {
    summary.getColumn(i).width = i <= 5 + dimKeys.length ? 14 : 10;
  }

  const detail = wb.addWorksheet('รายข้อเต็ม', {
    views: [{ state: 'frozen', ySplit: 2, xSplit: 3 }],
  });
  const detailHeaders = ['ลำดับ', 'ชื่อ', 'ทีม', 'เวลาส่ง', ...cols.map((c) => c.fullLabel)];
  detail.mergeCells(1, 1, 1, detailHeaders.length);
  const detailTitle = detail.getCell(1, 1);
  detailTitle.value = `${THAI_BEVERAGE_CAN_LIMITED_EVA_NAME} — คะแนนรายข้อ (ข้อความเต็ม)`;
  detailTitle.fill = fillSolid(COLORS.titleFill);
  detailTitle.font = { bold: true, color: { argb: COLORS.titleFont }, size: 13, name: 'Calibri' };
  detailTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  detail.getRow(1).height = 28;

  const detailHeaderRow = detail.getRow(2);
  detailHeaders.forEach((h, i) => {
    const cell = detailHeaderRow.getCell(i + 1);
    cell.value = h;
    const col = i >= 4 ? cols[i - 4] : null;
    applyHeader(cell, col?.headerBg || COLORS.metaHeader);
  });
  detailHeaderRow.height = 48;

  rows.forEach((row, rIdx) => {
    const excelRow = detail.getRow(rIdx + 3);
    const values: Array<string | number> = [
      row.ลำดับ,
      row.ชื่อ,
      row.ทีม,
      row.เวลาส่ง,
      ...cols.map((c) => row.scores.byHeader[c.header] ?? '—'),
    ];
    values.forEach((value, cIdx) => {
      const cell = excelRow.getCell(cIdx + 1);
      cell.value = value;
      applyBody(cell, {
        bg: cIdx >= 4 ? scoreFill(typeof value === 'number' ? value : null) : rIdx % 2 === 1 ? COLORS.zebra : COLORS.white,
        bold: cIdx === 1 || typeof value === 'number',
        align: cIdx <= 3 ? 'left' : 'center',
      });
    });
  });

  detail.getColumn(1).width = 8;
  detail.getColumn(2).width = 22;
  detail.getColumn(3).width = 14;
  detail.getColumn(4).width = 18;
  for (let i = 5; i <= detailHeaders.length; i += 1) {
    detail.getColumn(i).width = 28;
  }

  const legend = wb.addWorksheet('เกณฑ์คะแนน');
  legend.getCell('A1').value = 'เกณฑ์การให้คะแนน';
  legend.getCell('A1').font = { bold: true, size: 14 };
  const legendRows = [
    [1, 'ไม่ทำเลย', COLORS.score1],
    [2, 'ทำน้อย', COLORS.score2],
    [3, 'ทำบ้าง', COLORS.score3],
    [4, 'ทำบ่อย', COLORS.score4],
    [5, 'ทำตลอด', COLORS.score5],
  ] as const;
  legendRows.forEach(([score, label, bg], idx) => {
    const r = legend.getRow(idx + 3);
    r.getCell(1).value = score;
    r.getCell(2).value = label;
    applyBody(r.getCell(1), { bg, bold: true });
    applyBody(r.getCell(2), { bg, align: 'left' });
  });
  legend.getColumn(1).width = 10;
  legend.getColumn(2).width = 18;

  const buffer = await wb.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    fileName
  );
}
