-- เพิ่มคอลัมน์ลาคงเหลือหน่วยชั่วโมง (1 วัน = 8 ชม. ถ้าลา 3 ชม. จาก 3 วัน → เหลือ 2 วัน 5 ชม.)
-- รันใน Supabase → SQL Editor สำหรับโปรเจกต์ที่มีตาราง admin_users อยู่แล้ว

alter table public.admin_users add column if not exists hours_remaining numeric(6,2) not null default 0;
alter table public.admin_users add column if not exists hours_personal_remaining numeric(6,2) not null default 0;
alter table public.admin_users add column if not exists hours_sick_remaining numeric(6,2) not null default 0;
alter table public.admin_users add column if not exists hours_annual_remaining numeric(6,2) not null default 0;
alter table public.admin_users add column if not exists hours_unpaid_remaining numeric(6,2) not null default 0;

-- อัปเดต trigger ให้หักเป็นชั่วโมง และเก็บเศษลงคอลัมน์ตามประเภทลา
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
  day_count int;
begin
  if NEW.status <> 'approved' or (OLD.status is not null and OLD.status = 'approved') then
    return NEW;
  end if;

  if NEW.start_date = NEW.end_date and NEW.start_time is not null and NEW.end_time is not null then
    duration_hours := greatest(0, extract(epoch from (NEW.end_time - NEW.start_time)) / 3600.0);
  else
    day_count := (NEW.end_date - NEW.start_date) + 1;
    duration_hours := day_count * 8.0;
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
