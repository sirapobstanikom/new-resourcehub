-- Strategy Exchange: โพสต์และคอมเมนต์แยกตาม tool_id
-- รันใน Supabase Dashboard → SQL Editor

-- ตารางโพสต์ (หนึ่ง tool มีหลายโพสต์)
create table if not exists public.strategy_posts (
  id uuid primary key default gen_random_uuid(),
  tool_id text not null,
  author_name text not null,
  author_avatar text not null default '',
  content text not null,
  created_at timestamptz not null default now()
);

-- ตารางคอมเมนต์ (หนึ่งโพสต์มีหลายคอมเมนต์)
create table if not exists public.strategy_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.strategy_posts(id) on delete cascade,
  author_name text not null,
  author_avatar text not null default '',
  comment_text text not null,
  created_at timestamptz not null default now()
);

-- index สำหรับดึงโพสต์ตาม tool และเรียงตามเวลา
create index if not exists idx_strategy_posts_tool_created
  on public.strategy_posts(tool_id, created_at desc);

create index if not exists idx_strategy_comments_post
  on public.strategy_comments(post_id, created_at);

-- เปิด RLS แล้วอนุญาตให้อ่าน/เขียนด้วย anon (หรือปรับเป็น auth.role() ตามต้องการ)
alter table public.strategy_posts enable row level security;
alter table public.strategy_comments enable row level security;

drop policy if exists "Allow read strategy_posts" on public.strategy_posts;
create policy "Allow read strategy_posts"
  on public.strategy_posts for select using (true);

drop policy if exists "Allow insert strategy_posts" on public.strategy_posts;
create policy "Allow insert strategy_posts"
  on public.strategy_posts for insert with check (true);

drop policy if exists "Allow read strategy_comments" on public.strategy_comments;
create policy "Allow read strategy_comments"
  on public.strategy_comments for select using (true);

drop policy if exists "Allow insert strategy_comments" on public.strategy_comments;
create policy "Allow insert strategy_comments"
  on public.strategy_comments for insert with check (true);

-- แบบประเมินสมรรถนะภาวะผู้นำ: เก็บชื่อ อีเมล บริษัท เวลา และคะแนน 3 หมวด
create table if not exists public.leadership_entries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text not null,
  score_aware integer,
  score_adapt integer,
  score_act integer,
  created_at timestamptz not null default now()
);

-- ถ้าตารางมีอยู่แล้วแต่ยังไม่มีคอลัมน์คะแนน ให้รันใน SQL Editor:
-- alter table public.leadership_entries add column score_aware integer;

create index if not exists idx_leadership_entries_created
  on public.leadership_entries(created_at desc);

alter table public.leadership_entries enable row level security;

drop policy if exists "Allow insert leadership_entries" on public.leadership_entries;
create policy "Allow insert leadership_entries"
  on public.leadership_entries for insert with check (true);

drop policy if exists "Allow read leadership_entries" on public.leadership_entries;
create policy "Allow read leadership_entries"
  on public.leadership_entries for select using (true);

-- คำขอสมัครแอดมิน (ให้ phet กดลิงก์ในเมลเพื่ออนุมัติ)
create table if not exists public.admin_signup_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  username text not null,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now()
);

-- แอดมินที่อนุมัติแล้ว (ใช้ล็อกอินได้)
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_signup_requests_token on public.admin_signup_requests(token);
create index if not exists idx_admin_users_username on public.admin_users(username);

alter table public.admin_signup_requests enable row level security;
alter table public.admin_users enable row level security;

-- Edge Function ใช้ service role (bypass RLS) สำหรับ insert/update
-- admin_signup_requests: ให้อ่านได้ (หน้า approve ใช้ token จาก URL ไม่ต้องอ่านตาราง)
-- admin_users: ไม่สร้าง policy สำหรับ anon (เฉพาะ service role ใช้ใน Edge Function)
drop policy if exists "Allow read admin_signup_requests" on public.admin_signup_requests;
create policy "Allow read admin_signup_requests" on public.admin_signup_requests for select using (true);
