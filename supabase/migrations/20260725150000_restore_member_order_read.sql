-- Members need table-level SELECT permission before the existing
-- orders_select_own_or_staff RLS policy can allow access to their own rows.
-- Keep anonymous access closed and rely on RLS for authenticated members.
revoke select on public.orders from anon;
grant select on public.orders to authenticated;
