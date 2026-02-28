-- รันเฉพาะเมื่อมีตาราง stickycloud_rooms แบบเก่า (มี background_type) และ stickycloud_stickies แบบ room_id อยู่แล้ว
-- สร้าง boards, ย้าย stickies ไป board_id, แล้วลบคอลัมน์ room_id / background_type ตามต้องการ

-- 1. สร้างตาราง boards ถ้ายังไม่มี
create table if not exists public.stickycloud_boards (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.stickycloud_rooms(id) on delete cascade,
  name text not null default 'Main Board',
  background_type text not null default 'bmc' check (background_type in ('bmc', 'lean_canvas', 'blank', 'wild_ideas')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_stickycloud_boards_room on public.stickycloud_boards(room_id);
alter table public.stickycloud_boards enable row level security;

drop policy if exists "Allow read stickycloud_boards" on public.stickycloud_boards;
create policy "Allow read stickycloud_boards" on public.stickycloud_boards for select using (true);
drop policy if exists "Allow insert stickycloud_boards" on public.stickycloud_boards;
create policy "Allow insert stickycloud_boards" on public.stickycloud_boards for insert with check (true);
drop policy if exists "Allow delete stickycloud_boards" on public.stickycloud_boards;
create policy "Allow delete stickycloud_boards" on public.stickycloud_boards for delete using (true);

-- 2. เพิ่ม board_id ใน stickies (nullable ก่อน)
alter table public.stickycloud_stickies add column if not exists board_id uuid references public.stickycloud_boards(id) on delete cascade;

-- 3. สร้าง Main Board ให้ทุก room และอัปเดต stickies ให้ชี้ไปที่ board นั้น
do $$
declare
  r record;
  bid uuid;
begin
  for r in select id, coalesce(background_type, 'bmc') as bt from public.stickycloud_rooms
  loop
    insert into public.stickycloud_boards (room_id, name, background_type, sort_order)
    values (r.id, 'Main Board', r.bt, 0)
    returning id into bid;
    update public.stickycloud_stickies set board_id = bid where room_id = r.id;
  end loop;
end $$;

-- 4. ลบ room_id จาก stickies (ถ้าตารางมี column room_id)
alter table public.stickycloud_stickies drop column if exists room_id;

-- 5. บังคับ board_id ไม่เป็น null
alter table public.stickycloud_stickies alter column board_id set not null;

-- 6. ลบ background_type จาก rooms (optional — ถ้าต้องการเก็บไว้ไม่ต้องรันบรรทัดนี้)
-- alter table public.stickycloud_rooms drop column if exists background_type;

-- 7. อนุญาตให้ Admin ลบห้อง
drop policy if exists "Allow delete stickycloud_rooms" on public.stickycloud_rooms;
create policy "Allow delete stickycloud_rooms" on public.stickycloud_rooms for delete using (auth.role() = 'authenticated');
