-- Supabase projects created after the 2026 Data API defaults change may not
-- expose new public objects automatically. Define the LegendX API surface
-- explicitly so deployment does not depend on project-level defaults.

-- The public sessions view is consumed only by server-side service-role code.
-- SECURITY INVOKER prevents the view owner from bypassing underlying RLS.
alter view public.public_course_sessions set (security_invoker = true);

-- Start from a closed Data API surface for browser roles.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated, service_role;

-- The service role is used exclusively by trusted Next.js server code.
grant select, insert, update, delete
on all tables in schema public
to service_role;

grant usage, select, update
on all sequences in schema public
to service_role;

grant execute
on all functions in schema public
to service_role;

-- Minimal browser-readable surface, with row access still constrained by RLS.
grant select on public.courses to anon, authenticated;
grant select on public.promo_content to anon, authenticated;
grant select on public.reviews to anon, authenticated;

-- Signed-in members may read and update only their own profile via RLS.
grant select on public.profiles to authenticated;
grant update (
  display_name,
  phone,
  marketing_email_consent,
  marketing_whatsapp_consent,
  consent_recorded_at
) on public.profiles to authenticated;

-- These helpers are required by RLS policies. The paid-session function also
-- checks auth.uid() and returns rows only to enrolled members or staff.
grant execute on function public.current_role() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.get_paid_session_details(uuid) to authenticated;

-- Keep future migrations closed by default and explicitly preserve the
-- server-side service-role access required by the application.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges for role postgres in schema public
  revoke usage, select, update on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  grant usage, select, update on sequences to service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema public
  grant execute on functions to service_role;
