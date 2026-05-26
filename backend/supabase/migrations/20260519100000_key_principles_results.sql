-- Key Principles Assessment results (ชื่อ + บริษัท, ไม่มีอีเมล)

create table if not exists public.key_principles_results (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  total_score int not null,
  principle_scores jsonb not null default '{}'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists key_principles_results_created_at_idx
  on public.key_principles_results (created_at desc);

alter table public.key_principles_results enable row level security;

drop policy if exists "Allow insert key principles results" on public.key_principles_results;
create policy "Allow insert key principles results"
  on public.key_principles_results for insert
  with check (true);

drop policy if exists "Allow read key principles results" on public.key_principles_results;
create policy "Allow read key principles results"
  on public.key_principles_results for select
  using (true);
