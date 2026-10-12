-- ผลเกม Face Mood Scan (/gamification/face-scan) — ไม่เก็บรูปภาพใบหน้า
create table if not exists public.face_scan_results (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  email text not null,
  mood_id text not null,
  mood_title text not null,
  mood_scores jsonb not null default '{}'::jsonb,
  expressions jsonb not null default '{}'::jsonb,
  sample_count int,
  scanned_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.face_scan_results add column if not exists mood_scores jsonb not null default '{}'::jsonb;

create index if not exists face_scan_results_created_at_idx on public.face_scan_results (created_at desc);

alter table public.face_scan_results enable row level security;

drop policy if exists "face_scan_results_insert" on public.face_scan_results;
create policy "face_scan_results_insert" on public.face_scan_results
  for insert with check (true);

drop policy if exists "face_scan_results_select" on public.face_scan_results;
create policy "face_scan_results_select" on public.face_scan_results
  for select using (true);
