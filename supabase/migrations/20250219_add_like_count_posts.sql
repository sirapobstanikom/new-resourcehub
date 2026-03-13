-- เพิ่มคอลัมน์ like_count ให้ strategy_posts (ปุ่มไลค์)
-- รันใน Supabase Dashboard → SQL Editor

alter table public.strategy_posts
  add column if not exists like_count integer not null default 0;
