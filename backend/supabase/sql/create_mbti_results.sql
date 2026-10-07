-- MBTI Assessment (/assessment/mbti) — ผลแบบทดสอบ 32 ข้อ
-- รันใน Supabase → SQL Editor → Run

create table if not exists public.mbti_results (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  age integer,
  company text,
  email text not null,
  -- answers: { "1": คะแนนข้อ ก. (0–5), ... } — ข้อ ข. = 5 − ค่านั้น
  answers jsonb not null default '{}'::jsonb,
  -- scores: { "E": 0–40, "I": ..., "S", "N", "T", "F", "J", "P" }
  scores jsonb not null default '{}'::jsonb,
  mbti_type text not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists mbti_results_created_at_idx
  on public.mbti_results (created_at desc);

alter table public.mbti_results enable row level security;

drop policy if exists "mbti_results_insert" on public.mbti_results;
create policy "mbti_results_insert"
  on public.mbti_results for insert
  with check (true);

drop policy if exists "mbti_results_select" on public.mbti_results;
create policy "mbti_results_select"
  on public.mbti_results for select
  using (true);
