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

-- แอดมิน/พนักงาน (ใช้ล็อกอินได้) — มีข้อมูลส่วนตัว + ลาคงเหลือ
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text not null,
  password_hash text not null,
  full_name text,
  phone text,
  department text,
  personal_remaining int not null default 15,
  sick_remaining int not null default 30,
  annual_remaining int not null default 6,
  unpaid_remaining int not null default 0,
  hours_remaining numeric(6,2) not null default 0,
  hours_personal_remaining numeric(6,2) not null default 0,
  hours_sick_remaining numeric(6,2) not null default 0,
  hours_annual_remaining numeric(6,2) not null default 0,
  hours_unpaid_remaining numeric(6,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ถ้าตาราง admin_users มีอยู่แล้ว ให้รันแยกเพิ่มคอลัมน์:
-- alter table public.admin_users add column if not exists full_name text;
-- alter table public.admin_users add column if not exists phone text;
-- alter table public.admin_users add column if not exists department text;
-- alter table public.admin_users add column if not exists personal_remaining int not null default 15;
-- alter table public.admin_users add column if not exists sick_remaining int not null default 30;
-- alter table public.admin_users add column if not exists annual_remaining int not null default 6;
-- alter table public.admin_users add column if not exists unpaid_remaining int not null default 0;
-- alter table public.admin_users add column if not exists hours_remaining numeric(6,2) not null default 0;
-- alter table public.admin_users add column if not exists hours_personal_remaining numeric(6,2) not null default 0;
-- alter table public.admin_users add column if not exists hours_sick_remaining numeric(6,2) not null default 0;
-- alter table public.admin_users add column if not exists hours_annual_remaining numeric(6,2) not null default 0;
-- alter table public.admin_users add column if not exists hours_unpaid_remaining numeric(6,2) not null default 0;

create index if not exists idx_admin_signup_requests_token on public.admin_signup_requests(token);
create index if not exists idx_admin_users_username on public.admin_users(username);
create index if not exists idx_admin_users_email on public.admin_users(email);

alter table public.admin_signup_requests enable row level security;
alter table public.admin_users enable row level security;

-- Edge Function ใช้ service role (bypass RLS) สำหรับ insert/update
drop policy if exists "Allow read admin_signup_requests" on public.admin_signup_requests;
create policy "Allow read admin_signup_requests" on public.admin_signup_requests for select using (true);

-- ผู้ล็อกอินอ่านข้อมูลตัวเองจาก admin_users ได้ (เทียบ email จาก JWT — อย่าใช้ auth.users ใน policy เพราะ permission denied)
drop policy if exists "Allow read own admin_user" on public.admin_users;
create policy "Allow read own admin_user"
  on public.admin_users for select using ((auth.jwt() ->> 'email') = email);

-- ผู้ล็อกอินอัปเดตข้อมูลส่วนตัวตัวเองได้ (full_name, phone, department)
drop policy if exists "Allow update own admin_user" on public.admin_users;
create policy "Allow update own admin_user"
  on public.admin_users for update
  using ((auth.jwt() ->> 'email') = email)
  with check ((auth.jwt() ->> 'email') = email);

-- ระบบลา MindDojo: คำขอลาของแอดมิน (รวม Work from Home = leave_type 'wfh', 1 วัน/เดือน)
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null,
  user_display_name text,
  leave_type text not null check (leave_type in ('personal', 'sick', 'wfh', 'unpaid', 'vacation')),
  start_date date not null,
  end_date date not null,
  start_time time,
  end_time time,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by_email text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ถ้าตารางมีอยู่แล้ว ให้รันแยกเพิ่มคอลัมน์ (หรือใช้ไฟล์ supabase/add_leave_approved_columns.sql):
-- alter table public.leave_requests add column if not exists approved_by_email text;
-- alter table public.leave_requests add column if not exists approved_at timestamptz;
-- alter table public.leave_requests add column if not exists start_time time;
-- alter table public.leave_requests add column if not exists end_time time;

-- ถ้าตารางมีอยู่แล้ว ให้รันแยกเพื่อเพิ่ม 'cancelled' หรือ 'vacation':
-- alter table public.leave_requests drop constraint if exists leave_requests_status_check;
-- alter table public.leave_requests add constraint leave_requests_status_check check (status in ('pending', 'approved', 'rejected', 'cancelled'));
-- alter table public.leave_requests drop constraint if exists leave_requests_leave_type_check;
-- alter table public.leave_requests add constraint leave_requests_leave_type_check check (leave_type in ('personal', 'sick', 'wfh', 'unpaid', 'vacation'));

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

-- เฉพาะผู้จัดการลา (pink, koy, tonji@minddojo.me) อัปเดตสถานะคำขอลา (อนุมัติ/ไม่อนุมัติ)
drop policy if exists "Allow update leave_requests for admin" on public.leave_requests;
create policy "Allow update leave_requests for admin"
  on public.leave_requests for update
  using ((auth.jwt() ->> 'email') in ('pink@minddojo.me', 'koy@minddojo.me', 'tonji@minddojo.me'))
  with check ((auth.jwt() ->> 'email') in ('pink@minddojo.me', 'koy@minddojo.me', 'tonji@minddojo.me'));

-- ผู้ใช้ยกเลิกคำขอลาของตัวเองได้เฉพาะสถานะ pending
drop policy if exists "Allow update own leave_requests cancel" on public.leave_requests;
create policy "Allow update own leave_requests cancel"
  on public.leave_requests for update
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'cancelled');

