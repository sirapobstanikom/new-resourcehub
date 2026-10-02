-- Teambuilding Dashboard — ทีมและคะแนนแบบเรียลไทม์
-- รันใน Supabase → SQL Editor → Run

create table if not exists public.teambuilding_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  score numeric not null default 0,
  color text not null default '#22d3ee',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teambuilding_teams_score_idx
  on public.teambuilding_teams (score desc);

alter table public.teambuilding_teams enable row level security;

drop policy if exists "teambuilding_teams_select" on public.teambuilding_teams;
create policy "teambuilding_teams_select"
  on public.teambuilding_teams for select
  using (true);

drop policy if exists "teambuilding_teams_insert" on public.teambuilding_teams;
create policy "teambuilding_teams_insert"
  on public.teambuilding_teams for insert
  with check (true);

drop policy if exists "teambuilding_teams_update" on public.teambuilding_teams;
create policy "teambuilding_teams_update"
  on public.teambuilding_teams for update
  using (true)
  with check (true);

drop policy if exists "teambuilding_teams_delete" on public.teambuilding_teams;
create policy "teambuilding_teams_delete"
  on public.teambuilding_teams for delete
  using (true);

do $$
begin
  begin
    alter publication supabase_realtime add table public.teambuilding_teams;
  exception
    when duplicate_object then null;
    when others then null;
  end;
end $$;
