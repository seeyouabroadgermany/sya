-- SYB CRM: Row Level Security.
-- Admin sees everything. Staff see only students assigned to them, and everything hanging off those students.
-- Anonymous visitors get nothing: the public lead form writes through server code.

alter table public.profiles enable row level security;
alter table public.stages enable row level security;
alter table public.stage_steps enable row level security;
alter table public.universities enable row level security;
alter table public.students enable row level security;
alter table public.student_steps enable row level security;
alter table public.shortlist enable row level security;
alter table public.document_types enable row level security;
alter table public.student_documents enable row level security;
alter table public.payments enable row level security;
alter table public.tasks enable row level security;
alter table public.activity_log enable row level security;
alter table public.app_settings enable row level security;
alter table public.message_templates enable row level security;
alter table public.lead_rate_limit enable row level security;

-- No anonymous access to anything in public.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon, public;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon, public;
grant execute on all functions in schema public to authenticated, service_role;

-- Server-only tables
revoke all on public.lead_rate_limit from authenticated;

-- profiles ------------------------------------------------------------------
create policy "team can see team" on public.profiles
  for select to authenticated using (public.is_active_user() or id = auth.uid());
create policy "edit own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "admin manages profiles" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- reference data: everyone reads, admin writes ------------------------------
create policy "team reads stages" on public.stages
  for select to authenticated using (public.is_active_user());
create policy "admin writes stages" on public.stages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "team reads steps" on public.stage_steps
  for select to authenticated using (public.is_active_user());
create policy "admin writes steps" on public.stage_steps
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "team reads universities" on public.universities
  for select to authenticated using (public.is_active_user());
create policy "admin writes universities" on public.universities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "team reads document types" on public.document_types
  for select to authenticated using (public.is_active_user());
create policy "admin writes document types" on public.document_types
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "team reads templates" on public.message_templates
  for select to authenticated using (public.is_active_user());
create policy "admin writes templates" on public.message_templates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "team reads settings" on public.app_settings
  for select to authenticated using (public.is_active_user());
create policy "admin writes settings" on public.app_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- students ------------------------------------------------------------------
create policy "see own or all students" on public.students
  for select to authenticated
  using (public.is_admin() or (public.is_active_user() and assigned_to = auth.uid()));
create policy "add students" on public.students
  for insert to authenticated
  with check (public.is_admin() or (public.is_active_user() and assigned_to = auth.uid()));
create policy "edit own or all students" on public.students
  for update to authenticated
  using (public.is_admin() or (public.is_active_user() and assigned_to = auth.uid()))
  with check (public.is_admin() or (public.is_active_user() and assigned_to = auth.uid()));
create policy "admin deletes students" on public.students
  for delete to authenticated using (public.is_admin());

-- everything that belongs to a student -------------------------------------
create policy "student steps" on public.student_steps
  for select to authenticated using (public.can_access_student(student_id));
create policy "update student steps" on public.student_steps
  for update to authenticated
  using (public.can_access_student(student_id)) with check (public.can_access_student(student_id));

create policy "shortlist" on public.shortlist
  for all to authenticated
  using (public.can_access_student(student_id)) with check (public.can_access_student(student_id));

create policy "student documents" on public.student_documents
  for select to authenticated using (public.can_access_student(student_id));
create policy "update student documents" on public.student_documents
  for update to authenticated
  using (public.can_access_student(student_id)) with check (public.can_access_student(student_id));

create policy "payments" on public.payments
  for all to authenticated
  using (public.can_access_student(student_id)) with check (public.can_access_student(student_id));

-- tasks: your own tasks, plus tasks on students you own; admin all
create policy "see tasks" on public.tasks
  for select to authenticated
  using (public.is_admin()
         or (public.is_active_user() and assigned_to = auth.uid())
         or (student_id is not null and public.can_access_student(student_id)));
create policy "add tasks" on public.tasks
  for insert to authenticated
  with check (public.is_admin()
              or (public.is_active_user() and assigned_to = auth.uid()
                  and (student_id is null or public.can_access_student(student_id))));
create policy "edit tasks" on public.tasks
  for update to authenticated
  using (public.is_admin() or (public.is_active_user() and assigned_to = auth.uid()))
  with check (public.is_admin() or (public.is_active_user() and assigned_to = auth.uid()));
create policy "delete tasks" on public.tasks
  for delete to authenticated
  using (public.is_admin() or (public.is_active_user() and assigned_to = auth.uid()));

-- activity log: read for your students; write only notes/calls/messages as yourself.
-- History rows are written by database triggers. Nobody edits history.
create policy "see activity" on public.activity_log
  for select to authenticated using (public.can_access_student(student_id));
create policy "add notes" on public.activity_log
  for insert to authenticated
  with check (public.can_access_student(student_id)
              and author_id = auth.uid()
              and kind in ('note', 'call', 'whatsapp', 'email'));
create policy "admin deletes activity" on public.activity_log
  for delete to authenticated using (public.is_admin());

-- Views run with the caller's rights (security_invoker), so the rules above apply.
grant select on public.student_board, public.student_step_state to authenticated;
