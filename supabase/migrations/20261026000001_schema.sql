-- SYB CRM: core schema
-- Text, numbers, dates and a Google Drive link only. No files are ever stored.

create type public.user_role as enum ('admin', 'staff');
create type public.student_level as enum ('bachelor', 'master');
create type public.lead_source as enum ('instagram', 'referral', 'walk_in', 'website', 'whatsapp', 'other');
create type public.student_status as enum ('active', 'on_hold', 'lost', 'completed');
create type public.step_kind as enum ('tick', 'yes_no', 'date', 'pass_fail', 'text');
create type public.doc_status as enum ('pending', 'received', 'verified');
create type public.payment_kind as enum ('agency', 'university', 'nostrification', 'other');
create type public.currency_code as enum ('INR', 'CZK', 'EUR');
create type public.payment_status as enum ('pending', 'paid');
create type public.activity_kind as enum (
  'note', 'call', 'whatsapp', 'email',
  'stage_change', 'step', 'payment', 'document', 'assignment', 'status', 'created'
);

-- "Today" for the team is always India time.
create or replace function public.today_ist() returns date
language sql stable as $$ select (now() at time zone 'Asia/Kolkata')::date $$;

-- Team members, one row per login.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  role public.user_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Pipeline stages. Other countries later are just new rows.
create table public.stages (
  id uuid primary key default gen_random_uuid(),
  country text not null default 'CZ',
  name text not null check (length(trim(name)) > 0),
  position int not null,
  stuck_after_days int not null default 7 check (stuck_after_days between 1 and 365),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint stages_country_position_key unique (country, position) deferrable initially deferred
);

-- Sub-steps inside a stage.
create table public.stage_steps (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.stages (id) on delete cascade,
  label text not null check (length(trim(label)) > 0),
  kind public.step_kind not null default 'tick',
  required boolean not null default true,
  position int not null,
  -- Only show this step when another step has a given value (Stage 4 exam branch).
  show_if_step_id uuid references public.stage_steps (id) on delete set null,
  show_if_value text,
  -- Labels for pass_fail steps, e.g. Passed/Failed or Approved/Rejected.
  pass_label text,
  fail_label text,
  -- Stable name the app uses for special steps (enquiry_received, final_choice, exam_required...).
  key text unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index stage_steps_stage_idx on public.stage_steps (stage_id, position);

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  city text,
  country text not null default 'CZ',
  created_at timestamptz not null default now(),
  constraint universities_name_key unique (name)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  phone text,
  whatsapp text,
  email text,
  city text,
  level public.student_level,
  intake_month smallint check (intake_month between 1 and 12),
  intake_year smallint check (intake_year between 2020 and 2100),
  course_interest text,
  budget_range text,
  lead_source public.lead_source not null default 'other',
  referred_by text,
  country text not null default 'CZ',
  assigned_to uuid references public.profiles (id) on delete set null,
  current_stage_id uuid references public.stages (id),
  stage_entered_at timestamptz not null default now(),
  next_followup_on date,
  drive_folder_url text check (drive_folder_url is null or drive_folder_url ~* '^https://'),
  parent_name text,
  parent_phone text,
  status public.student_status not null default 'active',
  lost_reason text,
  consent_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index students_assigned_idx on public.students (assigned_to);
create index students_stage_idx on public.students (current_stage_id);
create index students_status_idx on public.students (status);
create index students_followup_idx on public.students (next_followup_on);
create index students_created_idx on public.students (created_at desc);

-- Tick status of every step for every student.
create table public.student_steps (
  student_id uuid not null references public.students (id) on delete cascade,
  step_id uuid not null references public.stage_steps (id) on delete cascade,
  done boolean not null default false,
  value text,
  done_at timestamptz,
  done_by uuid references public.profiles (id) on delete set null,
  primary key (student_id, step_id)
);
create index student_steps_step_idx on public.student_steps (step_id);

create table public.shortlist (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  university_id uuid not null references public.universities (id) on delete restrict,
  course text,
  is_final boolean not null default false,
  created_at timestamptz not null default now()
);
create index shortlist_student_idx on public.shortlist (student_id);
create unique index shortlist_one_final on public.shortlist (student_id) where is_final;

create table public.document_types (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  required boolean not null default true,
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint document_types_name_key unique (name)
);

-- Checklist only. Files stay in the student's Google Drive folder.
create table public.student_documents (
  student_id uuid not null references public.students (id) on delete cascade,
  document_type_id uuid not null references public.document_types (id) on delete cascade,
  status public.doc_status not null default 'pending',
  checked_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (student_id, document_type_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  kind public.payment_kind not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency public.currency_code not null default 'INR',
  status public.payment_status not null default 'pending',
  due_date date,
  paid_on date,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_student_idx on public.payments (student_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students (id) on delete cascade,
  assigned_to uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  due_on date not null default public.today_ist(),
  done boolean not null default false,
  done_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index tasks_assignee_idx on public.tasks (assigned_to, done, due_on);
create index tasks_student_idx on public.tasks (student_id);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  kind public.activity_kind not null,
  body text not null default '',
  meta jsonb not null default '{}'::jsonb,
  -- clock_timestamp keeps several events from one save in the right order
  created_at timestamptz not null default clock_timestamp()
);
create index activity_student_idx on public.activity_log (student_id, created_at desc);

-- Single-row app settings.
create table public.app_settings (
  id int primary key default 1 check (id = 1),
  round_robin_enabled boolean not null default false,
  round_robin_last_profile_id uuid references public.profiles (id) on delete set null,
  digest_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (1);

-- WhatsApp message templates. Placeholders like {name}, {exam_date}.
create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  body text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Free rate limit for the public lead form (hashed IPs only).
create table public.lead_rate_limit (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index lead_rate_limit_idx on public.lead_rate_limit (ip_hash, created_at desc);
