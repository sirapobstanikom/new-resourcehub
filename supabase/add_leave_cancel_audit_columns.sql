-- เพิ่มคอลัมน์สำหรับเก็บเหตุผล/ผู้อนุมัติการยกเลิก (audit)
-- รันใน Supabase -> SQL Editor

alter table public.leave_requests
  add column if not exists cancel_reason text;

alter table public.leave_requests
  add column if not exists cancel_decided_by_email text;

alter table public.leave_requests
  add column if not exists cancel_decided_at timestamptz;

alter table public.leave_requests
  add column if not exists cancel_decision text;

