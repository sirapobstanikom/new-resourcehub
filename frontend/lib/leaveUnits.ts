/**
 * หน่วยลา: เก็บใน DB แบบเดิม (วัน + ชั่วโมงย่อย) แต่ UI แสดงเป็น "วัน" + "ครึ่งวัน"
 * 1 วัน = 8 ชม. | ครึ่งวัน = 4 ชม. | เศษชม. ceil เป็นครึ่งวัน (ทีละ 4 ชม.)
 */

export type LeaveDayPart = 'full' | 'morning' | 'afternoon';

export const LEAVE_DAY_PART_TIMES: Record<LeaveDayPart, { start: string; end: string }> = {
  full: { start: '09:00', end: '17:00' },
  morning: { start: '09:00', end: '13:00' },
  afternoon: { start: '13:00', end: '17:00' },
};

export function countWeekdaysInRange(startIso: string, endIso: string): number {
  const start = new Date(startIso + 'T12:00:00Z').getTime();
  const end = new Date(endIso + 'T12:00:00Z').getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  let count = 0;
  for (let t = start; t <= end; t += oneDay) {
    const day = new Date(t).getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

export function hoursBetweenTimes(startTime: string | null | undefined, endTime: string | null | undefined): number {
  if (!startTime || !endTime) return 0;
  const parse = (t: string) => {
    const parts = String(t).trim().split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] ? parseInt(parts[1], 10) : 0;
    return (Number.isNaN(h) ? 0 : h) + (Number.isNaN(m) ? 0 : m) / 60;
  };
  const s = parse(startTime);
  const e = parse(endTime);
  if (e <= s) return 0;
  return Math.round((e - s) * 100) / 100;
}

/** คงเหลือจาก days + hours ใน DB → "X วัน" / "Y ครึ่งวัน" */
export function formatBalanceDaysHalves(days: number, hoursRemainder: number): string {
  const totalH = Math.round(Math.max(0, days) * 8 + Math.max(0, Number(hoursRemainder ?? 0)));
  if (totalH <= 0) return '0 วัน';
  let full = Math.floor(totalH / 8);
  const rem = totalH % 8;
  if (rem === 0) return `${full} วัน`;
  let halves = Math.ceil(rem / 4);
  if (halves >= 2) {
    full += 1;
    halves = 0;
  }
  const parts: string[] = [];
  if (full > 0) parts.push(`${full} วัน`);
  if (halves > 0) parts.push(`${halves} ครึ่งวัน`);
  return parts.join(' ') || '0 วัน';
}

/** จำนวนชั่วโมงเทียบเท่ารวม → แสดงเป็นวัน + ครึ่งวัน */
export function formatTotalHoursAsDaysHalves(totalHours: number): string {
  const t = Math.round(Math.max(0, totalHours));
  return formatBalanceDaysHalves(Math.floor(t / 8), t % 8);
}

/** ช่วงลา 1 วัน = เต็มวัน / ครึ่งวันเช้า / ครึ่งวันบ่าย | หลายวัน = นับวันทำงานเต็มวัน */
export function formatLeaveSlotLabel(
  startDate: string,
  endDate: string,
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): string {
  if (startDate !== endDate) {
    const n = countWeekdaysInRange(startDate, endDate);
    return `${n} วันทำงาน (เต็มวัน)`;
  }
  const st = (startTime || '').trim().slice(0, 5);
  const et = (endTime || '').trim().slice(0, 5);
  if (!st || !et) return 'เต็มวัน';
  const h = hoursBetweenTimes(startTime, endTime);
  if (h >= 7.5) return 'เต็มวัน';
  if (st === '09:00' && et === '13:00') return 'ครึ่งวันเช้า';
  if (st === '13:00' && et === '17:00') return 'ครึ่งวันบ่าย';
  if (h <= 0) return 'เต็มวัน';
  const sh = parseInt(st.slice(0, 2), 10);
  return !Number.isNaN(sh) && sh < 12 ? 'ครึ่งวันเช้า' : 'ครึ่งวันบ่าย';
}

/** โควตาที่ขอใช้ในหน่วยชั่วโมงเทียบเท่า (สำหรับเทียบกับคงเหลือ) */
export function requestedLeaveHoursEquivalent(
  startDate: string,
  endDate: string,
  startTime: string | null | undefined,
  endTime: string | null | undefined,
): number {
  if (startDate !== endDate) {
    return countWeekdaysInRange(startDate, endDate) * 8;
  }
  if (!startTime?.trim() || !endTime?.trim()) return 8;
  const h = hoursBetweenTimes(startTime, endTime);
  if (h >= 7.5) return 8;
  return 4;
}
