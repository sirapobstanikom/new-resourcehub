-- รันใน Supabase Dashboard → SQL Editor
-- เพิ่มคอลัมน์ผู้อนุมัติและเวลาใน leave_requests

alter table public.leave_requests add column if not exists approved_by_email text;
alter table public.leave_requests add column if not exists approved_at timestamptz;
alter table public.leave_requests add column if not exists start_time time;
alter table public.leave_requests add column if not exists end_time time;
