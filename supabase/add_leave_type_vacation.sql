-- รันใน Supabase Dashboard → SQL Editor
-- เพิ่มประเภทลา: ลาพักร้อน (vacation)

alter table public.leave_requests drop constraint if exists leave_requests_leave_type_check;
alter table public.leave_requests add constraint leave_requests_leave_type_check
  check (leave_type in ('personal', 'sick', 'wfh', 'unpaid', 'vacation'));
