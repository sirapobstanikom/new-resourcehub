create extension if not exists "pgcrypto";

create table if not exists public.innoclub_second_reflections (
  id uuid primary key default gen_random_uuid(),
  key_message_learning text not null,
  team_challenge text not null,
  real_work_application text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.innoclub_second_vote_options (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  image_url text,
  is_active boolean not null default true,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.innoclub_second_vote_options
  add column if not exists image_url text;

create table if not exists public.innoclub_second_votes (
  id uuid primary key default gen_random_uuid(),
  best_storytelling_option_id uuid not null references public.innoclub_second_vote_options(id),
  most_creative_product_launch_option_id uuid not null references public.innoclub_second_vote_options(id),
  most_market_impact_option_id uuid not null references public.innoclub_second_vote_options(id),
  created_at timestamptz not null default now()
);

alter table public.innoclub_second_reflections enable row level security;
alter table public.innoclub_second_vote_options enable row level security;
alter table public.innoclub_second_votes enable row level security;

drop policy if exists "Allow insert innoclub second reflections" on public.innoclub_second_reflections;
create policy "Allow insert innoclub second reflections"
  on public.innoclub_second_reflections for insert
  with check (true);

drop policy if exists "Allow read innoclub second reflections for authenticated" on public.innoclub_second_reflections;
create policy "Allow read innoclub second reflections for authenticated"
  on public.innoclub_second_reflections for select
  to authenticated
  using (true);

drop policy if exists "Allow read active innoclub second vote options" on public.innoclub_second_vote_options;
create policy "Allow read active innoclub second vote options"
  on public.innoclub_second_vote_options for select
  using (is_active = true or auth.role() = 'authenticated');

drop policy if exists "Allow manage innoclub second vote options for authenticated" on public.innoclub_second_vote_options;
create policy "Allow manage innoclub second vote options for authenticated"
  on public.innoclub_second_vote_options for all
  to authenticated
  using (true)
  with check (true);

grant update (image_url, updated_at) on public.innoclub_second_vote_options to anon;
grant update (image_url, updated_at) on public.innoclub_second_vote_options to authenticated;

drop policy if exists "Allow public update innoclub second vote option images" on public.innoclub_second_vote_options;
create policy "Allow public update innoclub second vote option images"
  on public.innoclub_second_vote_options for update
  using (is_active = true)
  with check (is_active = true);

drop policy if exists "Allow insert innoclub second votes" on public.innoclub_second_votes;
create policy "Allow insert innoclub second votes"
  on public.innoclub_second_votes for insert
  with check (true);

drop policy if exists "Allow read innoclub second votes for authenticated" on public.innoclub_second_votes;
create policy "Allow read innoclub second votes for authenticated"
  on public.innoclub_second_votes for select
  to authenticated
  using (true);

grant select on public.innoclub_second_votes to anon;
grant select on public.innoclub_second_votes to authenticated;

drop policy if exists "Allow public read innoclub second votes" on public.innoclub_second_votes;
create policy "Allow public read innoclub second votes"
  on public.innoclub_second_votes for select
  using (true);
