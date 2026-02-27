-- รันใน Supabase Dashboard → SQL Editor
-- 1) เพิ่มคอลัมน์ลาพักร้อน (annual_remaining) ใน admin_users
-- 2) สร้าง trigger หักลาคงเหลือเมื่ออนุมัติคำขอลา

alter table public.admin_users add column if not exists annual_remaining int not null default 6;

-- เมื่ออนุมัติคำขอลา ให้หักลาคงเหลือใน admin_users อัตโนมัติ
create or replace function public.deduct_leave_balance_on_approve()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  days int;
begin
  if NEW.status = 'approved' and (OLD.status is null or OLD.status <> 'approved') then
    days := (NEW.end_date - NEW.start_date) + 1;
    if NEW.leave_type = 'personal' then
      update public.admin_users set personal_remaining = greatest(0, personal_remaining - days) where email = NEW.user_email;
    elsif NEW.leave_type = 'sick' then
      update public.admin_users set sick_remaining = greatest(0, sick_remaining - days) where email = NEW.user_email;
    elsif NEW.leave_type = 'vacation' then
      update public.admin_users set annual_remaining = greatest(0, annual_remaining - days) where email = NEW.user_email;
    elsif NEW.leave_type = 'unpaid' then
      update public.admin_users set unpaid_remaining = greatest(0, unpaid_remaining - days) where email = NEW.user_email;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trigger_deduct_leave_on_approve on public.leave_requests;
create trigger trigger_deduct_leave_on_approve
  after update on public.leave_requests
  for each row execute function public.deduct_leave_balance_on_approve();
