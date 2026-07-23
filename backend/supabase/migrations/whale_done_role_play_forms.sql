-- Whale Done Role Play: Conflict Canvas responses (Case 01–04)
-- Run in Supabase → SQL Editor

create table if not exists public.whale_done_conflict_canvas_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  page_version text,
  case_key text not null,
  case_no text,
  case_title text,
  participant_name text,
  at_stake text,
  emotion_a text,
  emotion_b text,
  worked_well text,
  differently text,
  agreement text,
  real_person text,
  real_conflict text,
  first_step text
);

alter table public.whale_done_conflict_canvas_responses enable row level security;

drop policy if exists "Allow insert whale_done_conflict_canvas_responses" on public.whale_done_conflict_canvas_responses;
create policy "Allow insert whale_done_conflict_canvas_responses"
  on public.whale_done_conflict_canvas_responses
  for insert
  with check (true);

drop policy if exists "Allow read whale_done_conflict_canvas_responses" on public.whale_done_conflict_canvas_responses;
create policy "Allow read whale_done_conflict_canvas_responses"
  on public.whale_done_conflict_canvas_responses
  for select
  using (true);

drop policy if exists "Allow delete whale_done_conflict_canvas_responses" on public.whale_done_conflict_canvas_responses;
create policy "Allow delete whale_done_conflict_canvas_responses"
  on public.whale_done_conflict_canvas_responses
  for delete
  using (true);

-- Accountability Participant Commitment Card
create table if not exists public.whale_done_accountability_commitments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  page_version text,
  participant_name text,
  commitment_date text,
  who_text text,
  behavior text,
  impact text,
  when_text text,
  start_doing text,
  stop_doing text,
  continue_doing text
);

alter table public.whale_done_accountability_commitments enable row level security;

drop policy if exists "Allow insert whale_done_accountability_commitments" on public.whale_done_accountability_commitments;
create policy "Allow insert whale_done_accountability_commitments"
  on public.whale_done_accountability_commitments
  for insert
  with check (true);

drop policy if exists "Allow read whale_done_accountability_commitments" on public.whale_done_accountability_commitments;
create policy "Allow read whale_done_accountability_commitments"
  on public.whale_done_accountability_commitments
  for select
  using (true);

drop policy if exists "Allow delete whale_done_accountability_commitments" on public.whale_done_accountability_commitments;
create policy "Allow delete whale_done_accountability_commitments"
  on public.whale_done_accountability_commitments
  for delete
  using (true);
