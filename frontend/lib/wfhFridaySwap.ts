/** สลับวัน WFH ประจำวันศุกร์ (nahm / noon) — เบื้องต้นสลับได้เฉพาะจากวันศุกร์ */

export const WFH_SWAP_TAG = /\[WFH_SWAP:(\d{4}-\d{2}-\d{2})\]/;

export function parseWfhSwapFriday(reason: string | null | undefined): string | null {
  const match = reason?.match(WFH_SWAP_TAG);
  return match?.[1] ?? null;
}

export function isWfhSwapRequest(row: { leave_type: string; reason?: string | null }): boolean {
  return row.leave_type === 'wfh' && Boolean(parseWfhSwapFriday(row.reason));
}

export function formatWfhSwapReason(fromFriday: string, extra?: string): string {
  const base = `ขอสลับ WFH จากวันศุกร์ ${fromFriday} มาวันนี้`;
  const note = extra?.trim() ? ` — ${extra.trim()}` : '';
  return `${base}${note} [WFH_SWAP:${fromFriday}]`;
}

export function fridayKey(email: string | undefined, friday: string): string {
  return `${(email ?? '').toLowerCase()}|${friday}`;
}

/** วันศุกร์ที่ถูกสลับออกแล้ว (อนุมัติแล้ว หรือรออนุมัติยกเลิก) — key เป็น email|YYYY-MM-DD */
export function swappedAwayFridayKeys(
  rows: Array<{ user_email?: string; leave_type: string; status: string; reason?: string | null }>
): Set<string> {
  const set = new Set<string>();
  for (const row of rows) {
    if (row.leave_type !== 'wfh') continue;
    if (row.status !== 'approved' && row.status !== 'cancel_requested') continue;
    const friday = parseWfhSwapFriday(row.reason);
    if (friday) set.add(fridayKey(row.user_email, friday));
  }
  return set;
}

/** วันศุกร์ที่มีคำขอสลับค้างอยู่ (pending) — ยังไม่ย้ายออกจากปฏิทิน แต่ห้ามขอซ้ำ */
export function pendingSwapFridayKeys(
  rows: Array<{ user_email?: string; leave_type: string; status: string; reason?: string | null }>
): Set<string> {
  const set = new Set<string>();
  for (const row of rows) {
    if (row.leave_type !== 'wfh' || row.status !== 'pending') continue;
    const friday = parseWfhSwapFriday(row.reason);
    if (friday) set.add(fridayKey(row.user_email, friday));
  }
  return set;
}

export function isFridaySwappedAway(
  keys: Set<string>,
  email: string | undefined,
  friday: string
): boolean {
  return keys.has(fridayKey(email, friday));
}

export function stripWfhSwapTag(reason: string | null | undefined): string {
  return (reason ?? '').replace(WFH_SWAP_TAG, '').replace(/\s+/g, ' ').trim();
}

export function upcomingFridays(fromDateKey: string, count = 12): string[] {
  const [y, m, d] = fromDateKey.split('-').map(Number);
  const cursor = new Date(y, m - 1, d);
  const out: string[] = [];
  while (out.length < count) {
    if (cursor.getDay() === 5) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      if (key >= fromDateKey) out.push(key);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export function weekdayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** จันทร์–พฤหัส = สลับไปได้, ศุกร์/เสาร์/อาทิตย์ = ไม่ได้ (เบื้องต้นสลับจากศุกร์เท่านั้น) */
export function isAllowedWfhSwapTarget(dateKey: string): boolean {
  const day = weekdayIndex(dateKey);
  return day >= 1 && day <= 4;
}
