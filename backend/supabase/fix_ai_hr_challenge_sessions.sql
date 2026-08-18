-- AI HR Challenge — สร้างตาราง (ถ้ายังไม่มี) หรือเพิ่มคอลัมน์ optional
-- รันใน Supabase SQL Editor

create table if not exists public.ai_hr_challenge_players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  company text not null default '',
  position text not null default '',
  employee_count text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_hr_challenge_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.ai_hr_challenge_players(id) on delete set null,
  name text not null,
  email text not null,
  company text not null default '',
  position text not null default '',
  employee_count text not null default '',
  case_id text not null,
  selected_option text not null check (selected_option in ('A', 'B', 'C', 'D')),
  correct boolean not null default false,
  score integer not null check (score >= 0 and score <= 100),
  title text not null default '',
  created_at timestamptz not null default now()
);

-- optional columns (ไม่บังคับ — frontend ใช้ case_id encode คำตอบ 3 ข้อได้แล้ว)
alter table public.ai_hr_challenge_sessions add column if not exists correct_count integer;
alter table public.ai_hr_challenge_sessions add column if not exists total_questions integer default 3;
alter table public.ai_hr_challenge_sessions add column if not exists answers_json jsonb;

alter table public.ai_hr_challenge_players enable row level security;
alter table public.ai_hr_challenge_sessions enable row level security;

drop policy if exists "ai_hr_players_anon_insert" on public.ai_hr_challenge_players;
create policy "ai_hr_players_anon_insert"
  on public.ai_hr_challenge_players for insert to anon, authenticated with check (true);

drop policy if exists "ai_hr_players_anon_select" on public.ai_hr_challenge_players;
create policy "ai_hr_players_anon_select"
  on public.ai_hr_challenge_players for select to anon, authenticated using (true);

drop policy if exists "ai_hr_players_anon_update" on public.ai_hr_challenge_players;
create policy "ai_hr_players_anon_update"
  on public.ai_hr_challenge_players for update to anon, authenticated using (true) with check (true);

drop policy if exists "ai_hr_sessions_anon_insert" on public.ai_hr_challenge_sessions;
create policy "ai_hr_sessions_anon_insert"
  on public.ai_hr_challenge_sessions for insert to anon, authenticated with check (true);

drop policy if exists "ai_hr_sessions_anon_select" on public.ai_hr_challenge_sessions;
create policy "ai_hr_sessions_anon_select"
  on public.ai_hr_challenge_sessions for select to anon, authenticated using (true);

grant select, insert, update on public.ai_hr_challenge_players to anon, authenticated;
grant select, insert on public.ai_hr_challenge_sessions to anon, authenticated;
