import ExcelJS from 'exceljs';
import {
  buildElevateResponsesExcelSheets,
  type ElevateExcelComparisonRow,
  type ElevateTestBank,
  type ElevateTestResponse,
} from './elevatePretestPosttest';

const COLORS = {
  headerFill: 'FFCC00',
  headerFont: '111111',
  pretestFill: 'FFF8E1',
  pretestHeader: 'FFE082',
  posttestFill: 'E8F5E9',
  posttestHeader: 'A5D6A7',
  gainPosFill: 'C8E6C9',
  gainNegFill: 'FFCDD2',
  gainZeroFill: 'FFF9C4',
  zebra: 'FAFAF8',
  white: 'FFFFFF',
  border: 'D6D4CC',
  statusComplete: 'E3F2FD',
  statusPreOnly: 'FFF3E0',
  statusPostOnly: 'F3E5F5',
  titleFill: '1E1E1E',
  titleFont: 'FFCC00',
};

type Argb = string;

function fillSolid(argb: Argb): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const edge: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: COLORS.border } };
  return { top: edge, left: edge, bottom: edge, right: edge };
}

function applyHeaderCell(cell: ExcelJS.Cell, bg: Argb) {
  cell.fill = fillSolid(bg);
  cell.font = { bold: true, color: { argb: COLORS.headerFont }, size: 11, name: 'Calibri' };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = thinBorder();
}

function applyBodyCell(
  cell: ExcelJS.Cell,
  opts: {
    bg?: Argb;
    bold?: boolean;
    align?: 'left' | 'center' | 'right';
    fontColor?: Argb;
  } = {}
) {
  cell.fill = fillSolid(opts.bg || COLORS.white);
  cell.font = {
    bold: opts.bold || false,
    color: { argb: opts.fontColor || '1F2937' },
    size: 11,
    name: 'Calibri',
  };
  cell.alignment = { vertical: 'middle', horizontal: opts.align || 'center', wrapText: true };
  cell.border = thinBorder();
}

function gainFill(value: number | string): Argb {
  if (value === '—' || value === '' || value == null) return COLORS.white;
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return COLORS.white;
  if (n > 0) return COLORS.gainPosFill;
  if (n < 0) return COLORS.gainNegFill;
  return COLORS.gainZeroFill;
}

function statusFill(status: string): Argb {
  if (status.includes('ครบ')) return COLORS.statusComplete;
  if (status.includes('Pretest')) return COLORS.statusPreOnly;
  if (status.includes('Posttest')) return COLORS.statusPostOnly;
  return COLORS.white;
}

