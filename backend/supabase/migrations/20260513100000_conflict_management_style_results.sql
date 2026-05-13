-- Conflict Management Style Assessment — เก็บผลเมื่อผู้ใช้ทำครบ 15 ข้อ
-- คะแนนแต่ละรูปแบบ 3–12 (รวม 3 ข้อ × สเกล 1–4)

create table if not exists public.conflict_management_style_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  company text not null default '',
  style_scores jsonb not null default '{}'::jsonb
);

create index if not exists conflict_management_style_results_created_at_idx
  on public.conflict_management_style_results (created_at desc);

alter table public.conflict_management_style_results enable row level security;

drop policy if exists "Allow insert conflict management style results" on public.conflict_management_style_results;
create policy "Allow insert conflict management style results"
  on public.conflict_management_style_results
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Allow read conflict management style results" on public.conflict_management_style_results;
create policy "Allow read conflict management style results"
  on public.conflict_management_style_results
  for select
  to anon, authenticated
  using (true);
