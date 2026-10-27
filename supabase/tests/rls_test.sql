-- Security checks for Row Level Security and the stage gate.
-- Run against the seeded local database:
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
-- Everything runs in a transaction and is rolled back.

begin;

create or replace function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end $$;

create or replace function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAIL: %', what; end if;
  raise notice 'ok  %', what;
end $$;

-- ids
create temp table ids as
select
  '00000000-0000-4000-a000-000000000001'::uuid as admin_id,
  '00000000-0000-4000-a000-000000000002'::uuid as anjali,
  '00000000-0000-4000-a000-000000000003'::uuid as rahul,
  (select id from public.students where full_name = 'Arjun Pillai') as anjali_student,
  (select id from public.students where full_name = 'Nihal Basheer') as rahul_student,
  (select id from public.stages where position = 3) as stage3;
grant select on ids to authenticated, anon;

-- ---------------------------------------------------------------- staff view
select pg_temp.act_as((select anjali from ids));

select pg_temp.check(
  (select count(*) from public.students) = (select count(*) from public.students where assigned_to = (select anjali from ids)),
  'staff only see their own students');
select pg_temp.check((select count(*) from public.students) between 1 and 15, 'staff see some students, not all');
select pg_temp.check(not exists (select 1 from public.student_board where assigned_to <> (select anjali from ids)), 'board view respects RLS');
select pg_temp.check(not exists (select 1 from public.payments p join public.students s on s.id = p.student_id where s.assigned_to <> (select anjali from ids)), 'staff cannot see other payments');
select pg_temp.check(not exists (select 1 from public.activity_log where student_id = (select rahul_student from ids)), 'staff cannot see other activity');
select pg_temp.check(not exists (select 1 from public.student_steps where student_id = (select rahul_student from ids)), 'staff cannot see other steps');

with u as (update public.students set city = 'Hacked' where id = (select rahul_student from ids) returning 1)
select pg_temp.check((select count(*) from u) = 0, 'staff cannot edit another counsellor''s student');

with u as (update public.student_steps set done = true where student_id = (select rahul_student from ids) returning 1)
select pg_temp.check((select count(*) from u) = 0, 'staff cannot tick another student''s steps');

-- staff can add a lead for themselves
insert into public.students (full_name, phone, lead_source, assigned_to)
values ('Test Lead', '+91 90000 00000', 'walk_in', (select anjali from ids));
select pg_temp.check(exists (select 1 from public.students where full_name = 'Test Lead'), 'staff can add own lead');
select pg_temp.check(
  (select count(*) from public.student_steps ss join public.students s on s.id = ss.student_id where s.full_name = 'Test Lead') > 30,
  'new lead gets every step');
select pg_temp.check(
  exists (select 1 from public.student_step_state v join public.students s on s.id = v.student_id
          join public.stage_steps st on st.id = v.step_id
          where s.full_name = 'Test Lead' and st.key = 'enquiry_received' and v.done and v.value = 'walk_in'),
  'enquiry received is ticked with the source');

-- staff cannot add a lead for someone else
do $$
begin
  begin
    insert into public.students (full_name, lead_source, assigned_to)
    values ('Sneaky', 'other', '00000000-0000-4000-a000-000000000003');
    raise exception 'FAIL: staff added a lead for someone else';
  exception when insufficient_privilege then
    raise notice 'ok  staff cannot add a lead for someone else';
  end;
end $$;

-- staff cannot reassign their own student
do $$
begin
  begin
    update public.students set assigned_to = '00000000-0000-4000-a000-000000000003'
    where full_name = 'Arjun Pillai';
    raise exception 'FAIL: staff reassigned a student';
  exception when raise_exception or insufficient_privilege then
    raise notice 'ok  staff cannot reassign';
  end;
end $$;

-- stage gate: Arjun (stage 2) has open required steps
select pg_temp.check(
  (select count(*) from public.stage_gate_missing((select anjali_student from ids), (select stage3 from ids))) > 0,
  'gate lists the missing steps');
do $$
begin
  begin
    perform public.move_student_stage((select anjali_student from ids), (select stage3 from ids), 'please');
    raise exception 'FAIL: staff skipped the gate';
  exception when sqlstate 'P0001' then
    raise notice 'ok  staff cannot skip required steps (even with a note)';
  end;
end $$;

-- staff cannot write fake history or change own role
do $$
begin
  begin
    insert into public.activity_log (student_id, author_id, kind, body)
    values ((select anjali_student from ids), (select anjali from ids), 'stage_change', 'fake');
    raise exception 'FAIL: staff wrote fake history';
  exception when insufficient_privilege then
    raise notice 'ok  staff cannot write stage history by hand';
  end;
end $$;
do $$
begin
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'FAIL: staff made themselves admin';
  exception when raise_exception then
    raise notice 'ok  staff cannot make themselves admin';
  end;
end $$;
insert into public.activity_log (student_id, author_id, kind, body)
values ((select anjali_student from ids), (select anjali from ids), 'note', 'Called, will send marks next week');
select pg_temp.check(true, 'staff can add a note');

-- staff cannot change reference data
with u as (update public.stages set name = 'X' returning 1)
select pg_temp.check((select count(*) from u) = 0, 'staff cannot edit stages');

