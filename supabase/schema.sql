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

-- ระบบลา MindDojo: คำขอลาของแอดมิน
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  user_display_name text,
  leave_type text not null check (leave_type in ('personal', 'sick', 'wfh', 'unpaid')),
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_leave_requests_user_created on public.leave_requests(user_id, created_at desc);
create index if not exists idx_leave_requests_dates on public.leave_requests(start_date, end_date);

alter table public.leave_requests enable row level security;

-- ผู้ล็อกอินแล้ว insert ได้เฉพาะของตัวเอง
drop policy if exists "Allow insert own leave_requests" on public.leave_requests;
create policy "Allow insert own leave_requests"
  on public.leave_requests for insert with check (auth.uid() = user_id);

-- ผู้ล็อกอินแล้วอ่านได้ทุกแถว (เพื่อดูใครลาบ้าง)
drop policy if exists "Allow read leave_requests" on public.leave_requests;
create policy "Allow read leave_requests"
  on public.leave_requests for select using (auth.role() = 'authenticated');

-- เก็บ OAuth tokens ของ Google Calendar ต่อ user (ตารางงานของฉัน)
create table if not exists public.user_calendar_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text,
  access_token text,
  token_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ถ้ามีตารางเดิมใช้ calendar_embed_url ให้รันแยก:
-- alter table public.user_calendar_settings drop column if exists calendar_embed_url;
-- alter table public.user_calendar_settings add column if not exists refresh_token text;
-- alter table public.user_calendar_settings add column if not exists access_token text;
-- alter table public.user_calendar_settings add column if not exists token_expires_at timestamptz;

alter table public.user_calendar_settings enable row level security;

drop policy if exists "Allow read own calendar_settings" on public.user_calendar_settings;
create policy "Allow read own calendar_settings"
  on public.user_calendar_settings for select using (auth.uid() = user_id);

drop policy if exists "Allow insert own calendar_settings" on public.user_calendar_settings;
create policy "Allow insert own calendar_settings"
  on public.user_calendar_settings for insert with check (auth.uid() = user_id);

drop policy if exists "Allow update own calendar_settings" on public.user_calendar_settings;
create policy "Allow update own calendar_settings"
  on public.user_calendar_settings for update using (auth.uid() = user_id);

-- เมื่อมี user ใหม่ใน auth.users ให้เพิ่มใน admin_users โดยอัตโนมัติ
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.admin_users (username, email, password_hash)
  values (new.email, new.email, '')
  on conflict (username) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