-- วันหยุดที่ไม่ใช่เสาร์-อาทิตย์: วันที่ตรงกับรายการนี้จะไม่หักวันลา
create table if not exists public.public_holidays (
  id serial primary key,
  month smallint not null check (month between 1 and 12),
  day smallint not null check (day between 1 and 31),
  name text,
  unique(month, day)
);
insert into public.public_holidays (month, day, name) values
  (1,1,'ปีใหม่'), (1,2,'วันหยุดชดเชยปีใหม่'), (3,3,'วันหยุด'),
  (4,6,'วันหยุด'), (4,13,'วันสงกรานต์'), (4,14,'วันสงกรานต์'), (4,15,'วันสงกรานต์'),
  (5,1,'วันแรงงาน'), (5,4,'วันฉัตรมงคล'), (6,1,'วันหยุด'), (6,3,'วันหยุด'),
  (7,28,'วันหยุด'), (7,29,'วันหยุด'), (8,12,'วันแม่'),
  (10,13,'วันหยุด'), (10,23,'วันปิยมหาราช'), (12,7,'วันหยุด'), (12,10,'วันหยุด'), (12,31,'วันสิ้นปี')
on conflict (month, day) do nothing;

alter table public.public_holidays enable row level security;
drop policy if exists "Allow read public_holidays" on public.public_holidays;
create policy "Allow read public_holidays" on public.public_holidays for select using (true);

create or replace function public.count_chargeable_leave_days(p_start date, p_end date)
returns int language plpgsql security definer set search_path = public as $$
declare d date; cnt int := 0; is_weekend boolean; is_holiday boolean;
begin
  if p_end < p_start then return 0; end if;
  d := p_start;
  while d <= p_end loop
    is_weekend := extract(dow from d) in (0, 6);
    select exists(select 1 from public.public_holidays h where h.month = extract(month from d) and h.day = extract(day from d)) into is_holiday;
    if not is_weekend and not is_holiday then cnt := cnt + 1; end if;
    d := d + 1;
  end loop;
  return cnt;
end; $$;

-- เมื่ออนุมัติคำขอลา ให้หักลาคงเหลือใน admin_users อัตโนมัติ (นับเฉพาะวันทำงาน: ไม่รวมเสาร์-อาทิตย์ และวันหยุดใน public_holidays)
create or replace function public.deduct_leave_balance_on_approve()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  duration_hours numeric(10,2);
  total_hours numeric(10,2);
  new_total numeric(10,2);
  new_days int;
  new_hours numeric(6,2);
  chargeable_days int;
