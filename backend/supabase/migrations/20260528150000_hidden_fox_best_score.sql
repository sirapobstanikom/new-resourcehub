-- Hidden Fox: เก็บสถิติดีที่สุดต่อผู้เล่น (ชื่อ + อีเมล + บริษัท)

-- ลบรายการซ้ำ เก็บแถวที่คะแนนสูงสุด (เท่ากันดูเวลาน้อยกว่า)
with ranked as (
  select
    id,
    row_number() over (
      partition by lower(trim(email)), lower(trim(name)), lower(trim(company))
      order by total_score desc, completion_time_sec asc nulls last, created_at asc
    ) as rn
  from public.hidden_fox_runs
)
delete from public.hidden_fox_runs
where id in (select id from ranked where rn > 1);

create unique index if not exists idx_hidden_fox_runs_identity
  on public.hidden_fox_runs (lower(trim(email)), lower(trim(name)), lower(trim(company)));

alter table public.hidden_fox_runs
  add column if not exists updated_at timestamptz not null default now();

drop policy if exists hidden_fox_runs_update on public.hidden_fox_runs;
create policy hidden_fox_runs_update on public.hidden_fox_runs
  for update to anon, authenticated
  using (true)
  with check (true);
