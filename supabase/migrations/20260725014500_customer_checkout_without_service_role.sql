create or replace function public.list_public_course_sessions(
  p_stage smallint default null
)
returns table (
  id uuid,
  course_id uuid,
  stage smallint,
  title text,
  area text,
  instructor text,
  capacity integer,
  starts_at timestamptz,
  ends_at timestamptz,
  enrollment_closes_at timestamptz,
  seats_remaining integer,
  lessons jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    s.course_id,
    c.stage,
    s.title,
    s.area,
    s.instructor,
    s.capacity,
    s.starts_at,
    s.ends_at,
    s.enrollment_closes_at,
    greatest(
      s.capacity - (
        select count(*)::integer
        from public.enrollments e
        where e.session_id = s.id
          and (
            e.status in ('confirmed', 'completed')
            or (e.status = 'reserved' and e.reserved_until > now())
          )
      ),
      0
    )::integer as seats_remaining,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'session_id', l.session_id,
            'starts_at', l.starts_at,
            'ends_at', l.ends_at,
            'position', l.position
          )
          order by l.position
        )
        from public.session_lessons l
        where l.session_id = s.id
      ),
      '[]'::jsonb
    ) as lessons
  from public.course_sessions s
  join public.courses c on c.id = s.course_id
  where c.active
    and (p_stage is null or c.stage = p_stage)
    and s.status in ('published', 'full')
    and (
      s.enrollment_closes_at is null
      or s.enrollment_closes_at > now()
    )
  order by s.starts_at;
$$;

revoke all on function public.list_public_course_sessions(smallint) from public;
grant execute on function public.list_public_course_sessions(smallint)
to anon, authenticated;

create or replace function public.is_valid_referral_code(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.referral_code = upper(trim(p_code))
  );
$$;

revoke all on function public.is_valid_referral_code(text) from public;
grant execute on function public.is_valid_referral_code(text)
to anon, authenticated;

create or replace function public.create_checkout_order_for_current_user(
  p_stage smallint,
  p_session_id uuid,
  p_payment_method public.payment_method,
  p_referral_code text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_id uuid := (select auth.uid());
  target_course public.courses;
  normalized_referral_code text :=
    nullif(upper(trim(p_referral_code)), '');
  referrer_id uuid;
  amount_cents integer;
  reserved_until timestamptz;
  created_order public.orders;
begin
  if member_id is null then
    raise exception 'not_authenticated';
  end if;

  select * into target_course
  from public.courses c
  where c.stage = p_stage
    and c.active;

  if not found then
    raise exception 'course_not_found';
  end if;

  if normalized_referral_code is not null then
    select p.id into referrer_id
    from public.profiles p
    where p.referral_code = normalized_referral_code;

    if not found then
      raise exception 'invalid_referral';
    end if;
  end if;

  if referrer_id = member_id then
    raise exception 'self_referral';
  end if;

  amount_cents :=
    case
      when p_stage = 1
        and referrer_id is not null
        and target_course.referral_price_cents is not null
      then target_course.referral_price_cents
      else target_course.base_price_cents
    end
    + target_course.membership_fee_cents;

  reserved_until :=
    now()
    + case
        when p_payment_method = 'stripe'
        then interval '30 minutes'
        else interval '24 hours'
      end;

  select * into created_order
  from public.create_checkout_order(
    member_id,
    target_course.id,
    p_session_id,
    p_payment_method,
    amount_cents,
    normalized_referral_code,
    referrer_id,
    reserved_until
  );

  return created_order;
end;
$$;

revoke all on function public.create_checkout_order_for_current_user(
  smallint,
  uuid,
  public.payment_method,
  text
) from public;
grant execute on function public.create_checkout_order_for_current_user(
  smallint,
  uuid,
  public.payment_method,
  text
) to authenticated;

create or replace function public.record_payment_proof(
  p_order_id uuid,
  p_proof_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_id uuid := (select auth.uid());
begin
  if member_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_proof_path is null
    or p_proof_path not like member_id::text || '/%' then
    raise exception 'invalid_proof_path';
  end if;

  update public.payments p
  set
    proof_path = p_proof_path,
    status = 'requires_review'
  from public.orders o
  where p.order_id = p_order_id
    and o.id = p.order_id
    and o.member_id = member_id
    and o.payment_method = 'fps'
    and o.status = 'payment_review';

  if not found then
    raise exception 'order_not_eligible';
  end if;
end;
$$;

revoke all on function public.record_payment_proof(uuid, text) from public;
grant execute on function public.record_payment_proof(uuid, text)
to authenticated;
