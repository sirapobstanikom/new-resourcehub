-- รันใน Supabase Dashboard → SQL Editor
-- ยืนยันว่าตาราง leave_requests รองรับประเภทลา Work from Home (wfh) และประเภทอื่นครบ

-- leave_type: personal, sick, wfh (Work from Home), vacation, unpaid
alter table public.leave_requests drop constraint if exists leave_requests_leave_type_check;
alter table public.leave_requests add constraint leave_requests_leave_type_check
  check (leave_type in ('personal', 'sick', 'wfh', 'unpaid', 'vacation'));

-- ข้อมูล Work from Home เก็บใน leave_requests เหมือนประเภทอื่น โดย leave_type = 'wfh'
-- กฎ: 1 วันต่อเดือน ใช้แล้วลาอีกได้เดือนถัดไป (ตรวจที่แอป)
