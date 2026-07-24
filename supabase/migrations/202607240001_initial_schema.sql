create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('member', 'staff', 'admin');
create type public.session_status as enum (
  'draft',
  'published',
  'full',
  'completed',
  'cancelled'
);
create type public.order_status as enum (
  'pending_payment',
  'payment_review',
  'paid',
  'refund_requested',
  'refund_processing',
  'refunded',
  'cancelled',
  'expired'
);
create type public.payment_method as enum ('stripe', 'fps', 'cash');
create type public.payment_status as enum (
  'pending',
  'requires_review',
  'succeeded',
  'failed',
  'refunded'
);
create type public.enrollment_status as enum (
  'reserved',
  'confirmed',
  'completed',
  'cancelled',
  'waitlisted'
);
create type public.rebate_program as enum ('stage_2', 'stage_3');
create type public.rebate_status as enum (
  'pending',
  'settled',
  'voided',
  'reversal_due'
);
create type public.ledger_entry_type as enum (
  'accrual',
  'settlement',
  'reversal',
  'offset'
);
create type public.refund_status as enum (
  'requested',
  'approved',
  'rejected',
  'completed'
);
create type public.inquiry_status as enum (
  'new',
  'contacted',
  'converted',
  'closed'
);
create type public.waitlist_status as enum (
  'waiting',
  'invited',
  'converted',
  'expired',
  'cancelled'
);
create type public.attendance_method as enum ('qr', 'manual', 'zoom');
create type public.review_status as enum ('pending', 'published', 'hidden');
create type public.notification_channel as enum ('email', 'whatsapp', 'in_app');
create type public.notification_status as enum (
  'queued',
  'sending',
  'sent',
  'failed',
  'cancelled'
);
create type public.promo_content_status as enum ('draft', 'published', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  phone text,
  role public.app_role not null default 'member',
  referral_code text not null unique,
  referrer_id uuid references public.profiles(id) on delete set null,
  highest_completed_stage smallint not null default 0
    check (highest_completed_stage between 0 and 3),
  marketing_email_consent boolean not null default false,
  marketing_whatsapp_consent boolean not null default false,
  consent_recorded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_no_self_referral check (referrer_id is null or referrer_id <> id)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  stage smallint not null unique check (stage between 1 and 3),
  name text not null,
  title text not null,
  summary text not null,
  base_price_cents integer not null check (base_price_cents >= 0),
  referral_price_cents integer check (referral_price_cents >= 0),
  membership_fee_cents integer not null default 0
    check (membership_fee_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  title text not null,
  area text not null,
  venue_name text,
  full_address text,
  instructor text not null,
  capacity integer not null check (capacity > 0),
  status public.session_status not null default 'draft',
  enrollment_opens_at timestamptz,
  enrollment_closes_at timestamptz,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  zoom_meeting_id text,
  zoom_join_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_sessions_time_order check (ends_at > starts_at)
);

create table public.session_lessons (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.course_sessions(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  position smallint not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (session_id, position),
  constraint session_lessons_time_order check (ends_at > starts_at)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  member_id uuid not null references public.profiles(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  session_id uuid not null references public.course_sessions(id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'HKD' check (currency = 'HKD'),
  payment_method public.payment_method not null,
  status public.order_status not null default 'pending_payment',
  referral_code text,
  referrer_id uuid references public.profiles(id) on delete set null,
  reserved_until timestamptz,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_no_self_referral check (
    referrer_id is null or referrer_id <> member_id
  )
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null,
  provider_payment_id text,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  amount_cents integer not null check (amount_cents >= 0),
  proof_path text,
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  provider_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (provider, provider_payment_id)
);

create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (char_length(reason) between 5 and 2000),
  status public.refund_status not null default 'requested',
  admin_response text,
  resolved_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index refund_requests_one_open_per_order
on public.refund_requests(order_id)
where status in ('requested', 'approved');

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete restrict,
  session_id uuid not null references public.course_sessions(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  status public.enrollment_status not null default 'reserved',
  reserved_until timestamptz,
  completed_at timestamptz,
  completion_confirmed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, session_id)
);

create table public.referral_batches (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete restrict,
  programme public.rebate_program not null,
  source_order_id uuid not null unique references public.orders(id) on delete restrict,
  slots_total smallint not null check (slots_total in (2, 3)),
  valid_from timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint referral_batches_expiry check (expires_at > valid_from)
);

create table public.rebate_records (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.referral_batches(id) on delete restrict,
  referrer_id uuid not null references public.profiles(id) on delete restrict,
  referred_member_id uuid not null references public.profiles(id) on delete restrict,
  referred_order_id uuid not null references public.orders(id) on delete restrict,
  slot_index smallint not null check (slot_index between 1 and 3),
  amount_cents integer not null check (amount_cents > 0),
  status public.rebate_status not null default 'pending',
  settled_by uuid references public.profiles(id) on delete set null,
  settled_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (referred_order_id)
);

create unique index rebate_records_active_slot
on public.rebate_records(batch_id, slot_index)
where status <> 'voided';

create table public.rebate_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete restrict,
  rebate_record_id uuid references public.rebate_records(id) on delete restrict,
  entry_type public.ledger_entry_type not null,
  amount_cents integer not null check (amount_cents <> 0),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  phone text not null,
  message text check (char_length(message) <= 2000),
  status public.inquiry_status not null default 'new',
  direct_marketing_consent boolean not null default false,
  consent_recorded_at timestamptz,
  converted_member_id uuid references public.profiles(id) on delete set null,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.promo_events (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'inquiry', 'signup', 'paid')),
  visitor_hash text,
  occurred_at timestamptz not null default now()
);

create index promo_events_member_time
on public.promo_events(referrer_id, occurred_at desc);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  lesson_id uuid not null references public.session_lessons(id) on delete restrict,
  member_id uuid not null references public.profiles(id) on delete restrict,
  method public.attendance_method not null,
  checked_in_by uuid references public.profiles(id) on delete set null,
  checked_in_at timestamptz not null default now(),
  note text,
  unique (enrollment_id, lesson_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete restrict,
  session_id uuid not null references public.course_sessions(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 3 and 2000),
  consent_public boolean not null default false,
  public_display_name text,
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, session_id)
);

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.course_sessions(id) on delete cascade,
  member_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  status public.waitlist_status not null default 'waiting',
  invited_at timestamptz,
  invitation_expires_at timestamptz,
  converted_order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index waitlist_member_once
