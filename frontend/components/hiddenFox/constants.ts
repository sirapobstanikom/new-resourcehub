import type { WolfPosition } from './types';

const FOX_ASSET_BASE =
  'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/find%20fox';

/** แมปหลัก */
export const HIDDEN_FOX_MAP_URL = `${FOX_ASSET_BASE}/BD%20for%20WEB%20NOFOX.jpg`;

export const FOX_IMAGES: readonly string[] = [
  `${FOX_ASSET_BASE}/V1_0.png`,
  `${FOX_ASSET_BASE}/V2_0.png`,
  `${FOX_ASSET_BASE}/V3_0.png`,
  `${FOX_ASSET_BASE}/V4_0.png`,
  `${FOX_ASSET_BASE}/V5_0.png`,
  `${FOX_ASSET_BASE}/V6_0.png`,
  `${FOX_ASSET_BASE}/V7_0.png`,
  `${FOX_ASSET_BASE}/V8_0.png`,
];

export const FOX_IMAGE = FOX_IMAGES[0];
export const HIDDEN_FOX_COUNT = FOX_IMAGES.length;

/** ค่าคงที่เกม (ไม่มี Settings แล้ว) */
export const GAME_TIME_LIMIT_SEC = 90;
export const HIT_PRECISION = 6;

export function generateFoxSpawns(count = HIDDEN_FOX_COUNT): WolfPosition[] {
  const positions: WolfPosition[] = [];
  const margin = 8;
  const minDist = 10;
  const maxAttempts = 120;

  for (let i = 0; i < count; i++) {
    const imageUrl = FOX_IMAGES[i] ?? FOX_IMAGES[0];
    let placed = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = margin + Math.random() * (100 - margin * 2);
      const y = margin + Math.random() * (100 - margin * 2);
      const tooClose = positions.some((p) => {
        const dx = p.x - x;
        const dy = p.y - y;
        return Math.sqrt(dx * dx + dy * dy) < minDist;
      });
      if (!tooClose) {
        positions.push({ x, y, imageUrl });
        placed = true;
        break;
      }
    }

    if (!placed) {
      positions.push({
        x: margin + Math.random() * (100 - margin * 2),
        y: margin + Math.random() * (100 - margin * 2),
        imageUrl,
      });
    }
  }

  return positions;
}
