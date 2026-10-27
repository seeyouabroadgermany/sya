-- SYB CRM: explicit table permissions for the app's logged-in role.
-- Newer Supabase projects no longer give new tables to the API roles automatically.
-- These grants only open the door to the tables; Row Level Security still decides which rows each person sees.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

-- Server-only pieces stay closed to logged-in users.
revoke all on public.lead_rate_limit from authenticated;
revoke execute on function public.lead_rate_limit_hit(text) from authenticated;
revoke execute on function public.pick_round_robin() from authenticated;

-- Tables added later get the same treatment.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;
