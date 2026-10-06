-- Run in Supabase SQL Editor (ครั้งเดียว)
-- ตั้งค่าแบบประเมิน Innovation: โจทย์ / ผู้ประเมิน / น้ำหนัก แก้ได้จากหน้า /evaluation/innovation
create table if not exists public.innovation_evaluation_config (
  id text primary key,
  config_json jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.innovation_evaluation_config enable row level security;
grant select, insert, update on table public.innovation_evaluation_config to anon, authenticated;

drop policy if exists "innovation_evaluation_config_select" on public.innovation_evaluation_config;
create policy "innovation_evaluation_config_select" on public.innovation_evaluation_config
for select to anon, authenticated using (true);

drop policy if exists "innovation_evaluation_config_insert" on public.innovation_evaluation_config;
create policy "innovation_evaluation_config_insert" on public.innovation_evaluation_config
for insert to anon, authenticated with check (true);

drop policy if exists "innovation_evaluation_config_update" on public.innovation_evaluation_config;
create policy "innovation_evaluation_config_update" on public.innovation_evaluation_config
for update to anon, authenticated using (true) with check (true);

-- เก็บคะแนนเกณฑ์ที่เพิ่มใหม่ได้
alter table public.innovation_evaluation_responses add column if not exists scores_json jsonb;

-- เกณฑ์เดิมลบได้ / ผู้ประเมินเพิ่มใหม่ได้
alter table public.innovation_evaluation_responses alter column score_business_clarity drop not null;
alter table public.innovation_evaluation_responses alter column score_open_innovation drop not null;
alter table public.innovation_evaluation_responses alter column score_idea_value drop not null;
alter table public.innovation_evaluation_responses alter column score_feasibility drop not null;
alter table public.innovation_evaluation_responses alter column score_pitching_quality drop not null;

do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.innovation_evaluation_responses'::regclass and contype = 'c'
  loop
    execute format('alter table public.innovation_evaluation_responses drop constraint %I', r.conname);
  end loop;
end $$;
