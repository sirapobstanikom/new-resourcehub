-- Hidden Fox: ลงทะเบียนผู้เล่น + บันทึกผลการเล่น (Hall of Fame)

create table if not exists public.hidden_fox_players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_hidden_fox_players_email on public.hidden_fox_players (lower(email));

create table if not exists public.hidden_fox_runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.hidden_fox_players(id) on delete set null,
  name text not null,
  email text not null,
  company text not null,
  completion_time_sec integer,
  accuracy_percent numeric(5, 2) not null default 0 check (accuracy_percent >= 0 and accuracy_percent <= 100),
  foxes_found integer not null default 0 check (foxes_found >= 0),
  foxes_total integer not null default 8 check (foxes_total > 0),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_hidden_fox_runs_completed_time
  on public.hidden_fox_runs (completed, completion_time_sec asc nulls last);

create index if not exists idx_hidden_fox_runs_completed_accuracy
  on public.hidden_fox_runs (completed, accuracy_percent desc, completion_time_sec asc nulls last);

alter table public.hidden_fox_players enable row level security;
alter table public.hidden_fox_runs enable row level security;

drop policy if exists hidden_fox_players_insert on public.hidden_fox_players;
create policy hidden_fox_players_insert on public.hidden_fox_players
  for insert to anon, authenticated
  with check (true);

drop policy if exists hidden_fox_players_update on public.hidden_fox_players;
create policy hidden_fox_players_update on public.hidden_fox_players
  for update to anon, authenticated
  using (true)
  with check (true);

drop policy if exists hidden_fox_players_select on public.hidden_fox_players;
create policy hidden_fox_players_select on public.hidden_fox_players
  for select to anon, authenticated
  using (true);

drop policy if exists hidden_fox_runs_insert on public.hidden_fox_runs;
create policy hidden_fox_runs_insert on public.hidden_fox_runs
  for insert to anon, authenticated
  with check (true);

drop policy if exists hidden_fox_runs_select on public.hidden_fox_runs;
create policy hidden_fox_runs_select on public.hidden_fox_runs
  for select to anon, authenticated
  using (true);
