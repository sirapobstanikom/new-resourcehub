-- รันใน Supabase Dashboard → SQL Editor
-- RLS ให้ผู้ล็อกอินอ่าน/อัปเดตแถวตัวเองใน admin_users ตาม email จาก JWT (ห้ามใช้ auth.users ใน policy เพราะ role ไม่มีสิทธิ์อ่าน)

drop policy if exists "Allow read own admin_user" on public.admin_users;
create policy "Allow read own admin_user"
  on public.admin_users for select
  using ((auth.jwt() ->> 'email') = email);

drop policy if exists "Allow update own admin_user" on public.admin_users;
create policy "Allow update own admin_user"
  on public.admin_users for update
  using ((auth.jwt() ->> 'email') = email)
  with check ((auth.jwt() ->> 'email') = email);

-- ถ้ายังไม่มีแถวใน admin_users สำหรับอีเมลที่ล็อกอิน (เช่น phet@minddojo.me) ให้เพิ่มแถวใน Table Editor
-- หรือรัน insert ด้านล่าง (เปลี่ยน username, email ให้ตรงกับบัญชีที่ใช้ล็อกอิน และต้องมี password_hash ตามระบบที่ใช้):
-- insert into public.admin_users (username, email, password_hash, full_name, phone, department, personal_remaining, sick_remaining, unpaid_remaining)
-- values ('phet', 'phet@minddojo.me', '', 'ชื่อ-นามสกุล', 'เบอร์โทร', 'แผนก', 15, 30, 0);
