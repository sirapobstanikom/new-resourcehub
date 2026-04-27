-- Create table for Hogwarts InnoClub answers
-- Run this in Supabase SQL Editor (project: new-resourcehub)

create extension if not exists "pgcrypto";

create table if not exists public.hogwarts_innoclub_answers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  base_name text not null check (base_name in ('base1', 'base2', 'base3', 'base4')),
  group_name text not null,
  respondent_name text null,
  answers_json jsonb not null default '{}'::jsonb,
  summary_text text null,
  attachment_name text null
);

create index if not exists idx_hogwarts_innoclub_answers_created_at
  on public.hogwarts_innoclub_answers (created_at desc);

create index if not exists idx_hogwarts_innoclub_answers_base_group
  on public.hogwarts_innoclub_answers (base_name, group_name);

alter table public.hogwarts_innoclub_answers enable row level security;

-- Allow anyone with anon/auth token to submit answers
drop policy if exists "hogwarts answers insert" on public.hogwarts_innoclub_answers;
create policy "hogwarts answers insert"
on public.hogwarts_innoclub_answers
for insert
to anon, authenticated
with check (true);

-- Allow reading answers (used by dashboard)
drop policy if exists "hogwarts answers select" on public.hogwarts_innoclub_answers;
create policy "hogwarts answers select"
on public.hogwarts_innoclub_answers
for select
to anon, authenticated
using (true);
