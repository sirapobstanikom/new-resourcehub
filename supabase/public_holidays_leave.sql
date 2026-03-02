-- วันหยุดที่ไม่ใช่เสาร์-อาทิตย์: วันที่ลาในช่วงนี้จะไม่หักวันลา
-- รันใน Supabase → SQL Editor (หลัง schema / add_hours_remaining แล้ว)

-- ตารางเก็บวันหยุด (เดือน, วัน) ใช้ทุกปี
create table if not exists public.public_holidays (
  id serial primary key,
  month smallint not null check (month between 1 and 12),
  day smallint not null check (day between 1 and 31),
  name text,
  unique(month, day)
);

-- ล้างแล้วใส่รายการที่กำหนด (1,2 ม.ค. / 3 มี.ค. / 6,13,14,15 เม.ย. / 1,4 พ.ค. / 1,3 มิ.ย. / 28,29 ก.ค. / 12 ส.ค. / 13,23 ต.ค. / 7,10,31 ธ.ค.)
delete from public.public_holidays;

insert into public.public_holidays (month, day, name) values
  (1, 1, 'ปีใหม่'),
  (1, 2, 'วันหยุดชดเชยปีใหม่'),
  (3, 3, 'วันหยุด'),
  (4, 6, 'วันหยุด'),
  (4, 13, 'วันสงกรานต์'),
  (4, 14, 'วันสงกรานต์'),
  (4, 15, 'วันสงกรานต์'),
  (5, 1, 'วันแรงงาน'),
  (5, 4, 'วันฉัตรมงคล'),
  (6, 1, 'วันหยุด'),
  (6, 3, 'วันหยุด'),
  (7, 28, 'วันหยุด'),
  (7, 29, 'วันหยุด'),
  (8, 12, 'วันแม่'),
  (10, 13, 'วันหยุด'),
  (10, 23, 'วันปิยมหาราช'),
  (12, 7, 'วันหยุด'),
  (12, 10, 'วันหยุด'),
  (12, 31, 'วันสิ้นปี');

alter table public.public_holidays enable row level security;
drop policy if exists "Allow read public_holidays" on public.public_holidays;
create policy "Allow read public_holidays" on public.public_holidays for select using (true);

-- ฟังก์ชันนับจำนวนวันทำงาน (ไม่รวมเสาร์-อาทิตย์ และวันหยุดใน public_holidays) ในช่วง start_date .. end_date
create or replace function public.count_chargeable_leave_days(p_start date, p_end date)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  d date;
  cnt int := 0;
  is_weekend boolean;
  is_holiday boolean;
begin
  if p_end < p_start then
    return 0;
  end if;
  d := p_start;
  while d <= p_end loop
    is_weekend := extract(dow from d) in (0, 6);  -- 0=อาทิตย์, 6=เสาร์
    select exists(
      select 1 from public.public_holidays h
      where h.month = extract(month from d) and h.day = extract(day from d)
    ) into is_holiday;
    if not is_weekend and not is_holiday then
      cnt := cnt + 1;
    end if;
    d := d + 1;
  end loop;
  return cnt;
end;
$$;

-- อัปเดต trigger ให้หักวันลาเฉพาะวันทำงาน (ไม่นับเสาร์-อาทิตย์ และวันหยุดใน public_holidays)
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

  -- กรณีลาไม่เต็มวัน (มี start_time/end_time): ใช้ชั่วโมงจริง
  if NEW.start_date = NEW.end_date and NEW.start_time is not null and NEW.end_time is not null then
    duration_hours := greatest(0, extract(epoch from (NEW.end_time - NEW.start_time)) / 3600.0);
  else
    -- กรณีลาหลายวันหรือเต็มวัน: นับเฉพาะวันทำงาน (ไม่รวมเสาร์-อาทิตย์ และวันหยุดราชการ)
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
