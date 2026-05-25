import type { GameMap, GameSettings } from './types';

export const LEADERBOARD_STORAGE_KEY = 'fox_protocol_leaderboard_local';
export const SETTINGS_STORAGE_KEY = 'wolf_protocol_admin_settings';

export const ASSET_BASE = '/hidden-fox-game';
export const FOX_IMAGE =
  'https://axaasphuaaadzjoffznj.supabase.co/storage/v1/object/public/images/FOX%20NEW.png';

/** Park map without grey wolves baked into the artwork (mapF/map2 have hidden wolves in the illustration). */
export const DEFAULT_MAP_URL = `${ASSET_BASE}/map/map.jpeg`;

export const DEFAULT_MAPS: GameMap[] = [
  {
    id: 'map-1',
    name: 'Reading Park',
    url: DEFAULT_MAP_URL,
    wolfPositions: [
      { x: 28, y: 42 },
      { x: 58, y: 58 },
      { x: 72, y: 28 },
      { x: 38, y: 78 },
    ],
  },
];

export const DEFAULT_SETTINGS: GameSettings = {
  wolfCount: 4,
  precision: 5,
  timeLimit: 25,
  activeMapId: 'map-1',
  maps: DEFAULT_MAPS,
};

/** Normalize map URLs saved with relative paths from the standalone build. */
export function resolveMapUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
    return url;
  }
  return `${ASSET_BASE}/${url.replace(/^\//, '')}`;
}

const LEGACY_MAPS_WITH_BAKED_WOLVES = /mapF\.png|map2\.jpeg/i;

export function normalizeSettings(raw: Partial<GameSettings>): GameSettings {
  const maps = (raw.maps ?? DEFAULT_MAPS).map((m) => {
    const url = resolveMapUrl(m.url);
    const useCleanMap = LEGACY_MAPS_WITH_BAKED_WOLVES.test(url);
    return {
      ...m,
      url: useCleanMap ? DEFAULT_MAP_URL : url,
      name: useCleanMap && m.name === 'Standard Forest' ? 'Reading Park' : m.name,
    };
  });
  return {
    wolfCount: raw.wolfCount ?? DEFAULT_SETTINGS.wolfCount,
    precision: raw.precision ?? DEFAULT_SETTINGS.precision,
    timeLimit: raw.timeLimit ?? DEFAULT_SETTINGS.timeLimit,
    activeMapId: raw.activeMapId ?? DEFAULT_SETTINGS.activeMapId,
    maps: maps.length > 0 ? maps : DEFAULT_MAPS,
  };
}