on public.waitlist_entries(session_id, member_id)
where member_id is not null and status in ('waiting', 'invited');

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.course_sessions(id) on delete cascade,
  title text not null,
  body text not null,
  channels public.notification_channel[] not null default array['in_app']::public.notification_channel[],
  created_by uuid not null references public.profiles(id) on delete restrict,
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.profiles(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete cascade,
  lesson_id uuid references public.session_lessons(id) on delete cascade,
  channel public.notification_channel not null,
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.notification_status not null default 'queued',
  idempotency_key text not null unique,
  scheduled_for timestamptz not null,
  attempts smallint not null default 0,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notification_jobs_dispatch
on public.notification_jobs(status, scheduled_for)
where status in ('queued', 'failed');

create table public.promo_content (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique,
  status public.promo_content_status not null default 'draft',
  headline text not null,
  subheadline text not null,
  benefits jsonb not null default '[]'::jsonb,
  brand_story text not null,
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index promo_content_one_published
on public.promo_content(status)
where status = 'published';

create table public.settings (
  key text primary key,
  value jsonb not null,
  description text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index orders_member_created on public.orders(member_id, created_at desc);
create index orders_status_created on public.orders(status, created_at desc);
create index enrollments_session_status on public.enrollments(session_id, status);
create index rebate_records_referrer_status
on public.rebate_records(referrer_id, status, created_at desc);
create index inquiries_referrer_status
on public.inquiries(referrer_id, status, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.generate_referral_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  generated_code text;
begin
  loop
    generated_code := 'LX' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (
      select 1 from public.profiles where referral_code = generated_code
    );
  end loop;
  return generated_code;
end;
$$;

create function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role from public.profiles where id = (select auth.uid())),
    'member'::public.app_role
  );
$$;

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_role() in ('staff', 'admin');
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_referral text;
  resolved_referrer uuid;
begin
  requested_referral := upper(nullif(trim(new.raw_user_meta_data ->> 'referral_code'), ''));

  if requested_referral is not null then
    select id into resolved_referrer
    from public.profiles
    where referral_code = requested_referral;
  end if;

  insert into public.profiles (
    id,
    email,
    display_name,
    phone,
    referral_code,
    referrer_id,
    marketing_email_consent,
    marketing_whatsapp_consent,
    consent_recorded_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'LegendX 會員'),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    public.generate_referral_code(),
    resolved_referrer,
    coalesce((new.raw_user_meta_data ->> 'marketing_email_consent')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'marketing_whatsapp_consent')::boolean, false),
    case
      when coalesce((new.raw_user_meta_data ->> 'marketing_email_consent')::boolean, false)
        or coalesce((new.raw_user_meta_data ->> 'marketing_whatsapp_consent')::boolean, false)
      then now()
      else null
    end
  );

  if resolved_referrer is not null then
    insert into public.promo_events (
      referrer_id,
      event_type
    )
    values (
      resolved_referrer,
      'signup'
    );
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();
create trigger sessions_set_updated_at
before update on public.course_sessions
for each row execute function public.set_updated_at();
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();
create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();
create trigger refund_requests_set_updated_at
before update on public.refund_requests
for each row execute function public.set_updated_at();
create trigger enrollments_set_updated_at
before update on public.enrollments
for each row execute function public.set_updated_at();
create trigger rebate_records_set_updated_at
before update on public.rebate_records
for each row execute function public.set_updated_at();
create trigger inquiries_set_updated_at
before update on public.inquiries
for each row execute function public.set_updated_at();
create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();
create trigger waitlist_set_updated_at
before update on public.waitlist_entries
for each row execute function public.set_updated_at();
create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();
create trigger notification_jobs_set_updated_at
before update on public.notification_jobs
for each row execute function public.set_updated_at();
create trigger promo_content_set_updated_at
before update on public.promo_content
for each row execute function public.set_updated_at();