begin
  if NEW.status <> 'approved' or (OLD.status is not null and OLD.status = 'approved') then
    return NEW;
  end if;

  if NEW.start_date = NEW.end_date and NEW.start_time is not null and NEW.end_time is not null then
    duration_hours := greatest(0, extract(epoch from (NEW.end_time - NEW.start_time)) / 3600.0);
  else
    chargeable_days := public.count_chargeable_leave_days(NEW.start_date, NEW.end_date);
    duration_hours := chargeable_days * 8.0;
  end if;

  if duration_hours <= 0 then
    return NEW;
  end if;

  if NEW.leave_type = 'personal' then
    select (personal_remaining * 8.0) + coalesce(hours_personal_remaining, 0) into total_hours from public.admin_users where email = NEW.user_email;
    if total_hours is not null then
      new_total := greatest(0, total_hours - duration_hours);
      new_days := floor(new_total / 8.0)::int;
      new_hours := new_total - (new_days * 8.0);
      update public.admin_users set personal_remaining = new_days, hours_personal_remaining = round(new_hours::numeric, 2) where email = NEW.user_email;
    end if;
  elsif NEW.leave_type = 'sick' then
    select (sick_remaining * 8.0) + coalesce(hours_sick_remaining, 0) into total_hours from public.admin_users where email = NEW.user_email;
    if total_hours is not null then
      new_total := greatest(0, total_hours - duration_hours);
      new_days := floor(new_total / 8.0)::int;
      new_hours := new_total - (new_days * 8.0);
      update public.admin_users set sick_remaining = new_days, hours_sick_remaining = round(new_hours::numeric, 2) where email = NEW.user_email;
    end if;
  elsif NEW.leave_type = 'vacation' then
    select (annual_remaining * 8.0) + coalesce(hours_annual_remaining, 0) into total_hours from public.admin_users where email = NEW.user_email;
    if total_hours is not null then
      new_total := greatest(0, total_hours - duration_hours);
      new_days := floor(new_total / 8.0)::int;
      new_hours := new_total - (new_days * 8.0);
      update public.admin_users set annual_remaining = new_days, hours_annual_remaining = round(new_hours::numeric, 2) where email = NEW.user_email;
    end if;
  elsif NEW.leave_type = 'unpaid' then
    select (unpaid_remaining * 8.0) + coalesce(hours_unpaid_remaining, 0) into total_hours from public.admin_users where email = NEW.user_email;
    if total_hours is not null then
      new_total := greatest(0, total_hours - duration_hours);
      new_days := floor(new_total / 8.0)::int;
      new_hours := new_total - (new_days * 8.0);
      update public.admin_users set unpaid_remaining = new_days, hours_unpaid_remaining = round(new_hours::numeric, 2) where email = NEW.user_email;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trigger_deduct_leave_on_approve on public.leave_requests;
create trigger trigger_deduct_leave_on_approve
  after update on public.leave_requests
  for each row execute function public.deduct_leave_balance_on_approve();

-- ลาคงเหลืออยู่ที่ admin_users แล้ว (personal_remaining, sick_remaining, annual_remaining, unpaid_remaining)
-- ตารางด้านล่างเก็บไว้ถ้าต้องการใช้แบบแยกตามปี (optional)
create table if not exists public.user_leave_balance (
  user_id uuid not null references auth.users(id) on delete cascade,
  year smallint not null,
  personal_remaining int not null default 15,
  sick_remaining int not null default 30,
  unpaid_remaining int not null default 0,
  primary key (user_id, year)
);

alter table public.user_leave_balance enable row level security;

drop policy if exists "Allow read own leave_balance" on public.user_leave_balance;
create policy "Allow read own leave_balance"
  on public.user_leave_balance for select using (auth.uid() = user_id);

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

-- แบบประเมินความพึงพอใจ PTT GROUP INNO Club (ไม่ต้องล็อกอิน)
create table if not exists public.innoclub_evaluation_responses (
  id uuid primary key default gen_random_uuid(),
  facilitator_score smallint check (facilitator_score between 1 and 5),
  facilitator_comment text,
  content_score smallint check (content_score between 1 and 5),
  content_comment text,
  overall_score smallint check (overall_score between 1 and 5),
  atmosphere_score smallint check (atmosphere_score between 1 and 5),
  sharing_score smallint check (sharing_score between 1 and 5),
  decision_score smallint check (decision_score between 1 and 5),
  overall_comment text,
  learn_apply text,
  ai_plan_6months text,
  activity_learning_satisfaction text,
  networking_collaboration text,
  improvement_suggestions text,
  created_at timestamptz not null default now()
);

create index if not exists idx_innoclub_evaluation_created
  on public.innoclub_evaluation_responses(created_at desc);

alter table public.innoclub_evaluation_responses enable row level security;

drop policy if exists "Allow insert innoclub_evaluation" on public.innoclub_evaluation_responses;
create policy "Allow insert innoclub_evaluation"
  on public.innoclub_evaluation_responses for insert with check (true);

-- ให้ทุกคน (รวม anon) อ่านได้ — หน้าแบบประเมินส่งได้ หน้า Admin ดูข้อมูลได้
drop policy if exists "Allow read innoclub_evaluation" on public.innoclub_evaluation_responses;
create policy "Allow read innoclub_evaluation"
  on public.innoclub_evaluation_responses for select using (true);

-- ถ้าหน้า ดูข้อมูล Database ยังไม่เห็น ให้รันใน Supabase → SQL Editor:
-- drop policy if exists "Allow read innoclub_evaluation" on public.innoclub_evaluation_responses;
-- create policy "Allow read innoclub_evaluation" on public.innoclub_evaluation_responses for select using (true);

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
