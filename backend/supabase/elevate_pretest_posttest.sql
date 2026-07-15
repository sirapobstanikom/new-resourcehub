-- Elevate Pretest/Posttest — รันใน Supabase SQL Editor ครั้งเดียว
-- ตารางชุดข้อสอบ + คำตอบผู้ทำแบบทดสอบ

create table if not exists public.elevate_pretest_posttest_banks (
  id text primary key,
  name text not null,
  description text not null default '',
  pretest_json jsonb not null default '[]'::jsonb,
  posttest_json jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.elevate_pretest_posttest_banks enable row level security;

drop policy if exists "elevate_ppt_banks_all" on public.elevate_pretest_posttest_banks;
create policy "elevate_ppt_banks_all"
on public.elevate_pretest_posttest_banks
for all
using (true)
with check (true);

create table if not exists public.elevate_pretest_posttest_responses (
  id text primary key,
  bank_id text not null references public.elevate_pretest_posttest_banks(id) on delete cascade,
  bank_name text not null default '',
  phase text not null check (phase in ('pretest', 'posttest')),
  respondent_name text not null,
  answers_json jsonb not null default '{}'::jsonb,
  score integer not null default 0,
  total integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists elevate_ppt_responses_bank_id_idx
  on public.elevate_pretest_posttest_responses (bank_id);

create index if not exists elevate_ppt_responses_created_at_idx
  on public.elevate_pretest_posttest_responses (created_at desc);

alter table public.elevate_pretest_posttest_responses enable row level security;

drop policy if exists "elevate_ppt_responses_all" on public.elevate_pretest_posttest_responses;
create policy "elevate_ppt_responses_all"
on public.elevate_pretest_posttest_responses
for all
using (true)
with check (true);
