export const TEAMBUILDING_TEAMS_TABLE = 'teambuilding_teams';

export const TEAMBUILDING_SQL_PATH = 'backend/supabase/sql/create_teambuilding_teams.sql';

export const TEAMBUILDING_COLORS = [
  '#22d3ee',
  '#f472b6',
  '#facc15',
  '#4ade80',
  '#a78bfa',
  '#fb923c',
  '#60a5fa',
  '#f87171',
  '#2dd4bf',
  '#e879f9',
] as const;

export type TeambuildingTeam = {
  id: string;
  name: string;
  score: number;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RankedTeambuildingTeam = TeambuildingTeam & { rank: number };

export const TEAMBUILDING_SELECT = 'id, name, score, color, sort_order, is_active, created_at, updated_at';

export function parseScore(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = parseFloat(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

export function formatScore(value: number): string {
  return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 1 }).format(value);
}

export function mapTeambuildingRow(row: Record<string, unknown>): TeambuildingTeam {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    score: parseScore(row.score),
    color: typeof row.color === 'string' && row.color ? row.color : TEAMBUILDING_COLORS[0],
    sort_order: Number(row.sort_order) || 0,
    is_active: row.is_active !== false,
    created_at: (row.created_at as string | null) || null,
    updated_at: (row.updated_at as string | null) || null,
  };
}

/** Same score = same rank (1, 2, 2, 4) */
export function rankTeams(teams: TeambuildingTeam[]): RankedTeambuildingTeam[] {
  const sorted = [...teams]
    .filter((t) => t.is_active)
    .sort((a, b) => b.score - a.score || a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  let lastScore: number | null = null;
  let lastRank = 0;
  return sorted.map((team, index) => {
    if (lastScore === null || team.score !== lastScore) {
      lastRank = index + 1;
      lastScore = team.score;
    }
    return { ...team, rank: lastRank };
  });
}

export function isTeambuildingTableMissingError(message?: string | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes(TEAMBUILDING_TEAMS_TABLE) ||
    m.includes('does not exist') ||
    m.includes('could not find the table') ||
    m.includes('schema cache')
  );
}
