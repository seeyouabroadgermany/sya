-- SYB CRM demo data. FOR LOCAL / DEMO PROJECTS ONLY.
-- Creates 3 demo logins (password: syb-demo-2026), 5 universities and 20 students.
-- Do not run this on the live project: it adds demo logins with a known password.

-- Demo logins ---------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('00000000-0000-4000-a000-000000000001'::uuid, 'admin@syb.example', 'Nico (Admin)', 'admin'),
      ('00000000-0000-4000-a000-000000000002'::uuid, 'anjali@syb.example', 'Anjali Menon', 'staff'),
      ('00000000-0000-4000-a000-000000000003'::uuid, 'rahul@syb.example', 'Rahul Nair', 'staff')
    ) as t(id, email, full_name, role)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, reauthentication_token, phone_change, phone_change_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
      extensions.crypt('syb-demo-2026', extensions.gen_salt('bf')), now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', u.role),
      jsonb_build_object('full_name', u.full_name), now(), now(),
      '', '', '', '', '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text,
            jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
            'email', now(), now(), now());
  end loop;
end
$$;

update public.profiles set phone = '+91 98470 00001' where email = 'admin@syb.example';
update public.profiles set phone = '+91 98470 00002' where email = 'anjali@syb.example';
update public.profiles set phone = '+91 98470 00003' where email = 'rahul@syb.example';

-- Universities --------------------------------------------------------------
insert into public.universities (name, city, country) values
  ('Charles University', 'Prague', 'CZ'),
  ('Czech Technical University in Prague', 'Prague', 'CZ'),
  ('Masaryk University', 'Brno', 'CZ'),
  ('Brno University of Technology', 'Brno', 'CZ'),
  ('Palacký University Olomouc', 'Olomouc', 'CZ');

-- Students ------------------------------------------------------------------
do $$
declare
  anjali uuid := '00000000-0000-4000-a000-000000000002';
  rahul uuid := '00000000-0000-4000-a000-000000000003';
  admin_id uuid := '00000000-0000-4000-a000-000000000001';
  r record;
  sid uuid;
  v_stage uuid;
  cur_pos int;
  n_steps int;
  k int;
  uni_ids uuid[];
  i int := 0;
