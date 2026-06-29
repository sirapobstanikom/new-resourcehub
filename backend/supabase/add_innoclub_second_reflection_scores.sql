alter table public.innoclub_second_reflections
  add column if not exists facilitator_score integer,
  add column if not exists facilitator_comment text,
  add column if not exists content_score integer,
  add column if not exists content_comment text,
  add column if not exists overall_score integer,
  add column if not exists atmosphere_score integer,
  add column if not exists sharing_score integer,
  add column if not exists overall_comment text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'innoclub_second_reflections_facilitator_score_range'
  ) then
    alter table public.innoclub_second_reflections
      add constraint innoclub_second_reflections_facilitator_score_range
      check (facilitator_score is null or facilitator_score between 1 and 5) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'innoclub_second_reflections_content_score_range'
  ) then
    alter table public.innoclub_second_reflections
      add constraint innoclub_second_reflections_content_score_range
      check (content_score is null or content_score between 1 and 5) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'innoclub_second_reflections_overall_score_range'
  ) then
    alter table public.innoclub_second_reflections
      add constraint innoclub_second_reflections_overall_score_range
      check (overall_score is null or overall_score between 1 and 5) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'innoclub_second_reflections_atmosphere_score_range'
  ) then
    alter table public.innoclub_second_reflections
      add constraint innoclub_second_reflections_atmosphere_score_range
      check (atmosphere_score is null or atmosphere_score between 1 and 5) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'innoclub_second_reflections_sharing_score_range'
  ) then
    alter table public.innoclub_second_reflections
      add constraint innoclub_second_reflections_sharing_score_range
      check (sharing_score is null or sharing_score between 1 and 5) not valid;
  end if;
end $$;