create view public.public_course_sessions as
select
  s.id,
  s.course_id,
  s.title,
  s.area,
  s.instructor,
  s.capacity,
  s.status,
  s.enrollment_opens_at,
  s.enrollment_closes_at,
  s.starts_at,
  s.ends_at,
  greatest(
    s.capacity - count(e.id) filter (
      where e.status in ('reserved', 'confirmed', 'completed')
        and (e.reserved_until is null or e.reserved_until > now())
    ),
    0
  )::integer as seats_remaining
from public.course_sessions s
left join public.enrollments e on e.session_id = s.id
where s.status in ('published', 'full')
group by s.id;

create function public.get_paid_session_details(p_session_id uuid)
returns table (
  session_id uuid,
  venue_name text,
  full_address text,
  zoom_join_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.venue_name, s.full_address, s.zoom_join_url
  from public.course_sessions s
  where s.id = p_session_id
    and (
      public.is_staff()
      or exists (
        select 1
        from public.enrollments e
        where e.session_id = s.id
          and e.member_id = (select auth.uid())
          and e.status in ('confirmed', 'completed')
      )
    );
$$;

create function public.rebate_amount(
  p_programme public.rebate_program,
  p_slot_index smallint
)
returns integer
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when p_programme = 'stage_2' and p_slot_index = 1 then 100000
    when p_programme = 'stage_2' and p_slot_index = 2 then 200000
    when p_programme = 'stage_2' and p_slot_index = 3 then 380000
    when p_programme = 'stage_3' and p_slot_index = 1 then 100000
    when p_programme = 'stage_3' and p_slot_index = 2 then 280000
    else null
  end;
$$;

create function public.create_checkout_order(
  p_member_id uuid,
  p_course_id uuid,
  p_session_id uuid,
  p_payment_method public.payment_method,
  p_amount_cents integer,
  p_referral_code text default null,
  p_referrer_id uuid default null,
  p_reserved_until timestamptz default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_course public.courses;
  target_session public.course_sessions;
  target_member public.profiles;
  target_order public.orders;
  generated_id uuid := extensions.gen_random_uuid();
  occupied_seats integer;
  expected_amount_cents integer;
  resolved_referrer_id uuid;
begin
  select * into target_member
  from public.profiles
  where id = p_member_id;

  if not found then
    raise exception 'member_not_found';
  end if;

  select * into target_course
  from public.courses
  where id = p_course_id and active;

  if not found then
    raise exception 'course_not_found';
  end if;

  select * into target_session
  from public.course_sessions
  where id = p_session_id
    and course_id = p_course_id
  for update;

  if not found or target_session.status not in ('published', 'full') then
    raise exception 'session_not_available';
  end if;

  if target_session.enrollment_opens_at is not null
    and target_session.enrollment_opens_at > now() then
    raise exception 'enrollment_not_open';
  end if;

  if target_session.enrollment_closes_at is not null
    and target_session.enrollment_closes_at <= now() then
    raise exception 'enrollment_closed';
  end if;

  if target_course.stage = 3 and target_member.highest_completed_stage < 2 then
    raise exception 'stage_two_required';
  end if;

  if nullif(upper(trim(p_referral_code)), '') is not null then
    select id into resolved_referrer_id
    from public.profiles
    where referral_code = upper(trim(p_referral_code));

    if not found
      or p_referrer_id is null
      or resolved_referrer_id <> p_referrer_id then
      raise exception 'invalid_referral';
    end if;
  elsif p_referrer_id is not null then
    raise exception 'invalid_referral';
  end if;

  if p_referrer_id = p_member_id then
    raise exception 'self_referral';
  end if;

  expected_amount_cents :=
    case
      when resolved_referrer_id is not null
        and target_course.referral_price_cents is not null
      then target_course.referral_price_cents
      else target_course.base_price_cents
    end
    + target_course.membership_fee_cents;

  if p_amount_cents <> expected_amount_cents then
    raise exception 'amount_mismatch';
  end if;

  if exists (
    select 1
    from public.orders o
    where o.member_id = p_member_id
      and o.course_id = p_course_id
      and o.status in (
        'pending_payment',
        'payment_review',
        'paid',
        'refund_requested',
        'refund_processing'
      )
  ) then
    raise exception 'active_order_exists';
  end if;

  select count(*) into occupied_seats
  from public.enrollments e
  where e.session_id = p_session_id
    and (
      e.status in ('confirmed', 'completed')
      or (e.status = 'reserved' and e.reserved_until > now())
    );

  if occupied_seats >= target_session.capacity then
    raise exception 'session_full';
  end if;

  insert into public.orders (
    id,
    order_number,
    member_id,
    course_id,
    session_id,
    amount_cents,
    payment_method,
    status,
    referral_code,
    referrer_id,
    reserved_until
  )
  values (
    generated_id,
    'LX-' || to_char(now(), 'YYYYMMDD') || '-' ||
      upper(substr(replace(generated_id::text, '-', ''), 1, 8)),
    p_member_id,
    p_course_id,
    p_session_id,
    p_amount_cents,
    p_payment_method,
    case
      when p_payment_method = 'stripe' then 'pending_payment'::public.order_status
      else 'payment_review'::public.order_status
    end,
    nullif(upper(trim(p_referral_code)), ''),
    p_referrer_id,
    p_reserved_until
  )
  returning * into target_order;

  insert into public.payments (
    order_id,
    provider,
    method,
    status,
    amount_cents
  )
  values (
    target_order.id,
    case when p_payment_method = 'stripe' then 'stripe' else 'manual' end,
    p_payment_method,
    case
      when p_payment_method = 'stripe' then 'pending'::public.payment_status
      else 'requires_review'::public.payment_status
    end,
    p_amount_cents
  );

  insert into public.enrollments (
    member_id,
    session_id,
    order_id,
    status,
    reserved_until
  )
  values (
    p_member_id,
    p_session_id,
    target_order.id,
    'reserved',
    p_reserved_until
  )
  on conflict (member_id, session_id)
  do update set
    order_id = excluded.order_id,
    status = 'reserved',
    reserved_until = excluded.reserved_until;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    after_data
  )
  values (
    p_member_id,
    'order.create',
    'order',
    target_order.id,
    to_jsonb(target_order)
  );

  return target_order;
end;
$$;

create function public.expire_stale_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_count integer;
begin
  with expired_orders as (
    update public.orders
    set status = 'expired', updated_at = now()
    where status in ('pending_payment', 'payment_review')
      and reserved_until <= now()
    returning id
  ),
  expired_enrollments as (
    update public.enrollments e
    set status = 'cancelled', reserved_until = null, updated_at = now()
    where e.order_id in (select id from expired_orders)
    returning e.id
  )
  select count(*) into expired_count from expired_enrollments;

  return expired_count;
end;
$$;

create function public.enqueue_lesson_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  with reminder_candidates as (
    select
      e.member_id,
      l.id as lesson_id,
      p.email,
      p.phone,
      p.display_name,
      p.marketing_whatsapp_consent,
      l.title as lesson_title,
      l.starts_at,
      s.title as session_title,
      s.area,
      s.venue_name,
      reminder.channel,
      reminder.offset_key,
      reminder.scheduled_for
    from public.enrollments e
    join public.profiles p on p.id = e.member_id
    join public.course_sessions s on s.id = e.session_id
    join public.session_lessons l on l.session_id = s.id
    cross join lateral (
      values
        (
          'email'::public.notification_channel,
          't_1_day'::text,
          l.starts_at - interval '1 day'
        ),
        (
          'email'::public.notification_channel,
          't_3_hours'::text,
          l.starts_at - interval '3 hours'
        ),
        (
          'whatsapp'::public.notification_channel,
          't_1_day'::text,
          l.starts_at - interval '1 day'
        ),
        (
          'whatsapp'::public.notification_channel,
          't_3_hours'::text,
          l.starts_at - interval '3 hours'
        )
    ) as reminder(channel, offset_key, scheduled_for)
    where e.status = 'confirmed'
      and l.starts_at > now()
      and (
        reminder.channel = 'email'
        or (
          reminder.channel = 'whatsapp'
          and p.marketing_whatsapp_consent
          and p.phone is not null
        )
      )
  ),
  inserted as (
    insert into public.notification_jobs (
      member_id,
      lesson_id,
      channel,
      template_key,
      payload,
      idempotency_key,
      scheduled_for
    )
    select
      candidate.member_id,
      candidate.lesson_id,
      candidate.channel,
      'lesson_reminder',
      jsonb_build_object(
        'email', candidate.email,
        'phone', candidate.phone,
        'displayName', candidate.display_name,
        'lessonTitle', candidate.lesson_title,
        'sessionTitle', candidate.session_title,
        'startsAt', candidate.starts_at,
        'area', candidate.area,
        'venueName', candidate.venue_name,
        'offset', candidate.offset_key
      ),
      'lesson:' || candidate.lesson_id::text || ':member:' ||
        candidate.member_id::text || ':' || candidate.channel::text || ':' ||
        candidate.offset_key,
      candidate.scheduled_for
    from reminder_candidates candidate
    on conflict (idempotency_key) do nothing
    returning id
  )
  select count(*) into inserted_count from inserted;

  return inserted_count;
end;
$$;

create function public.claim_notification_jobs(p_limit integer default 50)
returns setof public.notification_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with candidates as (
    select n.id
    from public.notification_jobs n
    where n.status in ('queued', 'failed')
      and n.scheduled_for <= now()
      and n.attempts < 5
    order by n.scheduled_for, n.id
    limit greatest(1, least(p_limit, 100))
    for update skip locked
  )
  update public.notification_jobs n
  set
    status = 'sending',
    attempts = n.attempts + 1,
    updated_at = now()
  from candidates
  where n.id = candidates.id
  returning n.*;
end;
$$;

create function public.complete_paid_order(
  p_order_id uuid,
  p_actor_id uuid default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders;
  target_course public.courses;
  chosen_batch public.referral_batches;
  chosen_slot smallint;
  generated_rebate public.rebate_records;
begin
  select * into target_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'order_not_found';
  end if;

  if target_order.status = 'paid' then
    return target_order;
  end if;

  if target_order.status not in ('pending_payment', 'payment_review') then
    raise exception 'order_not_payable';
  end if;

  select * into target_course
  from public.courses
  where id = target_order.course_id;

  update public.orders
  set status = 'paid', paid_at = now()
  where id = target_order.id
  returning * into target_order;

  insert into public.enrollments (
    member_id,
    session_id,
    order_id,
    status,
    reserved_until
  )
  values (
    target_order.member_id,
    target_order.session_id,
    target_order.id,
    'confirmed',
    null
  )
  on conflict (member_id, session_id)
  do update set
    order_id = excluded.order_id,
    status = 'confirmed',
    reserved_until = null;

  if target_course.stage = 2 then
    insert into public.referral_batches (
      member_id,
      programme,
      source_order_id,
      slots_total,
      valid_from,
      expires_at
    )
    values (
      target_order.member_id,
      'stage_2',
      target_order.id,
      3,
      now(),
      now() + interval '180 days'
    )
    on conflict (source_order_id) do nothing;
  elsif target_course.stage = 3 then
    insert into public.referral_batches (
      member_id,
      programme,
      source_order_id,
      slots_total,
      valid_from,
      expires_at
    )
    values (
      target_order.member_id,
      'stage_3',
      target_order.id,
      2,
      now(),
      now() + interval '180 days'
    )
    on conflict (source_order_id) do nothing;
  elsif target_course.stage = 1 and target_order.referrer_id is not null then
    insert into public.promo_events (
      referrer_id,
      event_type
    )
    values (
      target_order.referrer_id,
      'paid'
    );

    select b.* into chosen_batch
    from public.referral_batches b
    where b.member_id = target_order.referrer_id
      and b.expires_at > now()
      and exists (
        select 1
        from generate_series(1, b.slots_total) as candidate(slot_index)
        where not exists (
          select 1
          from public.rebate_records r
          where r.batch_id = b.id
            and r.slot_index = candidate.slot_index
            and r.status <> 'voided'
        )
      )
    order by
      case b.programme when 'stage_2' then 1 else 2 end,
      b.valid_from,
      b.id
    limit 1
    for update;

    if chosen_batch.id is not null then
      select candidate.slot_index::smallint into chosen_slot
      from generate_series(1, chosen_batch.slots_total) as candidate(slot_index)
      where not exists (
        select 1
        from public.rebate_records r
        where r.batch_id = chosen_batch.id
          and r.slot_index = candidate.slot_index
          and r.status <> 'voided'
      )
      order by candidate.slot_index
      limit 1;

      insert into public.rebate_records (
        batch_id,
        referrer_id,
        referred_member_id,
        referred_order_id,
        slot_index,
        amount_cents
      )
      values (
        chosen_batch.id,
        target_order.referrer_id,
        target_order.member_id,
        target_order.id,
        chosen_slot,
        public.rebate_amount(chosen_batch.programme, chosen_slot)
      )
      on conflict (referred_order_id) do nothing
      returning * into generated_rebate;

      if generated_rebate.id is not null then
        insert into public.rebate_ledger_entries (
          member_id,
          rebate_record_id,
          entry_type,
          amount_cents,
          note,
          created_by
        )
        values (
          generated_rebate.referrer_id,
          generated_rebate.id,
          'accrual',
          generated_rebate.amount_cents,
          '介紹朋友完成第一階段付款',
          p_actor_id
        );
      end if;
    end if;
  end if;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    after_data
  )
  values (
    p_actor_id,
    'order.mark_paid',
    'order',
    target_order.id,
    to_jsonb(target_order)
  );

  return target_order;
end;
$$;

create function public.void_rebate_for_refund(
  p_order_id uuid,
  p_actor_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_rebate public.rebate_records;
begin
  select * into target_rebate
  from public.rebate_records
  where referred_order_id = p_order_id
  for update;

  if not found or target_rebate.status = 'voided' then
    return;
  end if;

  if target_rebate.status = 'settled' then
    update public.rebate_records
    set status = 'reversal_due'
    where id = target_rebate.id;

    insert into public.rebate_ledger_entries (
      member_id,
      rebate_record_id,
      entry_type,
      amount_cents,
      note,
      created_by
    )
    values (
      target_rebate.referrer_id,
      target_rebate.id,
      'reversal',
      -target_rebate.amount_cents,
      '朋友退款；由下一筆獎學金抵扣',
      p_actor_id
    );
  else
    update public.rebate_records
    set status = 'voided', voided_at = now()
    where id = target_rebate.id;

    insert into public.rebate_ledger_entries (
      member_id,
      rebate_record_id,
      entry_type,
      amount_cents,
      note,
      created_by
    )
    values (
      target_rebate.referrer_id,
      target_rebate.id,
      'reversal',
      -target_rebate.amount_cents,
      '朋友退款；未結算獎學金作廢並釋放名額',
      p_actor_id
    );
  end if;
end;
$$;

create function public.complete_refund(
  p_refund_id uuid,
  p_actor_id uuid
)
returns public.refund_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_refund public.refund_requests;
  target_order public.orders;
begin
  select * into target_refund
  from public.refund_requests
  where id = p_refund_id
  for update;

  if not found then
    raise exception 'refund_not_found';
  end if;

  if target_refund.status = 'completed' then
    return target_refund;
  end if;

  select * into target_order
  from public.orders
  where id = target_refund.order_id
  for update;

  if target_order.status not in (
    'paid',
    'refund_requested',
    'refund_processing'
  ) then
    raise exception 'order_not_refundable';
  end if;

  update public.refund_requests
  set
    status = 'completed',
    resolved_by = p_actor_id,
    resolved_at = now()
  where id = target_refund.id
  returning * into target_refund;

  update public.orders
  set status = 'refunded', refunded_at = now()
  where id = target_order.id;

  update public.payments
  set status = 'refunded'
  where order_id = target_order.id
    and status = 'succeeded';

  update public.enrollments
  set status = 'cancelled', reserved_until = null
  where order_id = target_order.id;

  perform public.void_rebate_for_refund(target_order.id, p_actor_id);

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data
  )
  values (
    p_actor_id,
    'refund.complete',
    'refund_request',
    target_refund.id,
    to_jsonb(target_order),
    to_jsonb(target_refund)
  );

  return target_refund;
end;
$$;

create function public.request_refund(
  p_order_id uuid,
  p_member_id uuid,
  p_reason text
)
returns public.refund_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders;
  target_refund public.refund_requests;
begin
  if char_length(trim(p_reason)) < 5 then
    raise exception 'reason_too_short';
  end if;

  select * into target_order
  from public.orders
  where id = p_order_id and member_id = p_member_id
  for update;

  if not found or target_order.status <> 'paid' then
    raise exception 'order_not_refundable';
  end if;

  insert into public.refund_requests (
    order_id,
    requested_by,
    reason
  )
  values (
    p_order_id,
    p_member_id,
    trim(p_reason)
  )
  returning * into target_refund;

  update public.orders
  set status = 'refund_requested'
  where id = p_order_id;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    after_data
  )
  values (
    p_member_id,
    'refund.request',
    'refund_request',
    target_refund.id,
    to_jsonb(target_refund)
  );

  return target_refund;
