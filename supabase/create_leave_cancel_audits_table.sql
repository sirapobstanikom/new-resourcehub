-- สร้างตาราง audit เพื่อเก็บ "ทุกครั้ง" ที่มีคนขอยกเลิก
-- (ไม่ทับของเดิมใน leave_requests)
--
-- รันใน Supabase -> SQL Editor

create table if not exists public.leave_cancel_audits (
  id uuid primary key default gen_random_uuid(),
  leave_request_id uuid not null references public.leave_requests(id) on delete cascade,

  user_id uuid,
  user_email text not null,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  start_time text,
  end_time text,

  cancel_reason text,

  -- cancel_requested = รออนุมัติ
  -- cancelled = อนุมัติยกเลิกแล้ว
  -- rejected = ไม่อนุมัติยกเลิก
  status text not null check (status in ('cancel_requested', 'cancelled', 'rejected')),

  requested_at timestamptz not null default now(),

  decided_by_email text,
  decided_at timestamptz,
  decision text
);

create index if not exists leave_cancel_audits_leave_request_id_idx on public.leave_cancel_audits (leave_request_id);
create index if not exists leave_cancel_audits_requested_at_idx on public.leave_cancel_audits (requested_at desc);

-- เปิด RLS และกำหนด policy แบบง่ายๆ
alter table public.leave_cancel_audits enable row level security;

-- อ่านได้ (สำหรับหน้า /admin/leave ที่ต้องเห็นทุกคน)
create policy "Allow auth read leave_cancel_audits"
  on public.leave_cancel_audits for select
  using (auth.uid() is not null);

-- ผู้ขอยกเลิก insert ได้เฉพาะกับ leave_requests ของตัวเอง
create policy "Allow user insert own leave_cancel_audits"
  on public.leave_cancel_audits for insert
  with check (
    exists (
      select 1
      from public.leave_requests lr
      where lr.id = leave_cancel_audits.leave_request_id
        and lr.user_id = auth.uid()
    )
  );

-- อนุมัติ/ไม่อนุมัติ: แอดมินอัปเดต audit row ได้ (ดูได้จาก admin_users ว่ามี email นั้นอยู่หรือไม่)
create policy "Allow admin update leave_cancel_audits"
  on public.leave_cancel_audits for update
  using (
    exists (
      select 1
      from public.admin_users au
      where au.email = (auth.jwt() ->> 'email')
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users au
      where au.email = (auth.jwt() ->> 'email')
    )
  );

