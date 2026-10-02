-- InnoClub Game — ทีมแข่งพัฒนาธุรกิจ (คะแนน = เงินในเกม)
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

do $$
begin
  begin
    alter publication supabase_realtime add table public.innoclub_game_teams;
  exception
    when duplicate_object then null;
    when others then null;
  end;
end $$;
