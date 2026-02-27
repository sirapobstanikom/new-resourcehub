-- รันใน Supabase Dashboard → SQL Editor
-- 1) ให้คอลัมน์ status รองรับค่า 'cancelled'
-- 2) ให้ผู้ใช้ยกเลิกคำขอลาของตัวเองได้ (เปลี่ยน status เป็น cancelled)

-- ขั้นที่ 1: แก้ check constraint ให้มี 'cancelled' (ถ้าไม่มีจะ error ตอนอัปเดต)
alter table public.leave_requests drop constraint if exists leave_requests_status_check;
alter table public.leave_requests add constraint leave_requests_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled'));

-- ขั้นที่ 2: RLS policy ให้ผู้ใช้ยกเลิกคำขอของตัวเองได้
drop policy if exists "Allow update own leave_requests cancel" on public.leave_requests;
create policy "Allow update own leave_requests cancel"
  on public.leave_requests for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'cancelled');
