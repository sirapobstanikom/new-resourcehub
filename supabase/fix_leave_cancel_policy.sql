-- แก้ constraint + RLS + trigger คืนวันลาเมื่ออนุมัติยกเลิก
-- รันทั้งหมดใน Supabase → SQL Editor

-- 1) Constraint สถานะ
alter table public.leave_requests drop constraint if exists leave_requests_status_check;
alter table public.leave_requests add constraint leave_requests_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled', 'cancel_requested'));

-- 2) RLS ให้ผู้ใช้ยกเลิกคำขอของตัวเองได้
drop policy if exists "Allow update own leave_requests cancel" on public.leave_requests;
create policy "Allow update own leave_requests cancel"
  on public.leave_requests for update
  using (auth.uid() = user_id and status in ('pending', 'approved'))
  with check (auth.uid() = user_id and status in ('cancelled', 'cancel_requested'));

-- 3) Trigger: เมื่อแอดมินอนุมัติยกเลิก (status → cancelled) คืนวันลา/ชม. กลับเข้า admin_users
drop trigger if exists refund_leave_balance_on_cancel on public.leave_requests;
drop function if exists public.refund_leave_balance_on_cancel();

create or replace function public.refund_leave_balance_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days int := 0;
  v_hours numeric := 0;
  v_d date;
  v_dow int;
  v_start_ts timestamp;
  v_end_ts timestamp;
  v_day_col text;
  v_hour_col text;
begin
  if new.status <> 'cancelled' or old.status <> 'cancel_requested' or old.leave_type = 'wfh' then
    return new;
  end if;

  if (old.start_date::text) = (old.end_date::text) and old.start_time is not null and old.end_time is not null then
    v_days := 0;
    v_start_ts := (old.start_date::text || ' ' || trim(coalesce(old.start_time::text, '09:00')))::timestamp;
    v_end_ts   := (old.end_date::text || ' ' || trim(coalesce(old.end_time::text, '17:00')))::timestamp;
    v_hours := greatest(0, extract(epoch from (v_end_ts - v_start_ts)) / 3600.0);
    v_hours := round(v_hours::numeric, 2);
  else
    v_d := (old.start_date::text)::date;
    while v_d <= (old.end_date::text)::date loop
      v_dow := extract(dow from v_d)::int;
      if v_dow <> 0 and v_dow <> 6 then
        v_days := v_days + 1;
      end if;
      v_d := v_d + 1;
    end loop;
    v_hours := 0;
  end if;

  if v_days = 0 and v_hours = 0 then
    return new;
  end if;

  case old.leave_type
    when 'personal' then v_day_col := 'personal_remaining';   v_hour_col := 'hours_personal_remaining';
    when 'sick'     then v_day_col := 'sick_remaining';      v_hour_col := 'hours_sick_remaining';
    when 'vacation' then v_day_col := 'annual_remaining';    v_hour_col := 'hours_annual_remaining';
    when 'unpaid'   then v_day_col := 'unpaid_remaining';    v_hour_col := 'hours_unpaid_remaining';
    else return new;
  end case;

  execute format(
    'update public.admin_users set %I = coalesce(%I, 0) + $1, %I = coalesce(%I, 0) + $2 where email = $3',
    v_day_col, v_day_col, v_hour_col, v_hour_col
  ) using v_days, v_hours, old.user_email;

  return new;
end;
$$;

create trigger refund_leave_balance_on_cancel
  after update on public.leave_requests
  for each row
  execute function public.refund_leave_balance_on_cancel();
