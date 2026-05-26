-- เก็บคะแนนตอบแต่ละข้อ (1–25) ใน Key Principles Assessment

alter table public.key_principles_results
  add column if not exists answers jsonb not null default '{}'::jsonb;

comment on column public.key_principles_results.answers is
  'คะแนน 1–5 ต่อข้อ เช่น {"1":5,"2":4,...,"25":3}';
