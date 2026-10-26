-- SYB CRM: helper functions, triggers (history + stage gate) and views.

-- ---------------------------------------------------------------------------
-- Who is asking?
-- auth.uid() is null only for trusted server code (service key, cron, SQL editor).
-- Anonymous visitors have no table access at all (see RLS migration).
-- ---------------------------------------------------------------------------
create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active and role = 'admin')
$$;

create or replace function public.can_access_student(p_student uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or (public.is_active_user()
          and exists (select 1 from public.students s where s.id = p_student and s.assigned_to = auth.uid()))
$$;

-- A step counts as complete when it is done, and a pass/fail step only when it passed.
create or replace function public.step_complete(p_kind public.step_kind, p_done boolean, p_value text)
returns boolean language sql immutable as $$
  select coalesce(p_done, false) and (p_kind <> 'pass_fail' or p_value = 'pass')
$$;

-- ---------------------------------------------------------------------------
-- Views (security_invoker: the caller's RLS rules apply)
-- ---------------------------------------------------------------------------
create view public.student_step_state with (security_invoker = true) as
select
  ss.student_id,
  ss.step_id,
  st.stage_id,
  st.kind,
  st.required,
  st.active,
  st.label,
  st.position,
  ss.done,
  ss.value,
  ss.done_at,
  ss.done_by,
  (st.show_if_step_id is null or exists (
     select 1 from public.student_steps c
     where c.student_id = ss.student_id and c.step_id = st.show_if_step_id and c.value = st.show_if_value
  )) as visible,
  public.step_complete(st.kind, ss.done, ss.value) as complete
from public.student_steps ss
join public.stage_steps st on st.id = ss.step_id;

create view public.student_board with (security_invoker = true) as
select
  s.id,
  s.full_name,
  s.phone,
  s.whatsapp,
  s.email,
  s.city,
  s.level,
  s.intake_month,
  s.intake_year,
  s.lead_source,
  s.country,
  s.assigned_to,
  s.current_stage_id,
  s.stage_entered_at,
  s.next_followup_on,
  s.drive_folder_url,
  s.status,
  s.created_at,
  st.name as stage_name,
  st.position as stage_position,
  st.stuck_after_days,
  (public.today_ist() - (s.stage_entered_at at time zone 'Asia/Kolkata')::date) as days_in_stage,
  (s.status = 'active'
   and (public.today_ist() - (s.stage_entered_at at time zone 'Asia/Kolkata')::date) > st.stuck_after_days) as is_stuck,
  (s.status in ('active', 'on_hold') and s.next_followup_on is not null
   and s.next_followup_on < public.today_ist()) as followup_overdue,
  p.full_name as counsellor_name,
  fin.university_id as final_university_id,
  fin.university_name as final_university,
  fin.course as final_course,
  coalesce(prog.steps_total, 0)::int as steps_total,
  coalesce(prog.steps_done, 0)::int as steps_done
from public.students s
left join public.stages st on st.id = s.current_stage_id
left join public.profiles p on p.id = s.assigned_to
left join lateral (
  select sl.university_id, u.name as university_name, sl.course
  from public.shortlist sl join public.universities u on u.id = sl.university_id
  where sl.student_id = s.id and sl.is_final
  limit 1
) fin on true
left join lateral (
  select count(*) filter (where v.visible) as steps_total,
         count(*) filter (where v.visible and v.complete) as steps_done
  from public.student_step_state v
  where v.student_id = s.id and v.stage_id = s.current_stage_id and v.active
) prog on true;

-- Required, visible steps still open between the student's current stage and a target stage.
create or replace function public.stage_gate_missing(p_student uuid, p_target_stage uuid)
returns table (stage_name text, label text)
language sql stable security invoker set search_path = '' as $$
  select sg.name, v.label
  from public.students s
  join public.stages cur on cur.id = s.current_stage_id
  join public.stages tgt on tgt.id = p_target_stage
  join public.student_step_state v on v.student_id = s.id
  join public.stages sg on sg.id = v.stage_id
  where s.id = p_student
    and sg.country = s.country
    and sg.position >= cur.position and sg.position < tgt.position
    and v.active and v.required and v.visible and not v.complete
  order by sg.position, v.position
$$;

-- Move a student. Admins can skip missing steps only with a written reason.
create or replace function public.move_student_stage(p_student uuid, p_stage uuid, p_note text default null)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform set_config('syb.override_note', coalesce(p_note, ''), true);
  update public.students set current_stage_id = p_stage where id = p_student;
  if not found then
    raise exception 'Student not found' using errcode = 'P0002';
  end if;
  perform set_config('syb.override_note', '', true);
end
$$;

-- ---------------------------------------------------------------------------
-- New login -> profile
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    -- role comes from app_metadata, which only the service key can set
    case when new.raw_app_meta_data ->> 'role' = 'admin' then 'admin'::public.user_role else 'staff'::public.user_role end
  )
  on conflict (id) do nothing;
  return new;
end
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.profiles_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role or new.active is distinct from old.active
       or new.email is distinct from old.email then
      raise exception 'Only an admin can change role, status or email';
    end if;
  end if;
  -- Never leave the CRM without an active admin.
  if old.role = 'admin' and old.active and (new.role <> 'admin' or not new.active)
     and not exists (select 1 from public.profiles where id <> old.id and role = 'admin' and active) then
    raise exception 'There must be at least one active admin';
  end if;
  return new;
end
$$;
create trigger profiles_before_update before update on public.profiles
  for each row execute function public.profiles_before_update();

-- ---------------------------------------------------------------------------
-- Students
-- ---------------------------------------------------------------------------
create or replace function public.students_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.current_stage_id is null then
    select id into new.current_stage_id from public.stages
    where country = new.country and active order by position limit 1;
  end if;
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end
$$;
create trigger students_before_insert before insert on public.students
  for each row execute function public.students_before_insert();

create or replace function public.students_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.student_steps (student_id, step_id, done, value, done_at, done_by)
  select new.id, st.id,
         st.key is not distinct from 'enquiry_received',
         case when st.key = 'enquiry_received' then new.lead_source::text end,
         case when st.key = 'enquiry_received' then now() end,
         case when st.key = 'enquiry_received' then auth.uid() end
  from public.stage_steps st
  join public.stages sg on sg.id = st.stage_id
  where sg.country = new.country;

  insert into public.student_documents (student_id, document_type_id)
  select new.id, d.id from public.document_types d where d.active;

  insert into public.activity_log (student_id, author_id, kind, body, meta)
  values (new.id, auth.uid(), 'created',
          'Lead added (source: ' || replace(new.lead_source::text, '_', '-') || ')',
          jsonb_build_object('source', new.lead_source));
  return new;
end
$$;
create trigger students_after_insert after insert on public.students
  for each row execute function public.students_after_insert();

create or replace function public.students_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  old_pos int;
  new_pos int;
  missing int;
  note text;
begin
  new.updated_at := now();

  if auth.uid() is not null and not public.is_admin()
     and new.assigned_to is distinct from old.assigned_to then
    raise exception 'Only an admin can reassign a student';
  end if;

  if new.current_stage_id is distinct from old.current_stage_id then
    new.stage_entered_at := now();
    select position into old_pos from public.stages where id = old.current_stage_id;
    select position into new_pos from public.stages where id = new.current_stage_id;

    if new_pos > coalesce(old_pos, 0) then
      select count(*) into missing
      from public.student_step_state v
      join public.stages sg on sg.id = v.stage_id
      where v.student_id = new.id
        and sg.country = new.country
        and sg.position >= coalesce(old_pos, 0) and sg.position < new_pos
        and v.active and v.required and v.visible and not v.complete;

      if missing > 0 then
        note := nullif(trim(coalesce(current_setting('syb.override_note', true), '')), '');
        if not (auth.uid() is null or (public.is_admin() and note is not null)) then
          raise exception 'STAGE_GATE: % required step(s) are not done yet', missing
            using errcode = 'P0001';
        end if;
      end if;
    end if;
  end if;
  return new;
end
$$;
create trigger students_before_update before update on public.students
  for each row execute function public.students_before_update();

create or replace function public.students_after_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  from_name text;
  to_name text;
  who text;
  note text;
begin
  if new.current_stage_id is distinct from old.current_stage_id then
    select name into from_name from public.stages where id = old.current_stage_id;
    select name into to_name from public.stages where id = new.current_stage_id;
    note := nullif(trim(coalesce(current_setting('syb.override_note', true), '')), '');
    insert into public.activity_log (student_id, author_id, kind, body, meta)
    values (new.id, auth.uid(), 'stage_change',
            'Moved from ' || coalesce(from_name, '-') || ' to ' || coalesce(to_name, '-')
              || case when note is not null then '. Override: ' || note else '' end,
            jsonb_build_object('from', old.current_stage_id, 'to', new.current_stage_id, 'override', note));
  end if;

  if new.assigned_to is distinct from old.assigned_to then
    select full_name into who from public.profiles where id = new.assigned_to;
    insert into public.activity_log (student_id, author_id, kind, body, meta)
    values (new.id, auth.uid(), 'assignment',
            case when new.assigned_to is null then 'Unassigned' else 'Assigned to ' || coalesce(who, 'a counsellor') end,
            jsonb_build_object('from', old.assigned_to, 'to', new.assigned_to));
  end if;

  if new.status is distinct from old.status then
    insert into public.activity_log (student_id, author_id, kind, body, meta)
    values (new.id, auth.uid(), 'status',
            'Status changed to ' || replace(new.status::text, '_', ' ')
              || case when new.status = 'lost' and new.lost_reason is not null then ': ' || new.lost_reason else '' end,
            jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end
$$;
create trigger students_after_update after update on public.students
  for each row execute function public.students_after_update();

-- ---------------------------------------------------------------------------
-- Steps
-- ---------------------------------------------------------------------------
create or replace function public.student_steps_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.done and not old.done then
    new.done_at := now();
    new.done_by := auth.uid();
  elsif not new.done then
    new.done_at := null;
    new.done_by := null;
  end if;
  return new;
end
$$;
create trigger student_steps_before_update before update on public.student_steps
  for each row execute function public.student_steps_before_update();

create or replace function public.student_steps_after_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  st public.stage_steps;
  shown text;
begin
  if new.done is not distinct from old.done and new.value is not distinct from old.value then
    return new;
  end if;
  select * into st from public.stage_steps where id = new.step_id;

  shown := case
    when not new.done then 'not done'
    when st.kind = 'pass_fail' and new.value = 'pass' then coalesce(st.pass_label, 'Passed')
    when st.kind = 'pass_fail' and new.value = 'fail' then coalesce(st.fail_label, 'Failed')
    when st.kind = 'yes_no' then initcap(coalesce(new.value, ''))
    when st.kind in ('date', 'text') then coalesce(new.value, '')
    else 'done'
  end;

  insert into public.activity_log (student_id, author_id, kind, body, meta)
  values (new.student_id, auth.uid(), 'step', st.label || ': ' || shown,
          jsonb_build_object('step_id', st.id, 'done', new.done, 'value', new.value));

  -- Visa approved -> student is completed.
  if st.key = 'visa_result' and new.done and new.value = 'pass' then
    update public.students set status = 'completed' where id = new.student_id and status <> 'completed';
  end if;
  return new;
end
$$;
create trigger student_steps_after_update after update on public.student_steps
  for each row execute function public.student_steps_after_update();

-- Admin adds a new step later -> every existing student gets it too.
create or replace function public.stage_steps_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.student_steps (student_id, step_id)
  select s.id, new.id
  from public.students s
  join public.stages sg on sg.id = new.stage_id
  where s.country = sg.country
  on conflict do nothing;
  return new;
end
$$;
create trigger stage_steps_after_insert after insert on public.stage_steps
  for each row execute function public.stage_steps_after_insert();

-- ---------------------------------------------------------------------------
-- Shortlist: starring a final university ticks "final choice confirmed".
-- ---------------------------------------------------------------------------
create or replace function public.shortlist_sync_final() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := coalesce(new.student_id, old.student_id);
  final_name text;
begin
  select u.name into final_name
  from public.shortlist sl join public.universities u on u.id = sl.university_id
  where sl.student_id = sid and sl.is_final limit 1;

  update public.student_steps ss
  set done = final_name is not null, value = final_name
  from public.stage_steps st
  where ss.step_id = st.id and st.key = 'final_choice' and ss.student_id = sid
    and (ss.done is distinct from (final_name is not null) or ss.value is distinct from final_name);
  return null;
end
$$;
create trigger shortlist_sync_final after insert or update or delete on public.shortlist
  for each row execute function public.shortlist_sync_final();

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------
create or replace function public.document_types_after_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.active then
    insert into public.student_documents (student_id, document_type_id)
    select s.id, new.id from public.students s
    on conflict do nothing;
  end if;
  return new;
end
$$;
create trigger document_types_after_insert after insert on public.document_types
  for each row execute function public.document_types_after_insert();

create or replace function public.student_documents_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  new.checked_by := auth.uid();
  return new;
end
$$;
create trigger student_documents_before_update before update on public.student_documents
  for each row execute function public.student_documents_before_update();

create or replace function public.student_documents_after_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  doc text;
begin
  if new.status is distinct from old.status then
    select name into doc from public.document_types where id = new.document_type_id;
    insert into public.activity_log (student_id, author_id, kind, body, meta)
    values (new.student_id, auth.uid(), 'document', doc || ': ' || new.status::text,
            jsonb_build_object('document_type_id', new.document_type_id, 'status', new.status));
  end if;
  return new;
end
$$;
create trigger student_documents_after_update after update on public.student_documents
  for each row execute function public.student_documents_after_update();

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create or replace function public.payments_log() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  label text;
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  label := initcap(new.kind::text) || ' fee ' || new.amount::text || ' ' || new.currency::text;
  if tg_op = 'INSERT' then
    insert into public.activity_log (student_id, author_id, kind, body, meta)
    values (new.student_id, auth.uid(), 'payment', label || ' added (' || new.status::text || ')',
            jsonb_build_object('payment_id', new.id));
  elsif new.status is distinct from old.status then
    insert into public.activity_log (student_id, author_id, kind, body, meta)
    values (new.student_id, auth.uid(), 'payment', label || ' marked ' || new.status::text,
            jsonb_build_object('payment_id', new.id));
  end if;
  return new;
end
$$;
create trigger payments_after_insert after insert on public.payments
  for each row execute function public.payments_log();
create trigger payments_before_update before update on public.payments
  for each row execute function public.payments_log();

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------
create or replace function public.tasks_before_write() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
  end if;
  if new.done and (tg_op = 'INSERT' or not old.done) then
    new.done_at := now();
  elsif not new.done then
    new.done_at := null;
  end if;
  return new;
end
$$;
create trigger tasks_before_write before insert or update on public.tasks
  for each row execute function public.tasks_before_write();

-- ---------------------------------------------------------------------------
-- Round-robin: next active counsellor for website leads (server only).
-- ---------------------------------------------------------------------------
create or replace function public.pick_round_robin() returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  last_id uuid;
  next_id uuid;
begin
  select round_robin_last_profile_id into last_id from public.app_settings where id = 1 for update;
  select id into next_id from public.profiles
  where active and role = 'staff'
    and (last_id is null or id > last_id)
  order by id limit 1;
  if next_id is null then
    select id into next_id from public.profiles where active and role = 'staff' order by id limit 1;
  end if;
  if next_id is not null then
    update public.app_settings set round_robin_last_profile_id = next_id, updated_at = now() where id = 1;
  end if;
  return next_id;
end
$$;
