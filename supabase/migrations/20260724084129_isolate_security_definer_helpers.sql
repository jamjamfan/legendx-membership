-- Keep SECURITY DEFINER implementations out of the exposed Data API schema.
-- The public functions remain stable API/RLS entry points, but are now
-- SECURITY INVOKER wrappers around narrowly granted private helpers.

create schema if not exists app_private;

revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to anon, authenticated, service_role;

create function app_private.current_role()
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

revoke all on function app_private.current_role() from public, anon, authenticated;
grant execute on function app_private.current_role() to anon, authenticated, service_role;

create function app_private.get_paid_session_details(p_session_id uuid)
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
      app_private.current_role() in ('staff', 'admin')
      or exists (
        select 1
        from public.enrollments e
        where e.session_id = s.id
          and e.member_id = (select auth.uid())
          and e.status in ('confirmed', 'completed')
      )
    );
$$;

revoke all
on function app_private.get_paid_session_details(uuid)
from public, anon, authenticated;

grant execute
on function app_private.get_paid_session_details(uuid)
to authenticated, service_role;

create or replace function public.current_role()
returns public.app_role
language sql
stable
security invoker
set search_path = ''
as $$
  select app_private.current_role();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select app_private.current_role() in ('staff', 'admin');
$$;

create or replace function public.get_paid_session_details(p_session_id uuid)
returns table (
  session_id uuid,
  venue_name text,
  full_address text,
  zoom_join_url text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from app_private.get_paid_session_details(p_session_id);
$$;

revoke execute on function public.current_role() from public;
revoke execute on function public.is_staff() from public;
revoke execute on function public.get_paid_session_details(uuid) from public, anon;

grant execute on function public.current_role() to anon, authenticated, service_role;
grant execute on function public.is_staff() to anon, authenticated, service_role;
grant execute
on function public.get_paid_session_details(uuid)
to authenticated, service_role;

alter default privileges for role postgres in schema app_private
  revoke execute on functions from public, anon, authenticated;

alter default privileges for role postgres in schema app_private
  grant execute on functions to service_role;
