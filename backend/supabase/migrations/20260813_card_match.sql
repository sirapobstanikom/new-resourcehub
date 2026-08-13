-- จับคู่การ์ด: ผู้เล่น + สถิติเวลา (แข่งกันที่เวลาเร็วสุด)
-- รันใน Supabase SQL Editor แล้วเปิด Realtime ให้ตาราง card_match_runs

create table if not exists public.card_match_players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  company text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.card_match_runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.card_match_players(id) on delete set null,
  name text not null,
  email text not null,
  company text not null default '',
  completion_time_ms integer not null,
  moves integer not null default 0,
  pairs integer not null default 8,
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists card_match_runs_email_key
  on public.card_match_runs (lower(email));

create index if not exists card_match_runs_time_idx
  on public.card_match_runs (completion_time_ms asc, moves asc);

alter table public.card_match_players enable row level security;
alter table public.card_match_runs enable row level security;

drop policy if exists card_match_players_select on public.card_match_players;
drop policy if exists card_match_players_insert on public.card_match_players;
drop policy if exists card_match_players_update on public.card_match_players;
drop policy if exists card_match_runs_select on public.card_match_runs;
drop policy if exists card_match_runs_insert on public.card_match_runs;
drop policy if exists card_match_runs_update on public.card_match_runs;

create policy card_match_players_select on public.card_match_players
  for select using (true);
create policy card_match_players_insert on public.card_match_players
  for insert with check (true);
create policy card_match_players_update on public.card_match_players
  for update using (true) with check (true);

create policy card_match_runs_select on public.card_match_runs
  for select using (true);
create policy card_match_runs_insert on public.card_match_runs
  for insert with check (completed = true);
create policy card_match_runs_update on public.card_match_runs
  for update using (true) with check (true);

do $$
begin
  alter publication supabase_realtime add table public.card_match_runs;
exception
  when duplicate_object then null;
end $$;
