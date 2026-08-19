export const VIEW_W = 640;
export const VIEW_H = 480;
export const WORLD_W = 2600;
export const GROUND_Y = 420;
export const BLOCK_WORLD_X = 260;
export const BLOCK_BASE_Y = 160;
export const BLOCK_W = 80;
export const BLOCK_H = 80;

export const AUTO_RUN_SPEED = 4.3;
export const PRIZE_RUN_SPEED = 8.6;
export const PRIZE_KICK_VY = -13;
/** ต้องนำหน้าผู้เล่นขนาดนี้ก่อน ถึงจะแตะเก็บได้ */
export const PRIZE_MIN_LEAD = 120;
export const CAMERA_FOLLOW_X = 200;
export const FINISH_X = 2380;

/** ช่วงพื้นที่มีพื้น — ช่องว่างระหว่าง segment คือหลุม */
export const GROUND_SEGMENTS: { start: number; end: number }[] = [
  { start: 0, end: 520 },
  { start: 600, end: 860 },
  { start: 940, end: 1220 },
  { start: 1300, end: 1620 },
  { start: 1700, end: WORLD_W },
];

export function feetOnGround(left: number, right: number): boolean {
  const mid = (left + right) / 2;
  for (const seg of GROUND_SEGMENTS) {
    if (mid >= seg.start + 4 && mid <= seg.end - 4) return true;
  }
  return false;
}

export function clampCamera(playerWorldX: number): number {
  return Math.max(0, Math.min(WORLD_W - VIEW_W, playerWorldX - CAMERA_FOLLOW_X));
}

export function worldToScreen(worldX: number, cameraX: number): number {
  return worldX - cameraX;
}

export function isVisible(worldX: number, width: number, cameraX: number): boolean {
  const sx = worldX - cameraX;
  return sx + width >= -40 && sx <= VIEW_W + 40;
}

/** ตำแหน่งเริ่มของ segment ที่อยู่ถัดจากหลุม (ใช้ respawn) */
export function respawnXForFall(fromX: number): number {
  for (const seg of GROUND_SEGMENTS) {
    if (fromX < seg.end) return seg.start + 24;
  }
  return 120;
}

export const SCENERY_BUSHES = [90, 420, 720, 1050, 1380, 1720, 2100];
