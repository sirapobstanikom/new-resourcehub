-- บัญชีผู้ใช้ MindDoJo AI Assessment (แยกจาก admin_users / ResourceHub)
-- รันใน Supabase → SQL Editor แล้ว deploy Edge Function minddojo-assessment-auth

create table if not exists public.minddojo_assessment_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  constraint minddojo_assessment_accounts_username_unique unique (username)
);

create index if not exists idx_minddojo_assessment_accounts_status
  on public.minddojo_assessment_accounts (status);

create index if not exists idx_minddojo_assessment_accounts_created
  on public.minddojo_assessment_accounts (created_at desc);

comment on table public.minddojo_assessment_accounts is 'ล็อกอิน /assessment/minddojo — อนุมัติผ่านแอดมินใน /admin';

-- ไม่เปิด RLS ให้ client ตรง — ใช้เฉพาะ Service Role ผ่าน Edge Functions
alter table public.minddojo_assessment_accounts enable row level security;

-- ไม่มี policy สำหรับ anon/authenticated = client อ่าน/เขียนตรงไม่ได้
-- Edge Functions ใช้ service_role จะข้าม RLS
--
-- หลังสมัครสำเร็จ สถานะเป็น pending — ต้องอนุมัติที่ /admin/minddojo-users
-- ทดสอบใน dev เท่านั้น (อย่ารันใน production):
--   update public.minddojo_assessment_accounts
--   set status = 'approved', approved_at = now(), rejected_at = null
--   where status = 'pending';
