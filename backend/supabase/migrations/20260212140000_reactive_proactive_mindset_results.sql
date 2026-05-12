-- Reactive vs Proactive Mindset Assessment — เก็บผลเมื่อผู้ใช้ทำครบ
-- เก็บ: name, email, company, total_score, dimension_scores (+ id, created_at อัตโนมัติ)
-- รันใน Supabase SQL Editor หรือ: supabase db push ตาม workflow โปรเจกต์

create table if not exists public.reactive_proactive_mindset_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  company text not null default '',
  total_score int not null check (total_score >= 20 and total_score <= 100),
  dimension_scores jsonb not null default '{}'::jsonb
);

create index if not exists reactive_proactive_mindset_results_created_at_idx
  on public.reactive_proactive_mindset_results (created_at desc);

alter table public.reactive_proactive_mindset_results enable row level security;

drop policy if exists "Allow insert reactive proactive mindset results" on public.reactive_proactive_mindset_results;
create policy "Allow insert reactive proactive mindset results"
  on public.reactive_proactive_mindset_results
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Allow read reactive proactive mindset results" on public.reactive_proactive_mindset_results;
create policy "Allow read reactive proactive mindset results"
  on public.reactive_proactive_mindset_results
  for select
  to anon, authenticated
  using (true);
