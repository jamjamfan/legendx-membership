alter table public.attendance_records
  add column if not exists checked_out_by uuid
    references public.profiles(id) on delete set null,
  add column if not exists checked_out_at timestamptz;

alter table public.attendance_records
  drop constraint if exists attendance_checkout_after_checkin;

alter table public.attendance_records
  add constraint attendance_checkout_after_checkin
  check (checked_out_at is null or checked_out_at >= checked_in_at);

create index if not exists attendance_records_member_check_times
on public.attendance_records(member_id, checked_in_at desc, checked_out_at);

create or replace function public.enforce_order_stage_progression()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_stage smallint;
  completed_stage smallint;
begin
  select c.stage into target_stage
  from public.courses c
  where c.id = new.course_id;

  select p.highest_completed_stage into completed_stage
  from public.profiles p
  where p.id = new.member_id;

  if target_stage = 2 and coalesce(completed_stage, 0) < 1 then
    raise exception 'stage_one_required';
  end if;

  if target_stage = 3 and coalesce(completed_stage, 0) < 2 then
    raise exception 'stage_two_required';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_enforce_stage_progression on public.orders;
create trigger orders_enforce_stage_progression
before insert on public.orders
for each row execute function public.enforce_order_stage_progression();
