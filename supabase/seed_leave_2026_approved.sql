-- เพิ่มการลาปี 2026 ที่ผ่านมา (อนุมัติโดย pink@minddojo.me) และหักวันลาของแต่ละคน
-- รันใน Supabase → SQL Editor
-- เงื่อนไข:
-- 1. แต่ละอีเมลต้องมี user ใน auth.users (ถ้าไม่มี ให้สมัคร/เพิ่ม user ก่อน)
-- 2. แต่ละอีเมลควรมีแถวใน admin_users เพื่อหักวันลา (ถ้าไม่มี จะไม่หักยอด)
-- 3. ถ้าใช้ชั่วโมงเหลือ (หน่วยชั่วโมง) ให้รัน supabase/add_hours_remaining.sql ก่อน

-- ใช้ marker เพื่อหักเฉพาะแถวที่แทรกในสคริปต์นี้
do $$
declare
  batch_approved_at timestamptz := '2026-01-01 12:00:00+00';
  r record;
  dur_hours numeric(10,2);
  total_hours numeric(10,2);
  new_total numeric(10,2);
  new_days int;
  new_hours numeric(6,2);
begin
  -- แทรกการลา (user_id จาก auth.users)
  -- koy@minddojo.me
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'koy@minddojo.me', 'vacation', '2026-01-16', '2026-01-16', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'koy@minddojo.me' limit 1;
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'koy@minddojo.me', 'vacation', '2026-01-30', '2026-01-30', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'koy@minddojo.me' limit 1;
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'koy@minddojo.me', 'sick', '2026-02-10', '2026-02-10', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'koy@minddojo.me' limit 1;
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'koy@minddojo.me', 'sick', '2026-02-19', '2026-02-19', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'koy@minddojo.me' limit 1;
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'koy@minddojo.me', 'personal', '2026-02-27', '2026-02-27', 'ไปที่ดิน', 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'koy@minddojo.me' limit 1;
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'koy@minddojo.me', 'wfh', '2026-03-20', '2026-03-20', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'koy@minddojo.me' limit 1;
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'koy@minddojo.me', 'personal', '2026-03-27', '2026-03-27', 'ทำพิธีปักเสาเข็ม', 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'koy@minddojo.me' limit 1;

  -- tonji@minddojo.me
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'tonji@minddojo.me', 'vacation', '2026-01-16', '2026-01-16', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'tonji@minddojo.me' limit 1;
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'tonji@minddojo.me', 'vacation', '2026-03-27', '2026-03-27', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'tonji@minddojo.me' limit 1;

  -- nahm@minddojo.me
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'nahm@minddojo.me', 'vacation', '2026-01-22', '2026-01-22', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'nahm@minddojo.me' limit 1;
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'nahm@minddojo.me', 'wfh', '2026-01-23', '2026-01-23', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'nahm@minddojo.me' limit 1;
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'nahm@minddojo.me', 'unpaid', '2026-02-16', '2026-02-20', 'Japan trip', 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'nahm@minddojo.me' limit 1;

  -- mos@minddojo.me
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'mos@minddojo.me', 'personal', '2026-02-16', '2026-02-16', 'ดูแลเพื่อนที่เข้าโรงพยาบาล', 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'mos@minddojo.me' limit 1;
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'mos@minddojo.me', 'wfh', '2026-02-17', '2026-02-17', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'mos@minddojo.me' limit 1;

  -- pipo@minddojo.me
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'pipo@minddojo.me', 'vacation', '2026-01-05', '2026-01-06', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'pipo@minddojo.me' limit 1;
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, start_time, end_time, reason, status, approved_by_email, approved_at)
  select u.id, 'pipo@minddojo.me', 'vacation', '2026-01-06', '2026-01-06', '09:00', '13:00', 'ครึ่งวัน 4 ชม.', 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'pipo@minddojo.me' limit 1;
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'pipo@minddojo.me', 'wfh', '2026-02-19', '2026-02-20', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'pipo@minddojo.me' limit 1;

  -- bung@minddojo.me
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'bung@minddojo.me', 'sick', '2026-02-13', '2026-02-13', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'bung@minddojo.me' limit 1;
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'bung@minddojo.me', 'sick', '2026-02-16', '2026-02-17', 'หาหมอ', 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'bung@minddojo.me' limit 1;

  -- nahmking@minddojo.me
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'nahmking@minddojo.me', 'wfh', '2026-02-27', '2026-02-27', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'nahmking@minddojo.me' limit 1;

  -- poom@minddojo.me
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'poom@minddojo.me', 'wfh', '2026-02-19', '2026-02-20', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'poom@minddojo.me' limit 1;

  -- sarawut@minddojo.me
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'sarawut@minddojo.me', 'wfh', '2026-02-20', '2026-02-20', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'sarawut@minddojo.me' limit 1;

  -- amm@minddojo.me
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'amm@minddojo.me', 'wfh', '2026-02-27', '2026-02-27', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'amm@minddojo.me' limit 1;

  -- flim@minddojo.me
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'flim@minddojo.me', 'wfh', '2026-02-17', '2026-02-17', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'flim@minddojo.me' limit 1;

  -- phet@minddojo.me (ครึ่งวัน 4 ชม.)
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, start_time, end_time, reason, status, approved_by_email, approved_at)
  select u.id, 'phet@minddojo.me', 'vacation', '2026-02-02', '2026-02-02', '09:00', '13:00', 'ครึ่งวัน 4 ชม.', 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'phet@minddojo.me' limit 1;

  -- noon@minddojo.me
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'noon@minddojo.me', 'vacation', '2026-02-16', '2026-02-16', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'noon@minddojo.me' limit 1;

  -- ping@minddojo.me
  insert into public.leave_requests (user_id, user_email, leave_type, start_date, end_date, reason, status, approved_by_email, approved_at)
  select u.id, 'ping@minddojo.me', 'wfh', '2026-02-27', '2026-02-27', null, 'approved', 'pink@minddojo.me', batch_approved_at from auth.users u where u.email = 'ping@minddojo.me' limit 1;

  -- หักวันลาตามประเภท (เฉพาะแถวที่เพิ่งแทรก: approved_at = batch_approved_at)
  for r in
    select
      l.user_email,
      l.leave_type,
      sum(
        case
          when l.start_date = l.end_date and l.start_time is not null and l.end_time is not null
          then greatest(0, extract(epoch from (l.end_time - l.start_time)) / 3600.0)
          else ((l.end_date - l.start_date) + 1) * 8.0
        end
      ) as duration_hours
    from public.leave_requests l
    where l.status = 'approved'
      and l.approved_at = batch_approved_at
      and l.leave_type in ('personal', 'sick', 'vacation', 'unpaid')
    group by l.user_email, l.leave_type
  loop
    if r.leave_type = 'personal' then
      select (a.personal_remaining * 8.0) + coalesce(a.hours_personal_remaining, 0) into total_hours from public.admin_users a where a.email = r.user_email;
      if total_hours is not null then
        new_total := greatest(0, total_hours - r.duration_hours);
        new_days := floor(new_total / 8.0)::int;
        new_hours := new_total - (new_days * 8.0);
        update public.admin_users set personal_remaining = new_days, hours_personal_remaining = round(new_hours::numeric, 2) where email = r.user_email;
      end if;
    elsif r.leave_type = 'sick' then
      select (a.sick_remaining * 8.0) + coalesce(a.hours_sick_remaining, 0) into total_hours from public.admin_users a where a.email = r.user_email;
      if total_hours is not null then
        new_total := greatest(0, total_hours - r.duration_hours);
        new_days := floor(new_total / 8.0)::int;
        new_hours := new_total - (new_days * 8.0);
        update public.admin_users set sick_remaining = new_days, hours_sick_remaining = round(new_hours::numeric, 2) where email = r.user_email;
      end if;
    elsif r.leave_type = 'vacation' then
      select (a.annual_remaining * 8.0) + coalesce(a.hours_annual_remaining, 0) into total_hours from public.admin_users a where a.email = r.user_email;
      if total_hours is not null then
        new_total := greatest(0, total_hours - r.duration_hours);
        new_days := floor(new_total / 8.0)::int;
        new_hours := new_total - (new_days * 8.0);
        update public.admin_users set annual_remaining = new_days, hours_annual_remaining = round(new_hours::numeric, 2) where email = r.user_email;
      end if;
    elsif r.leave_type = 'unpaid' then
      select (a.unpaid_remaining * 8.0) + coalesce(a.hours_unpaid_remaining, 0) into total_hours from public.admin_users a where a.email = r.user_email;
      if total_hours is not null then
        new_total := greatest(0, total_hours - r.duration_hours);
        new_days := floor(new_total / 8.0)::int;
        new_hours := new_total - (new_days * 8.0);
        update public.admin_users set unpaid_remaining = new_days, hours_unpaid_remaining = round(new_hours::numeric, 2) where email = r.user_email;
      end if;
    end if;
  end loop;

  -- อัปเดต approved_at เป็นเวลาที่สมเหตุสมผล (ไม่ใช้ batch marker)
  update public.leave_requests set approved_at = (start_date + time '12:00:00')::timestamptz where approved_at = batch_approved_at;
end $$;
