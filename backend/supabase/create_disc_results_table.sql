-- Create table for DISC assessment results
-- Expected by `frontend/components/DiscAssessment.tsx`

create extension if not exists pgcrypto;

create table if not exists public.disc_results (
  id uuid primary key default gen_random_uuid(),

  name text,
  email text,
  company text,

  -- Answers and computed results
  answers jsonb not null default '{}'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  primary_type text not null,
  ranking jsonb not null default '[]'::jsonb,

  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists disc_results_email_idx on public.disc_results (email);
create index if not exists disc_results_completed_at_idx on public.disc_results (completed_at desc);

-- Enable RLS and allow anon inserts (frontend uses anon key)
alter table public.disc_results enable row level security;

drop policy if exists "anon_insert_disc_results" on public.disc_results;
create policy "anon_insert_disc_results"
  on public.disc_results
  for insert
  to anon, authenticated
  with check (true);