end;
$$;

create function public.reject_refund(
  p_refund_id uuid,
  p_actor_id uuid,
  p_response text
)
returns public.refund_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_refund public.refund_requests;
begin
  if char_length(trim(p_response)) < 3 then
    raise exception 'response_required';
  end if;

  select * into target_refund
  from public.refund_requests
  where id = p_refund_id
  for update;

  if not found or target_refund.status not in ('requested', 'approved') then
    raise exception 'refund_not_reviewable';
  end if;

  update public.refund_requests
  set
    status = 'rejected',
    admin_response = trim(p_response),
    resolved_by = p_actor_id,
    resolved_at = now()
  where id = target_refund.id
  returning * into target_refund;

  update public.orders
  set status = 'paid'
  where id = target_refund.order_id
    and status in ('refund_requested', 'refund_processing');

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    after_data
  )
  values (
    p_actor_id,
    'refund.reject',
    'refund_request',
    target_refund.id,
    to_jsonb(target_refund)
  );

  return target_refund;
end;
$$;

create function public.settle_rebate(
  p_rebate_id uuid,
  p_actor_id uuid,
  p_note text default null
)
returns public.rebate_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_rebate public.rebate_records;
begin
  select * into target_rebate
  from public.rebate_records
  where id = p_rebate_id
  for update;

  if not found then
    raise exception 'rebate_not_found';
  end if;

  if target_rebate.status = 'settled' then
    return target_rebate;
  end if;

  if target_rebate.status <> 'pending' then
    raise exception 'rebate_not_settleable';
  end if;

  update public.rebate_records
  set status = 'settled', settled_by = p_actor_id, settled_at = now()
  where id = target_rebate.id
  returning * into target_rebate;

  insert into public.rebate_ledger_entries (
    member_id,
    rebate_record_id,
    entry_type,
    amount_cents,
    note,
    created_by
  )
  values (
    target_rebate.referrer_id,
    target_rebate.id,
    'settlement',
    -target_rebate.amount_cents,
    coalesce(nullif(trim(p_note), ''), '獎學金已人工過數'),
    p_actor_id
  );

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    after_data
  )
  values (
    p_actor_id,
    'rebate.settle',
    'rebate_record',
    target_rebate.id,
    to_jsonb(target_rebate)
  );

  return target_rebate;
