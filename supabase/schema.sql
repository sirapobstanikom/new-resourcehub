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

create policy "Allow read strategy_posts"
  on public.strategy_posts for select using (true);

create policy "Allow insert strategy_posts"
  on public.strategy_posts for insert with check (true);

create policy "Allow read strategy_comments"
  on public.strategy_comments for select using (true);

create policy "Allow insert strategy_comments"
  on public.strategy_comments for insert with check (true);
