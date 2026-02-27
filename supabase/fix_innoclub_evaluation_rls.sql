-- แก้ RLS แบบประเมิน INNO Club ให้ส่งได้ (new row violates row-level security policy)
-- รันใน Supabase → SQL Editor

-- เปิด RLS (ถ้ายังไม่เปิด)
alter table public.innoclub_evaluation_responses enable row level security;

-- ลบ policy เก่าถ้ามี แล้วสร้างใหม่
drop policy if exists "Allow insert innoclub_evaluation" on public.innoclub_evaluation_responses;
create policy "Allow insert innoclub_evaluation"
  on public.innoclub_evaluation_responses for insert
  with check (true);

drop policy if exists "Allow read innoclub_evaluation" on public.innoclub_evaluation_responses;
create policy "Allow read innoclub_evaluation"
  on public.innoclub_evaluation_responses for select
  using (true);

-- ถ้ารันแล้วยังส่งไม่ได้: ไปที่ Supabase → Table Editor → innoclub_evaluation_responses → RLS
-- ตรวจสอบว่ามี policy "Allow insert innoclub_evaluation" และเปิดใช้งานอยู่