end;
$$;

create function public.publish_promo_content(
  p_actor_id uuid,
  p_headline text,
  p_subheadline text,
  p_benefits jsonb,
  p_brand_story text
)
returns public.promo_content
language plpgsql
security definer
set search_path = ''
as $$
declare
  published_content public.promo_content;
  next_version integer;
begin
  if char_length(trim(p_headline)) < 3
    or char_length(trim(p_subheadline)) < 3
    or char_length(trim(p_brand_story)) < 3
    or jsonb_typeof(p_benefits) <> 'array' then
    raise exception 'invalid_content';
  end if;

  update public.promo_content
  set status = 'archived'
  where status = 'published';

  select coalesce(max(version), 0) + 1
  into next_version
  from public.promo_content;

  insert into public.promo_content (
    version,
    status,
    headline,
    subheadline,
    benefits,
    brand_story,
    published_by,
    published_at
  )
  values (
    next_version,
    'published',
    trim(p_headline),
    trim(p_subheadline),
    p_benefits,
    trim(p_brand_story),
    p_actor_id,
    now()
  )
  returning * into published_content;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    after_data
  )
  values (
    p_actor_id,
    'promo.publish',
    'promo_content',
    published_content.id,
    to_jsonb(published_content)
  );

  return published_content;
end;
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_sessions enable row level security;
alter table public.session_lessons enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.refund_requests enable row level security;
alter table public.enrollments enable row level security;
alter table public.referral_batches enable row level security;
alter table public.rebate_records enable row level security;
alter table public.rebate_ledger_entries enable row level security;
alter table public.inquiries enable row level security;
alter table public.promo_events enable row level security;
alter table public.attendance_records enable row level security;
alter table public.reviews enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.announcements enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.promo_content enable row level security;
alter table public.settings enable row level security;
alter table public.webhook_events enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_own_or_staff"
on public.profiles for select
to authenticated
using (id = (select auth.uid()) or public.is_staff());

