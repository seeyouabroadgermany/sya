-- SYB CRM Phase 3: settings editing, two-step login for admins.

-- Admin rights need the second login step once a 2FA app is set up for that account.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active and role = 'admin')
     and (coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
          or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified'))
$$;

-- Reorder helpers for Settings. Positions follow the order of the ids given.
-- They run with the caller's rights, so RLS keeps them admin-only.
create or replace function public.reorder_stages(p_ids uuid[]) returns void
language sql security invoker set search_path = '' as $$
  update public.stages s set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where s.id = o.id;
$$;

create or replace function public.reorder_steps(p_ids uuid[]) returns void
language sql security invoker set search_path = '' as $$
  update public.stage_steps s set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where s.id = o.id;
$$;

create or replace function public.reorder_document_types(p_ids uuid[]) returns void
language sql security invoker set search_path = '' as $$
  update public.document_types d set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where d.id = o.id;
$$;

create or replace function public.reorder_templates(p_ids uuid[]) returns void
language sql security invoker set search_path = '' as $$
  update public.message_templates t set position = o.ord
  from unnest(p_ids) with ordinality as o(id, ord)
  where t.id = o.id;
$$;

-- A stage can only be hidden when no open student is in it.
create or replace function public.stages_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.active and not new.active and exists (
    select 1 from public.students where current_stage_id = old.id and status in ('active', 'on_hold')
  ) then
    raise exception 'STAGE_IN_USE: move the students out of this stage before hiding it';
  end if;
  return new;
end
$$;
create trigger stages_before_update before update on public.stages
  for each row execute function public.stages_before_update();

-- Special steps the app relies on (final choice, exam, visa result) can't be hidden or retyped.
create or replace function public.stage_steps_protect_keys() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.key is not null and (not new.active or new.kind <> old.kind) then
    raise exception 'STEP_LOCKED: this step is used by the CRM and can only be renamed';
  end if;
  return new;
end
$$;
create trigger stage_steps_protect_keys before update on public.stage_steps
  for each row execute function public.stage_steps_protect_keys();

grant execute on function public.reorder_stages(uuid[]), public.reorder_steps(uuid[]),
  public.reorder_document_types(uuid[]), public.reorder_templates(uuid[]) to authenticated;

-- True when this login has two-step turned on but hasn't entered the code yet (app shows the code page).
create or replace function public.mfa_code_needed() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') <> 'aal2'
     and exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
$$;
revoke execute on function public.mfa_code_needed() from public, anon;
grant execute on function public.mfa_code_needed() to authenticated;
