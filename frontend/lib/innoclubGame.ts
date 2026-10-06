export const INNOCLUB_GAME_TEAMS_TABLE = 'innoclub_game_teams';

export const INNOCLUB_GAME_SQL = `-- InnoClub Game — ทีมแข่งพัฒนาธุรกิจ (คะแนน = เงินในเกม)
-- รันใน Supabase → SQL Editor → Run

create table if not exists public.innoclub_game_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  money numeric not null default 0,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists innoclub_game_teams_money_idx
  on public.innoclub_game_teams (money desc);

alter table public.innoclub_game_teams enable row level security;

drop policy if exists "innoclub_game_teams_select" on public.innoclub_game_teams;
create policy "innoclub_game_teams_select"
  on public.innoclub_game_teams for select
  using (true);

drop policy if exists "innoclub_game_teams_insert" on public.innoclub_game_teams;
create policy "innoclub_game_teams_insert"
  on public.innoclub_game_teams for insert
  with check (true);

drop policy if exists "innoclub_game_teams_update" on public.innoclub_game_teams;
create policy "innoclub_game_teams_update"
  on public.innoclub_game_teams for update
  using (true)
  with check (true);

drop policy if exists "innoclub_game_teams_delete" on public.innoclub_game_teams;
create policy "innoclub_game_teams_delete"
  on public.innoclub_game_teams for delete
  using (true);
`;

export type InnoClubGameTeam = {
  id: string;
  name: string;
  money: number;
  sort_order: number;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type InnoClubRankedTeam = InnoClubGameTeam & {
  rank: number;
};

export function parseMoney(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = parseFloat(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

/** เรียงเงินมาก → น้อย แล้วตัด top N */
export function getTopTeamsByMoney(
  teams: InnoClubGameTeam[],
  limit = 4
): InnoClubRankedTeam[] {
  return [...teams]
    .filter((t) => t.is_active)
    .sort((a, b) => {
      const moneyDiff = parseMoney(b.money) - parseMoney(a.money);
      if (moneyDiff !== 0) return moneyDiff;
      return (a.sort_order || 0) - (b.sort_order || 0);
    })
    .slice(0, limit)
    .map((team, index) => ({
      ...team,
      money: parseMoney(team.money),
      rank: index + 1,
    }));
}

export function mapInnoClubGameTeamRow(row: Record<string, unknown>): InnoClubGameTeam {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    money: parseMoney(row.money),
    sort_order: Number(row.sort_order) || 0,
    is_active: row.is_active !== false,
    created_at: (row.created_at as string | null) || null,
    updated_at: (row.updated_at as string | null) || null,
  };
}

export function isInnoClubGameTableMissingError(message?: string | null): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes(INNOCLUB_GAME_TEAMS_TABLE) ||
    m.includes('does not exist') ||
    m.includes('could not find the table') ||
    m.includes('schema cache')
  );
}