create policy "courses_public_read_active"
on public.courses for select
to anon, authenticated
using (active or public.is_staff());

create policy "sessions_read_published_or_staff"
on public.course_sessions for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1 from public.enrollments e
    where e.session_id = course_sessions.id
      and e.member_id = (select auth.uid())
      and e.status in ('confirmed', 'completed')
  )
);

create policy "lessons_read_enrolled_or_staff"
on public.session_lessons for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1 from public.enrollments e
    where e.session_id = session_lessons.session_id
      and e.member_id = (select auth.uid())
      and e.status in ('confirmed', 'completed')
  )
);

create policy "orders_select_own_or_staff"
on public.orders for select
to authenticated
using (member_id = (select auth.uid()) or public.is_staff());

create policy "payments_select_own_or_staff"
on public.payments for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1 from public.orders o
    where o.id = payments.order_id and o.member_id = (select auth.uid())
  )
);

create policy "refunds_select_own_or_staff"
on public.refund_requests for select
to authenticated
using (requested_by = (select auth.uid()) or public.is_staff());

create policy "refunds_insert_own_paid_order"
on public.refund_requests for insert
to authenticated
with check (
  requested_by = (select auth.uid())
  and exists (
    select 1 from public.orders o
    where o.id = refund_requests.order_id
      and o.member_id = (select auth.uid())
      and o.status = 'paid'
  )
);

