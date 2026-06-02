-- Hall of Fame: จัดอันดับจากคะแนน (เท่ากันดูเวลา)

alter table public.hidden_fox_runs
  add column if not exists total_score integer not null default 0 check (total_score >= 0);

create index if not exists idx_hidden_fox_runs_score_time
  on public.hidden_fox_runs (total_score desc, completion_time_sec asc nulls last);
