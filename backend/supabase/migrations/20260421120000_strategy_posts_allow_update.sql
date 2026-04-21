-- อนุญาตให้ client (anon / authenticated) อัปเดตโพสต์ Strategy Exchange
-- ถ้าไม่มี policy นี้ UPDATE จะไม่กระทบแถว → PostgREST + .single() ได้ 406
-- รันใน Supabase SQL Editor หรือ supabase db push หลังลิงก์โปรเจกต์

drop policy if exists "strategy_posts_allow_update" on public.strategy_posts;

create policy "strategy_posts_allow_update"
  on public.strategy_posts
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "strategy_posts_allow_delete" on public.strategy_posts;

create policy "strategy_posts_allow_delete"
  on public.strategy_posts
  for delete
  to anon, authenticated
  using (true);

drop policy if exists "strategy_comments_allow_update" on public.strategy_comments;

create policy "strategy_comments_allow_update"
  on public.strategy_comments
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "strategy_comments_allow_delete" on public.strategy_comments;

create policy "strategy_comments_allow_delete"
  on public.strategy_comments
  for delete
  to anon, authenticated
  using (true);