create policy "enrollments_select_own_or_staff"
on public.enrollments for select
to authenticated
using (member_id = (select auth.uid()) or public.is_staff());

create policy "referral_batches_select_own_or_staff"
on public.referral_batches for select
to authenticated
using (member_id = (select auth.uid()) or public.is_staff());

create policy "rebates_select_own_or_staff"
on public.rebate_records for select
to authenticated
using (referrer_id = (select auth.uid()) or public.is_staff());

create policy "ledger_select_own_or_staff"
on public.rebate_ledger_entries for select
to authenticated
using (member_id = (select auth.uid()) or public.is_staff());

create policy "inquiries_select_referrer_or_staff"
on public.inquiries for select
to authenticated
using (referrer_id = (select auth.uid()) or public.is_staff());

create policy "promo_events_select_referrer_or_staff"
on public.promo_events for select
to authenticated
using (referrer_id = (select auth.uid()) or public.is_staff());

create policy "attendance_select_own_or_staff"
on public.attendance_records for select
to authenticated
using (member_id = (select auth.uid()) or public.is_staff());

create policy "reviews_read_published_or_own_or_staff"
on public.reviews for select
to anon, authenticated
using (
  (status = 'published' and consent_public)
  or member_id = (select auth.uid())
  or public.is_staff()
);

