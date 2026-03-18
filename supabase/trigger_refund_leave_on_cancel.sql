-- เมื่อแอดมินอนุมัติยกเลิก (status เปลี่ยนจาก cancel_requested → cancelled)
-- คืนวันลา/ชั่วโมงกลับเข้า admin_users โดย trigger ใน DB (ไม่โดน RLS บล็อก)
-- รันใน Supabase → SQL Editor

-- ลบของเก่าถ้ามี
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
  -- เฉพาะเมื่อเปลี่ยนเป็น cancelled และเดิมเป็น cancel_requested และไม่ใช่ wfh
  if new.status <> 'cancelled' or old.status <> 'cancel_requested' or old.leave_type = 'wfh' then
    return new;
  end if;

  -- คำนวณวันทำงาน (ไม่รวมเสาร์อาทิตย์); รองรับ start_date/end_date เป็น date หรือ text
  if (old.start_date::text) = (old.end_date::text) and old.start_time is not null and old.end_time is not null then
    v_days := 0;
    -- ชั่วโมงจาก start_time ถึง end_time (รับ time หรือ text HH24:MI หรือ HH24:MI:SS)
    v_start_ts := (old.start_date::text || ' ' || trim(coalesce(old.start_time::text, '09:00')))::timestamp;
    v_end_ts   := (old.end_date::text || ' ' || trim(coalesce(old.end_time::text, '17:00')))::timestamp;
    v_hours := greatest(0, extract(epoch from (v_end_ts - v_start_ts)) / 3600.0);
    v_hours := round(v_hours::numeric, 2);
  else
    v_d := (old.start_date::text)::date;
    while v_d <= (old.end_date::text)::date loop
      v_dow := extract(dow from v_d)::int; -- 0=Sunday, 6=Saturday
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

  -- เลือกคอลัมน์ balance ตาม leave_type
  case old.leave_type
    when 'personal' then v_day_col := 'personal_remaining';   v_hour_col := 'hours_personal_remaining';
    when 'sick'     then v_day_col := 'sick_remaining';      v_hour_col := 'hours_sick_remaining';
    when 'vacation' then v_day_col := 'annual_remaining';    v_hour_col := 'hours_annual_remaining';
    when 'unpaid'   then v_day_col := 'unpaid_remaining';    v_hour_col := 'hours_unpaid_remaining';
    else return new; -- wfh หรืออื่นๆ ไม่หัก balance
  end case;

  -- อัปเดต admin_users: เพิ่มวันและชม. กลับ
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
