-- SYB CRM Phase 2: website leads, documents and payments summaries, lead form rate limit.

-- Website leads keep lead_source = 'website'; this records how they first heard about SYB.
alter table public.students add column heard_about public.lead_source;

-- Board view gets document and payment summaries (new columns are added at the end).
create or replace view public.student_board with (security_invoker = true) as
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
  coalesce(prog.steps_done, 0)::int as steps_done,
  -- new in phase 2
  s.course_interest,
  s.heard_about,
  coalesce(docs.docs_total, 0)::int as docs_total,
  coalesce(docs.docs_ready, 0)::int as docs_ready,
  coalesce(pay.payments_pending, 0)::int as payments_pending
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
) prog on true
left join lateral (
  select count(*) filter (where dt.required) as docs_total,
         count(*) filter (where dt.required and sd.status <> 'pending') as docs_ready
  from public.student_documents sd join public.document_types dt on dt.id = sd.document_type_id
  where sd.student_id = s.id and dt.active
) docs on true
left join lateral (
  select count(*) as payments_pending from public.payments pm
  where pm.student_id = s.id and pm.status = 'pending'
) pay on true;

-- Public lead form: at most 5 submissions per hour from one (hashed) IP.
-- Called only by server code with the secret key.
create or replace function public.lead_rate_limit_hit(p_ip_hash text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  recent int;
begin
  delete from public.lead_rate_limit where created_at < now() - interval '1 day';
  select count(*) into recent from public.lead_rate_limit
  where ip_hash = p_ip_hash and created_at > now() - interval '1 hour';
  if recent >= 5 then
    return true;
  end if;
  insert into public.lead_rate_limit (ip_hash) values (p_ip_hash);
  return false;
end
$$;
revoke execute on function public.lead_rate_limit_hit(text) from public, anon, authenticated;
grant execute on function public.lead_rate_limit_hit(text) to service_role;

-- pick_round_robin is server-only too.
revoke execute on function public.pick_round_robin() from public, anon, authenticated;
grant execute on function public.pick_round_robin() to service_role;

-- Marking a payment paid fills in today's date if none was given; pending clears it.
create or replace function public.payments_paid_on() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'paid' and new.paid_on is null then
    new.paid_on := public.today_ist();
  elsif new.status = 'pending' then
    new.paid_on := null;
  end if;
  return new;
end
$$;
create trigger payments_paid_on before insert or update on public.payments
  for each row execute function public.payments_paid_on();

-- Removing a payment is part of the history too.
create or replace function public.payments_after_delete() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.students where id = old.student_id) then
    insert into public.activity_log (student_id, author_id, kind, body, meta)
    values (old.student_id, auth.uid(), 'payment',
            initcap(old.kind::text) || ' fee ' || old.amount::text || ' ' || old.currency::text || ' removed',
            jsonb_build_object('payment_id', old.id));
  end if;
  return old;
end
$$;
create trigger payments_after_delete after delete on public.payments
  for each row execute function public.payments_after_delete();
