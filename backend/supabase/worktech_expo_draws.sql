-- Prize catch / WorkTech Expo group numbers 1–3
create table if not exists public.worktech_expo_draws (
  id uuid primary key default gen_random_uuid(),
  group_number integer not null check (group_number between 1 and 3),
  created_at timestamptz not null default now()
);

alter table public.worktech_expo_draws enable row level security;

drop policy if exists "worktech_expo_draws_select" on public.worktech_expo_draws;
create policy "worktech_expo_draws_select"
  on public.worktech_expo_draws for select
  using (true);

drop policy if exists "worktech_expo_draws_insert" on public.worktech_expo_draws;
create policy "worktech_expo_draws_insert"
  on public.worktech_expo_draws for insert
  with check (true);

drop policy if exists "worktech_expo_draws_delete" on public.worktech_expo_draws;
create policy "worktech_expo_draws_delete"
  on public.worktech_expo_draws for delete
  using (true);
