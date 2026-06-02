import type { GameMap, GameSettings, WolfPosition } from './types';

export const LEADERBOARD_STORAGE_KEY = 'fox_protocol_leaderboard_local';
export const SETTINGS_STORAGE_KEY = 'wolf_protocol_admin_settings';

export const ASSET_BASE = '/hidden-fox-game';

const FOX_ASSET_BASE =
  'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/find%20fox';

/** แมปหลัก — ไม่มีจิ้งจอกฝังในรูป */
export const HIDDEN_FOX_MAP_URL = `${FOX_ASSET_BASE}/BD%20for%20WEB%20nofox.jpg`;

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

/** รูปตัวอย่างหน้าโฮม */
export const FOX_IMAGE = FOX_IMAGES[0];

export const DEFAULT_MAP_URL = HIDDEN_FOX_MAP_URL;
export const HIDDEN_FOX_COUNT = FOX_IMAGES.length;

export const DEFAULT_MAPS: GameMap[] = [
  {
    id: 'map-find-fox',
    name: 'Find the Fox',
    url: HIDDEN_FOX_MAP_URL,
    wolfPositions: [],
  },
];

export const DEFAULT_SETTINGS: GameSettings = {
  wolfCount: HIDDEN_FOX_COUNT,
  precision: 6,
  timeLimit: 90,
  activeMapId: 'map-find-fox',
  maps: DEFAULT_MAPS,
};

/** สุ่มตำแหน่งจิ้งจอกบนแมป (เปอร์เซ็นต์) — เรียกใหม่ทุกครั้งที่เริ่มเล่น */
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

/** Normalize map URLs saved with relative paths from the standalone build. */
export function resolveMapUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
    return url;
  }
  return `${ASSET_BASE}/${url.replace(/^\//, '')}`;
}

const LEGACY_MAP_PATTERN = /mapF\.png|map2\.jpeg|map\/map\.jpeg|Reading Park|Standard Forest/i;

export function normalizeSettings(raw: Partial<GameSettings>): GameSettings {
  const maps = (raw.maps ?? DEFAULT_MAPS).map((m) => {
    const url = resolveMapUrl(m.url);
    const useNewMap = LEGACY_MAP_PATTERN.test(url) || LEGACY_MAP_PATTERN.test(m.name);
    return {
      ...m,
      url: useNewMap ? HIDDEN_FOX_MAP_URL : url,
      name: useNewMap ? 'Find the Fox' : m.name,
      wolfPositions: [],
    };
  });
  const normalizedMaps =
    maps.length > 0 && maps.some((m) => m.url === HIDDEN_FOX_MAP_URL) ? maps : DEFAULT_MAPS;
  return {
    wolfCount: HIDDEN_FOX_COUNT,
    precision: raw.precision ?? DEFAULT_SETTINGS.precision,
    timeLimit: raw.timeLimit ?? DEFAULT_SETTINGS.timeLimit,
    activeMapId: normalizedMaps[0]?.id ?? DEFAULT_SETTINGS.activeMapId,
    maps: normalizedMaps,
  };
}