create policy "reviews_insert_own_completed_session"
on public.reviews for insert
to authenticated
with check (
  member_id = (select auth.uid())
  and exists (
    select 1 from public.enrollments e
    where e.member_id = (select auth.uid())
      and e.session_id = reviews.session_id
      and e.status = 'completed'
  )
);

create policy "waitlist_select_own_or_staff"
on public.waitlist_entries for select
to authenticated
using (member_id = (select auth.uid()) or public.is_staff());

create policy "announcements_read_target_or_staff"
on public.announcements for select
to authenticated
using (
  public.is_staff()
  or (
    published_at is not null
    and (
      session_id is null
      or exists (
        select 1 from public.enrollments e
        where e.session_id = announcements.session_id
          and e.member_id = (select auth.uid())
          and e.status in ('confirmed', 'completed')
      )
    )
  )
);

create policy "notification_jobs_select_own_or_staff"
on public.notification_jobs for select
to authenticated
using (member_id = (select auth.uid()) or public.is_staff());

create policy "promo_content_read_published_or_staff"
on public.promo_content for select
to anon, authenticated
using (status = 'published' or public.is_staff());

create policy "settings_staff_read"
on public.settings for select
to authenticated
using (public.is_staff());

create policy "audit_staff_read"
on public.audit_logs for select
to authenticated
using (public.is_staff());

revoke update on public.profiles from authenticated;
grant update (
  display_name,
  phone,
  marketing_email_consent,
  marketing_whatsapp_consent,
  consent_recorded_at
) on public.profiles to authenticated;

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

revoke all on public.webhook_events from anon, authenticated;
revoke all on public.audit_logs from anon;
revoke all on function public.create_checkout_order(
  uuid,
  uuid,
  uuid,
  public.payment_method,
  integer,
  text,
  uuid,
  timestamptz
) from public;
revoke all on function public.expire_stale_reservations() from public;
revoke all on function public.enqueue_lesson_reminders() from public;
revoke all on function public.claim_notification_jobs(integer) from public;
grant execute on function public.create_checkout_order(
  uuid,
  uuid,
  uuid,
  public.payment_method,
  integer,
  text,
  uuid,
  timestamptz
) to service_role;
grant execute on function public.expire_stale_reservations() to service_role;
grant execute on function public.enqueue_lesson_reminders() to service_role;
grant execute on function public.claim_notification_jobs(integer) to service_role;
revoke all on function public.complete_refund(uuid, uuid) from public;
revoke all on function public.request_refund(uuid, uuid, text) from public;
revoke all on function public.reject_refund(uuid, uuid, text) from public;
revoke all on function public.settle_rebate(uuid, uuid, text) from public;
revoke all on function public.publish_promo_content(
  uuid,
  text,
  text,
  jsonb,
  text
) from public;
grant execute on function public.complete_refund(uuid, uuid) to service_role;
grant execute on function public.request_refund(uuid, uuid, text) to service_role;
grant execute on function public.reject_refund(uuid, uuid, text) to service_role;
grant execute on function public.settle_rebate(uuid, uuid, text) to service_role;
grant execute on function public.publish_promo_content(
  uuid,
  text,
  text,
  jsonb,
  text
) to service_role;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "payment_proofs_insert_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "payment_proofs_select_own_or_staff"
on storage.objects for select
to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or public.is_staff()
  )
);
revoke execute on function public.complete_paid_order(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.void_rebate_for_refund(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_paid_session_details(uuid) to authenticated;
revoke select on public.course_sessions from anon, authenticated;
grant select on public.public_course_sessions to anon, authenticated;