-- phase 2: money, documents, settings and server-only functions
with u as (update public.student_documents set status = 'verified' where student_id = (select rahul_student from ids) returning 1)
select pg_temp.check((select count(*) from u) = 0, 'staff cannot tick another student''s documents');
do $$
begin
  begin
    insert into public.payments (student_id, kind, amount) values ((select rahul_student from ids), 'agency', 1);
    raise exception 'FAIL: staff added a payment to another student';
  exception when insufficient_privilege then
    raise notice 'ok  staff cannot add payments to another counsellor''s student';
  end;
end $$;
insert into public.payments (student_id, kind, amount) values ((select anjali_student from ids), 'agency', 1000);
select pg_temp.check(true, 'staff can add a payment to their own student');
with u as (update public.app_settings set round_robin_enabled = true returning 1)
select pg_temp.check((select count(*) from u) = 0, 'staff cannot change app settings');
do $$
begin
  begin
    perform public.pick_round_robin();
    raise exception 'FAIL: staff called pick_round_robin';
  exception when insufficient_privilege then
    raise notice 'ok  staff cannot call server-only round-robin';
  end;
  begin
    perform public.lead_rate_limit_hit('x');
    raise exception 'FAIL: staff called lead_rate_limit_hit';
  exception when insufficient_privilege then
    raise notice 'ok  staff cannot call server-only rate limit';
  end;
end $$;

-- tick the open steps, then the move succeeds and is logged
update public.student_steps ss set done = true
from public.stage_steps st join public.stages sg on sg.id = st.stage_id
where ss.step_id = st.id and ss.student_id = (select anjali_student from ids) and sg.position = 2 and st.key = 'shortlist_shared';
insert into public.shortlist (student_id, university_id, is_final)
values ((select anjali_student from ids), (select id from public.universities limit 1), false)
on conflict do nothing;
update public.shortlist set is_final = true
where id = (select id from public.shortlist where student_id = (select anjali_student from ids) limit 1);
select pg_temp.check(
  (select count(*) from public.stage_gate_missing((select anjali_student from ids), (select stage3 from ids))) = 0,
  'starring a final university ticks final choice');
select public.move_student_stage((select anjali_student from ids), (select stage3 from ids), null);
select pg_temp.check(
  exists (select 1 from public.activity_log where student_id = (select anjali_student from ids) and kind = 'stage_change'
          and body like '%to Apostille%' and author_id = (select anjali from ids)),
  'stage move is logged with the author');

-- ---------------------------------------------------------------- admin
select pg_temp.act_as((select admin_id from ids));
select pg_temp.check((select count(*) from public.students) >= 20, 'admin sees every student');
select pg_temp.check(exists (select 1 from public.students where assigned_to is null), 'admin sees unassigned website leads');
do $$
begin
  begin
    perform public.move_student_stage((select rahul_student from ids), (select stage3 from ids), null);
    raise exception 'FAIL: admin skipped the gate without a reason';
  exception when sqlstate 'P0001' then
    raise notice 'ok  admin needs a reason to skip steps';
  end;
end $$;
select public.move_student_stage((select rahul_student from ids), (select stage3 from ids), 'Documents arrived early');
select pg_temp.check(
  exists (select 1 from public.activity_log where student_id = (select rahul_student from ids) and body like '%Override: Documents arrived early%'),
  'admin override is logged with the reason');
update public.students set assigned_to = (select anjali from ids) where id = (select rahul_student from ids);
select pg_temp.check(exists (select 1 from public.activity_log where student_id = (select rahul_student from ids) and kind = 'assignment'), 'admin can reassign (logged)');

-- ---------------------------------------------------------------- admin two-step login
reset role;
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
values (gen_random_uuid(), (select admin_id from ids), 'test', 'totp', 'verified', now(), now(), 'x');
select pg_temp.act_as((select admin_id from ids));
select pg_temp.check((select count(*) from public.students) = 0, 'admin with 2FA on but no code entered sees no students');
select pg_temp.check(not public.is_admin(), 'admin rights wait for the second step');
select set_config('request.jwt.claims',
  json_build_object('sub', (select admin_id from ids), 'role', 'authenticated', 'aal', 'aal2')::text, true);
select pg_temp.check((select count(*) from public.students) >= 20, 'admin sees everything after entering the code');
reset role;

-- staff cannot touch settings tables
select pg_temp.act_as((select anjali from ids));
with u as (update public.message_templates set body = 'x' returning 1)
select pg_temp.check((select count(*) from u) = 0, 'staff cannot edit WhatsApp templates');
with u as (update public.document_types set required = false returning 1)
select pg_temp.check((select count(*) from u) = 0, 'staff cannot edit document types');
do $$
begin
  perform public.reorder_stages(array(select id from public.stages order by position desc));
  if exists (select 1 from public.stages where position = 1 and name <> 'Lead / Counselling') then
    raise exception 'FAIL: staff reordered stages';
  end if;
  raise notice 'ok  staff cannot reorder stages';
end $$;
reset role;

-- ---------------------------------------------------------------- anonymous
reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.students limit 1;
    raise exception 'FAIL: anonymous can read students';
  exception when insufficient_privilege then
    raise notice 'ok  anonymous cannot read students';
  end;
end $$;

rollback;
