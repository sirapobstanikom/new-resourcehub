-- Stickycloud: ห้อง workspace แบบ Miro — ห้องคงอยู่, Admin ลบได้, มีหลาย Board ต่อห้อง (คนละ template)
-- รันใน Supabase Dashboard → SQL Editor
-- (ถ้าต้องการ realtime: เปิด Replication สำหรับ stickycloud_stickies ใน Database → Replication)

-- ห้อง (Admin สร้าง → ได้ room_code, ห้องค้างอยู่จนกว่า Admin จะลบ)
create table if not exists public.stickycloud_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  name text not null default 'ห้องใหม่',
  created_at timestamptz not null default now(),
  created_by text
);

-- Board ภายในห้อง (แต่ละ board เลือก template ได้ต่างกัน)
create table if not exists public.stickycloud_boards (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.stickycloud_rooms(id) on delete cascade,
  name text not null default 'Main Board',
  background_type text not null default 'bmc' check (background_type in ('bmc', 'lean_canvas', 'blank', 'wild_ideas')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- โพสต์อิทอยู่บน board (ไม่ใช่ room โดยตรง)
create table if not exists public.stickycloud_stickies (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.stickycloud_boards(id) on delete cascade,
  content text not null default '',
  x numeric(12,4) not null default 0,
  y numeric(12,4) not null default 0,
  color text not null default 'yellow',
  width numeric(10,2) not null default 200,
  height numeric(10,2) not null default 120,
  author_name text default 'ผู้ใช้',
  created_at timestamptz not null default now()
);

create index if not exists idx_stickycloud_rooms_code on public.stickycloud_rooms(room_code);
create index if not exists idx_stickycloud_boards_room on public.stickycloud_boards(room_id);
create index if not exists idx_stickycloud_stickies_board on public.stickycloud_stickies(board_id);

alter table public.stickycloud_rooms enable row level security;
alter table public.stickycloud_boards enable row level security;
alter table public.stickycloud_stickies enable row level security;

-- ห้อง: อ่านได้ทุกคน, สร้าง/ลบได้เฉพาะ authenticated (Admin)
drop policy if exists "Allow read stickycloud_rooms" on public.stickycloud_rooms;
create policy "Allow read stickycloud_rooms" on public.stickycloud_rooms for select using (true);

drop policy if exists "Allow insert stickycloud_rooms" on public.stickycloud_rooms;
create policy "Allow insert stickycloud_rooms" on public.stickycloud_rooms for insert with check (auth.role() = 'authenticated');

drop policy if exists "Allow delete stickycloud_rooms" on public.stickycloud_rooms;
create policy "Allow delete stickycloud_rooms" on public.stickycloud_rooms for delete using (auth.role() = 'authenticated');

-- Board: อ่านได้ทุกคน, สร้างได้ทุกคน (ผู้เข้า room สร้าง board ใหม่ได้)
drop policy if exists "Allow read stickycloud_boards" on public.stickycloud_boards;
create policy "Allow read stickycloud_boards" on public.stickycloud_boards for select using (true);

drop policy if exists "Allow insert stickycloud_boards" on public.stickycloud_boards;
create policy "Allow insert stickycloud_boards" on public.stickycloud_boards for insert with check (true);

drop policy if exists "Allow delete stickycloud_boards" on public.stickycloud_boards;
create policy "Allow delete stickycloud_boards" on public.stickycloud_boards for delete using (true);

-- โพสต์อิท: อ่าน/เขียนได้ทุกคน
drop policy if exists "Allow read stickycloud_stickies" on public.stickycloud_stickies;
create policy "Allow read stickycloud_stickies" on public.stickycloud_stickies for select using (true);

drop policy if exists "Allow insert stickycloud_stickies" on public.stickycloud_stickies;
create policy "Allow insert stickycloud_stickies" on public.stickycloud_stickies for insert with check (true);

drop policy if exists "Allow update stickycloud_stickies" on public.stickycloud_stickies;
create policy "Allow update stickycloud_stickies" on public.stickycloud_stickies for update using (true);

drop policy if exists "Allow delete stickycloud_stickies" on public.stickycloud_stickies;
create policy "Allow delete stickycloud_stickies" on public.stickycloud_stickies for delete using (true);