function autoWidth(ws: ExcelJS.Worksheet, min = 10, max = 36) {
  ws.columns.forEach((col) => {
    let longest = min;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const text = cell.value == null ? '' : String(cell.value);
      longest = Math.min(max, Math.max(longest, text.length + 2));
    });
    col.width = longest;
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function addComparisonSheet(
  wb: ExcelJS.Workbook,
  bankName: string,
  rows: ElevateExcelComparisonRow[]
) {
  const ws = wb.addWorksheet('เปรียบเทียบ Pre-Post', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  ws.mergeCells('A1:I1');
  const title = ws.getCell('A1');
  title.value = `เปรียบเทียบ Pretest / Posttest — ${bankName}`;
  title.fill = fillSolid(COLORS.titleFill);
  title.font = { bold: true, color: { argb: COLORS.titleFont }, size: 14, name: 'Calibri' };
  title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 28;

  const headers = [
    'ลำดับ',
    'ชื่อ',
    'Pretest คะแนน',
    'Pretest %',
    'Posttest คะแนน',
    'Posttest %',
    'พัฒนา (จุด %)',
    'พัฒนา (%)',
    'สถานะ',
  ] as const;

  const headerColors: Argb[] = [
    COLORS.headerFill,
    COLORS.headerFill,
    COLORS.pretestHeader,
    COLORS.pretestHeader,
    COLORS.posttestHeader,
    COLORS.posttestHeader,
    COLORS.headerFill,
    COLORS.headerFill,
    COLORS.headerFill,
  ];

  const headerRow = ws.getRow(2);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    applyHeaderCell(cell, headerColors[i]);
  });
  headerRow.height = 24;

  rows.forEach((row, idx) => {
    const excelRow = ws.getRow(idx + 3);
    const zebra = idx % 2 === 1 ? COLORS.zebra : COLORS.white;
    const values: (string | number)[] = [
      row.ลำดับ,
      row.ชื่อ,
      row['Pretest คะแนน'],
      row['Pretest %'],
      row['Posttest คะแนน'],
      row['Posttest %'],
      row['พัฒนา (จุด %)'],
      row['พัฒนา (%)'],
      row.สถานะ,
    ];

    values.forEach((value, colIdx) => {
      const cell = excelRow.getCell(colIdx + 1);
      cell.value = value;

      let bg = zebra;
      if (colIdx === 2 || colIdx === 3) bg = COLORS.pretestFill;
      else if (colIdx === 4 || colIdx === 5) bg = COLORS.posttestFill;
      else if (colIdx === 6 || colIdx === 7) bg = gainFill(value);
      else if (colIdx === 8) bg = statusFill(String(value));

      applyBodyCell(cell, {
        bg,
        bold: colIdx === 1 || colIdx === 6 || colIdx === 7,
        align: colIdx === 1 || colIdx === 8 ? 'left' : 'center',
      });
    });
    excelRow.height = 20;
  });

  autoWidth(ws, 12, 28);
  ws.getColumn(2).width = 28;
  ws.getColumn(9).width = 18;
}

function addRawSheet(
  wb: ExcelJS.Workbook,
  rows: Record<string, string | number>[]
) {
  const ws = wb.addWorksheet('คำตอบทั้งหมด', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  if (rows.length === 0) {
    ws.getCell('A1').value = 'ยังไม่มีคำตอบ';
    return;
  }

  const headers = Object.keys(rows[0]);
  const headerRow = ws.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    const isPre = h.includes('Pretest') || h === 'รอบ';
    applyHeaderCell(cell, isPre ? COLORS.pretestHeader : COLORS.headerFill);
  });
  headerRow.height = 22;

  rows.forEach((row, idx) => {
    const excelRow = ws.getRow(idx + 2);
    const phase = String(row['รอบ'] || '');
    const rowTint =
      phase === 'Pretest' ? COLORS.pretestFill : phase === 'Posttest' ? COLORS.posttestFill : COLORS.white;

    headers.forEach((h, colIdx) => {
      const cell = excelRow.getCell(colIdx + 1);
      cell.value = row[h] ?? '';
      applyBodyCell(cell, {
        bg: colIdx <= 6 ? rowTint : idx % 2 === 1 ? COLORS.zebra : COLORS.white,
        align: colIdx === 1 || colIdx === 2 || colIdx >= 7 ? 'left' : 'center',
      });
    });
  });

  autoWidth(ws, 10, 32);
  ws.getColumn(2).width = 24;
}

/** สร้างและดาวน์โหลด Excel แบบมีสี + ตารางอ่านง่าย */
export async function downloadElevateResponsesStyledExcel(
  bank: ElevateTestBank,
  allResponses: ElevateTestResponse[]
): Promise<{ comparisonCount: number; pairedCount: number; responseCount: number }> {
  const { rawRows, comparisonRows, fileBaseName } = buildElevateResponsesExcelSheets(
    bank,
    allResponses
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = 'MindDoJo Elevate';
  wb.created = new Date();

  if (comparisonRows.length > 0) {
    addComparisonSheet(wb, bank.name || fileBaseName, comparisonRows);
  }
  addRawSheet(wb, rawRows);

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `${fileBaseName}_pretest-posttest.xlsx`);

  return {
    comparisonCount: comparisonRows.length,
    pairedCount: comparisonRows.filter((r) => r.สถานะ === 'ทำครบ Pre + Post').length,
    responseCount: rawRows.length,
  };
}