begin
  select array_agg(id order by name) into uni_ids from public.universities;

  for r in
    select * from (values
      -- name, phone, city, level, intake month, year, source, stage, days in stage, exam, counsellor, status, followup offset
      ('Aditya Krishnan',   '+91 94470 11201', 'Kozhikode',  'bachelor', 9, 2027, 'instagram', 1,  2, 'no',  'a', 'active',  0),
      ('Fathima Rinsha',    '+91 94470 11202', 'Malappuram', 'bachelor', 9, 2027, 'walk_in',   1,  9, 'no',  'r', 'active', -2),
      ('Sreya Raveendran',  '+91 94470 11203', 'Kannur',     'master',   2, 2027, 'website',   1,  0, 'no',  '-', 'active', null),
      ('Arjun Pillai',      '+91 94470 11204', 'Thrissur',   'master',   9, 2027, 'referral',  2,  3, 'no',  'a', 'active',  1),
      ('Nihal Basheer',     '+91 94470 11205', 'Kozhikode',  'bachelor', 9, 2027, 'whatsapp',  2, 12, 'no',  'r', 'active', -1),
      ('Gopika Suresh',     '+91 94470 11206', 'Palakkad',   'master',   2, 2027, 'instagram', 3,  4, 'no',  'a', 'active',  2),
      ('Mohammed Ashiq',    '+91 94470 11207', 'Wayanad',    'bachelor', 9, 2027, 'referral',  3,  8, 'no',  'r', 'active',  0),
      ('Devika Unnikrishnan','+91 94470 11208','Kochi',      'master',   9, 2026, 'instagram', 4,  1, 'yes', 'a', 'active',  3),
      ('Rohan Varghese',    '+91 94470 11209', 'Kottayam',   'bachelor', 9, 2026, 'walk_in',   4,  6, 'no',  'r', 'active', null),
      ('Ananya Rajesh',     '+91 94470 11210', 'Kozhikode',  'master',   9, 2026, 'website',   4, 15, 'yes', 'a', 'active', -4),
      ('Shahana Nasrin',    '+91 94470 11211', 'Malappuram', 'bachelor', 9, 2026, 'instagram', 5,  2, 'no',  'r', 'active',  1),
      ('Vishnu Prasad',     '+91 94470 11212', 'Kannur',     'master',   9, 2026, 'referral',  5,  5, 'yes', 'a', 'active',  0),
      ('Athira Mohan',      '+91 94470 11213', 'Thrissur',   'bachelor', 9, 2026, 'whatsapp',  6,  3, 'no',  'a', 'active',  4),
      ('Irfan Ali',         '+91 94470 11214', 'Kozhikode',  'master',   9, 2026, 'instagram', 6, 11, 'no',  'r', 'active', -1),
      ('Keerthana Das',     '+91 94470 11215', 'Kollam',     'master',   9, 2026, 'walk_in',   7,  2, 'no',  'a', 'active',  2),
      ('Abhinav Menon',     '+91 94470 11216', 'Kozhikode',  'bachelor', 9, 2026, 'referral',  7,  7, 'no',  'r', 'active',  0),
      ('Lakshmi Priya',     '+91 94470 11217', 'Palakkad',   'master',   9, 2026, 'instagram', 8,  4, 'no',  'a', 'active',  1),
      ('Sahil Rahman',      '+91 94470 11218', 'Kasaragod',  'bachelor', 9, 2026, 'website',   8,  1, 'no',  'r', 'active',  5),
      ('Meera Joseph',      '+91 94470 11219', 'Kochi',      'master',   2, 2026, 'referral',  8,  0, 'no',  'a', 'completed', null),
      ('Hrithik Sanjay',    '+91 94470 11220', 'Thrissur',   'bachelor', 9, 2027, 'instagram', 2, 20, 'no',  'r', 'lost', null)
    ) as t(full_name, phone, city, level, intake_month, intake_year, source, stage_pos, days_in, exam, who, status, followup)
  loop
    i := i + 1;
    insert into public.students (
      full_name, phone, whatsapp, email, city, level, intake_month, intake_year, lead_source,
      assigned_to, drive_folder_url, parent_name, parent_phone, consent_at, created_at,
      course_interest, budget_range
    ) values (
      r.full_name, r.phone, r.phone,
      lower(replace(split_part(r.full_name, ' ', 1), '''', '')) || '.' || i || '@example.com',
      r.city, r.level::public.student_level, r.intake_month, r.intake_year, r.source::public.lead_source,
      case r.who when 'a' then anjali when 'r' then rahul end,
      case when r.stage_pos >= 3 then 'https://drive.google.com/drive/folders/demo-' || i end,
      case when i % 3 = 0 then 'Parent of ' || split_part(r.full_name, ' ', 1) end,
      case when i % 3 = 0 then '+91 94950 2' || lpad(i::text, 4, '0') end,
      now(),
      now() - make_interval(days => r.stage_pos * 12 + r.days_in),
      case when r.level = 'master' then 'MSc Computer Science' else 'BSc Biomedical Engineering' end,
      case when r.level = 'master' then '₹8–12 lakh' else '₹6–9 lakh' end
    ) returning id into sid;

    -- Shortlist: shared from stage 2, final choice from stage 3 on.
    if r.stage_pos >= 2 then
      insert into public.shortlist (student_id, university_id, course, is_final) values
        (sid, uni_ids[1 + (i % 5)], case when r.level = 'master' then 'MSc Computer Science' else 'BSc Biomedical Engineering' end, r.stage_pos >= 3),
        (sid, uni_ids[1 + ((i + 2) % 5)], case when r.level = 'master' then 'MSc Data Science' else 'BSc Computer Science' end, false);
    end if;

    -- Complete every step of earlier stages.
    update public.student_steps ss
    set done = true,
        value = case st.kind
                  when 'yes_no' then r.exam
                  when 'date' then to_char(current_date - 20, 'YYYY-MM-DD')
                  when 'pass_fail' then 'pass'
                  else ss.value end
    from public.stage_steps st join public.stages sg on sg.id = st.stage_id
    where ss.step_id = st.id and ss.student_id = sid and sg.position < r.stage_pos
      and st.key is distinct from 'final_choice'
      and (st.show_if_step_id is null or r.exam = 'yes');

    -- Partly complete the current stage.
    select id into v_stage from public.stages where country = 'CZ' and position = r.stage_pos;
    select count(*) into n_steps from public.stage_steps where stage_id = v_stage;
    k := case when r.status = 'completed' then n_steps else (i % greatest(n_steps, 1)) end;
    update public.student_steps ss
    set done = true,
        value = case st.kind
                  when 'yes_no' then r.exam
                  when 'date' then to_char(current_date + 12, 'YYYY-MM-DD')
                  when 'pass_fail' then 'pass'
                  else ss.value end
    from public.stage_steps st
    where ss.step_id = st.id and ss.student_id = sid and st.stage_id = v_stage
      and st.position <= k and st.key is distinct from 'final_choice'
      and (st.show_if_step_id is null or r.exam = 'yes');

    -- Move to the stage (as the system, so the gate is skipped), then backdate.
    update public.students set current_stage_id = v_stage where id = sid;
    update public.students
    set stage_entered_at = now() - make_interval(days => r.days_in),
        next_followup_on = case when r.followup is null then null else public.today_ist() + r.followup end,
        status = r.status::public.student_status,
        lost_reason = case when r.status = 'lost' then 'Chose a university in Germany' end
    where id = sid;

    -- A couple of human notes.
    insert into public.activity_log (student_id, author_id, kind, body)
    values (sid, coalesce(case r.who when 'a' then anjali when 'r' then rahul end, admin_id), 'call',
            'Spoke with ' || split_part(r.full_name, ' ', 1) || ' about the ' || to_char(make_date(r.intake_year, r.intake_month, 1), 'Mon YYYY') || ' intake.');
  end loop;

  -- Demo payments.
  insert into public.payments (student_id, kind, amount, currency, status, due_date, paid_on)
  select s.id, 'agency', 50000, 'INR', 'paid', null, current_date - 30
  from public.student_board s where s.stage_position >= 4;
  insert into public.payments (student_id, kind, amount, currency, status, due_date, paid_on)
  select s.id, 'nostrification', 3000, 'CZK',
         case when s.stage_position >= 7 then 'paid' else 'pending' end::public.payment_status,
         current_date + 10, case when s.stage_position >= 7 then current_date - 5 end
  from public.student_board s where s.stage_position >= 6;
  insert into public.payments (student_id, kind, amount, currency, status, due_date, paid_on)
  select s.id, 'university', 4500, 'EUR',
         case when s.stage_position >= 8 then 'paid' else 'pending' end::public.payment_status,
         current_date + 14, case when s.stage_position >= 8 then current_date - 3 end
  from public.student_board s where s.stage_position >= 7;

  -- Demo tasks.
  insert into public.tasks (student_id, assigned_to, title, due_on, created_by)
  select s.id, s.assigned_to, t.title, public.today_ist() + t.offset_days, s.assigned_to
  from public.student_board s
  join (values
    ('Ananya Rajesh', 'Send entrance exam preparation material', -1),
    ('Vishnu Prasad', 'Check university confirmation mail', 0),
    ('Irfan Ali', 'Call courier about nostrification documents', 0),
    ('Keerthana Das', 'Ask for accommodation preference', 2),
    ('Lakshmi Priya', 'Confirm visa interview time', 1)
  ) as t(name, title, offset_days) on t.name = s.full_name;
end
$$;
