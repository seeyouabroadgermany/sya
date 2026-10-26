# SYB CRM – Build Plan

Internal CRM for **See You Abroad** (Kozhikode, Kerala). It tracks every student going to a Czech university, from first enquiry to visa result.

Sources: *Requirements Brief* (source of truth for stages and sub-steps), *Implementation Plan* (main spec, including its "Build prompt"), and the logo.

---

## 1. Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router) + TypeScript, Server Components + Server Actions |
| UI | Tailwind CSS v4 + shadcn/ui, lucide icons |
| Data, login | Supabase: Postgres, Auth, Row Level Security. **No Storage bucket.** |
| Supabase client | `@supabase/ssr` (cookie sessions), generated DB types |
| Kanban | dnd-kit (touch + mouse) |
| Tables | TanStack Table |
| Charts | Recharts |
| Validation | zod on every server action |
| Export | SheetJS (installed from the official SheetJS CDN tarball, see §8) |
| Email | Resend (free tier) |
| Scheduled jobs | Vercel Cron, once a day at 08:00 IST |
| Phone use | PWA manifest + icons (add to home screen) |
| Hosting | Vercel + Supabase project in Mumbai (ap-south-1) |

---

## 2. Folder structure

```
sya/
├─ .claude/skills/              frontend-design, webapp-testing
├─ public/
│  ├─ logo.png                  original logo (black on white)
│  ├─ logo-dark.png / logo-light.png   transparent variants made from it
│  └─ icons/                    PWA icons
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/
│  │  ├─ 0001_schema.sql        tables, enums, indexes
│  │  ├─ 0002_functions.sql     helpers (is_admin), triggers, views
│  │  ├─ 0003_rls.sql           Row Level Security policies
│  │  └─ 0004_pipeline_cz.sql   8 Czech stages + every sub-step + document types
│  └─ seed.sql                  demo data: 2 staff, 5 universities, 20 students
├─ scripts/
│  ├─ create-admin.ts           makes the first admin (uses service key, run locally)
│  └─ seed-demo-users.ts        creates the 2 demo staff logins on a hosted project
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login, forgot-password, reset-password
│  │  ├─ apply/                 public lead form (no login)
│  │  ├─ (app)/                 logged-in shell: sidebar / bottom tab bar
│  │  │  ├─ pipeline/           kanban (home)
│  │  │  ├─ leads/              new-leads inbox (admin)
│  │  │  ├─ students/           table + filters + export
│  │  │  ├─ students/[id]/      profile: Progress, Details, Documents, Payments, Activity
│  │  │  ├─ tasks/              "Today"
│  │  │  ├─ payments/
│  │  │  ├─ dashboard/
│  │  │  └─ settings/           staff, stages & steps, documents, universities, templates, assignment
│  │  ├─ api/cron/daily/        stuck alerts + digest emails (protected by CRON_SECRET)
│  │  └─ manifest.ts
│  ├─ components/ui/            shadcn components
│  ├─ components/…              app components (StudentCard, StageRail, StepRow…)
│  ├─ lib/supabase/             server.ts, client.ts, admin.ts (service key, server-only)
│  ├─ lib/actions/              server actions, one file per area
│  ├─ lib/format.ts             DD MMM YYYY dates, INR/CZK/EUR money
│  └─ types/database.ts         generated Supabase types
├─ vercel.json                  cron schedule
├─ .env.example                 names only, no values
└─ README.md                    setup, env vars, deploy, first admin
```

---

## 3. Database schema

All tables have `id uuid` (except `profiles`, keyed by the auth user) and `created_at`. Money is `numeric(12,2)`.

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | id (= auth.users.id), full_name, email, phone, role `admin\|staff`, active, avatar_color | Created by trigger when a user is invited |
| `stages` | country (default `CZ`), name, position, stuck_after_days (default 7), active | 8 Czech rows. Other countries later = new rows |
| `stage_steps` | stage_id, label, kind `tick\|yes_no\|date\|pass_fail\|text`, required, position, show_if_step_id, show_if_value, pass_label, fail_label | `pass_label/fail_label` let the visa result say "Approved / Rejected" and the exam say "Passed / Failed" |
| `students` | full_name, phone, whatsapp, email, city, level `bachelor\|master`, intake_month, intake_year, course_interest, budget_range, lead_source `instagram\|referral\|walk_in\|website\|whatsapp\|other`, referred_by, assigned_to, current_stage_id, stage_entered_at, next_followup_at, drive_folder_url, parent_name, parent_phone, status `active\|on_hold\|lost\|completed`, lost_reason, consent_at, is_stuck | One record per student |
| `student_steps` | student_id, step_id, done, value, done_at, done_by | unique (student_id, step_id) |
| `universities` | name, city, country | |
| `shortlist` | student_id, university_id, course, is_final | Only one `is_final` per student (partial unique index) |
| `document_types` | name, required, position | Passport, 10th, 12th, Degree, Transcripts, PCC, Photos, Bank statement |
| `student_documents` | student_id, document_type_id, status `pending\|received\|verified`, checked_by, updated_at | Tick list only, no files |
| `payments` | student_id, kind `agency\|university\|nostrification\|other`, amount, currency `INR\|CZK\|EUR`, status `pending\|paid`, due_date, paid_on, note | |
| `tasks` | student_id (nullable), assigned_to, title, due_at, done, done_at, created_by | Snooze = move `due_at` |
| `activity_log` | student_id, author_id, kind `note\|stage_change\|step\|payment\|call\|whatsapp\|email\|assignment\|document`, body, meta jsonb | Written by triggers + notes |
| `app_settings` *(extra)* | single row: round_robin_enabled, round_robin_last_profile_id, digest_enabled | Needed for the round-robin toggle |
| `message_templates` *(extra)* | name, body with `{name}`, `{exam_date}`, `{visa_date}`, `{amount}`… | WhatsApp templates (Phase 3) |
| `lead_rate_limit` *(extra)* | ip_hash, created_at | Free rate-limit for `/apply`, no Redis |

**Triggers (database, so they can't be skipped by the app):**
- On `students.current_stage_id` change → set `stage_entered_at = now()`, clear `is_stuck`, log `stage_change`.
- On `student_steps` done/value change → log `step`.
- On `payments.status` change → log `payment`.
- On `students.assigned_to` change → log `assignment`.
- On new student → create `student_steps` rows for every step and `student_documents` rows for every document type; tick "Enquiry received" with the lead source as its value.
- `updated_at` maintenance.

**Stage gate** (Postgres function `can_advance(student_id)`): a student can move forward only when every *required and visible* step of the current stage is done. Admin can override, but must write a note (logged). Moving backward is always allowed (logged).

**Row Level Security (every table):**
- `is_admin()` helper (security definer) reads `profiles.role`.
- `students`: admin all; staff `select/update` where `assigned_to = auth.uid()`; staff `insert` only with `assigned_to = auth.uid()`; only admin can delete or reassign.
- `student_steps`, `student_documents`, `payments`, `shortlist`, `tasks`, `activity_log`: same rule through the parent student (`exists (… students where id = student_id and assigned_to = auth.uid())`). Tasks also visible if `tasks.assigned_to = auth.uid()`. Activity log is insert-only (no edits or deletes) for staff.
- `stages`, `stage_steps`, `document_types`, `universities`, `message_templates`: everyone logged in reads; only admin writes.
- `profiles`: everyone reads names (needed for avatars); users edit own name/phone; only admin changes role/active.
- `app_settings`, `lead_rate_limit`: admin / server only.
- Anonymous visitors get **no** table access. The `/apply` form writes through a server action using the service key on the server only.

---

## 4. Screens

Desktop: left sidebar (logo, Pipeline, Tasks, Students, Leads*, Payments, Dashboard, Settings*). Phone (<768px): bottom tab bar — Pipeline, Tasks, **+ Lead** (raised blue button), Students, More. (* admin only)

1. **Login** – email + password, forgot/reset password, logo. No sign-up.
2. **Pipeline** (home) – one column per stage with count and a thin progress line for "how far along the 8 stages". Cards: name, final university, intake, counsellor avatar, step progress (3/5), days in stage, amber border when stuck, red dot when follow-up overdue. Drag to move (blocked with a clear message if required steps are missing). Filters: intake, university, counsellor, level, stuck only. Phone: stage chips scroll sideways, one column at a time; moving is done with a "Move to…" sheet on the card (dragging across hidden columns doesn't work on a phone).
3. **Student profile** – header with stage, counsellor, Call / WhatsApp (wa.me) / Email / Drive folder buttons, and the next follow-up picker always visible. Tabs:
   - *Progress*: all 8 stages as a vertical stepper; the current one opens with its checklist. Conditional steps (exam) appear only when "Interview or entrance exam required?" is Yes. Exam failed / visa rejected → prompt: retry, change university, or mark lost.
   - *Details*: editable fields, parent contact, shortlist with a "final choice" star.
   - *Documents*: checklist pending → received → verified. No uploads; Drive link button.
   - *Payments*: list + paid/pending totals per currency.
   - *Activity*: add note / log call / log WhatsApp; full history timeline.
4. **+ Lead quick form** – 6 fields (name, phone, WhatsApp same-as-phone, level, intake, source). Works as a phone sheet.
5. **New leads inbox** (admin) – unassigned students from `/apply`; assign a counsellor in one tap, or bulk assign. Assigned counsellor gets an email.
6. **Tasks / Today** – overdue follow-ups, today's follow-ups, stuck students, tasks. One tap: done or snooze (tomorrow / 3 days / next week).
7. **Students** – searchable table with all filters + status; admin bulk assign; export current view to CSV/Excel.
8. **Payments** – all payments with totals (paid vs pending) by kind and currency; filter by intake.
9. **Dashboard** – new leads this month, conversion lead → application → visa, students per stage, visas approved/rejected, by intake and month, leads by source, counsellor leaderboard. Staff see their own numbers only.
10. **Settings** (admin) – staff (invite, deactivate, role), stages & steps (add, rename, reorder, required, stuck days, show-if), document types, universities, WhatsApp templates, round-robin toggle.
11. **/apply** (public) – SYB-branded, mobile-first form with DPDP consent checkbox, honeypot field and rate limit. Shows a thank-you screen.

Everywhere: empty states that say what to do, loading skeletons, toasts, DD MMM YYYY dates, ₹ / Kč / € formatting, tabular numbers.

---

## 5. Design direction (frontend-design skill)

The brief pins most of the look, so I follow it exactly: dark-first, black + one blue, Inter, 12px card radius / 8px inputs, 1px borders, no shadows in dark mode, no gradients, no emoji.

- **Colour tokens**: exactly the plan's tokens (`--bg #0A0A0B`, `--surface #121418`, `--surface-2 #1A1D24`, `--border #262B35`, `--text #F5F7FA`, `--muted #8B94A5`, success / warning / danger), with light-mode equivalents. Blue is used only for primary actions, links, active nav, focus rings and the *current* stage. Everything else stays neutral.
- **Type**: Inter with tabular figures; scale 12 / 14 / 16 / 20 / 28. Sentence case everywhere, no all-caps labels.
- **The one memorable element**: the **route rail** — the student's journey drawn as a thin line with 8 stops (taken from the eye in the logo: a small open circle for each stage). Done stops are filled white/black, the current stop is the brand blue ring, later stops are hollow. It appears small on every kanban card, larger in the profile header, and as the vertical stepper in the Progress tab. It is real information (the 8 stages are a real sequence), not decoration.
- **Restraint**: no hover animations on every card, no gradient washes, no shadow stacks. Motion only when someone acts (card drops into a column, a step ticks, a sheet opens). `prefers-reduced-motion` respected. Visible keyboard focus.
- **Logo**: top of sidebar, login page, `/apply`. White version on dark, black on light.

---

## 6. Build phases

Each phase ends with: run the app, click through every screen at 1440px and 375px with Playwright, fix what's broken or ugly, commit, and give you a plain-English summary.

**Phase 1 – Foundation and daily work**
Project setup, theme + light/dark toggle, logo variants, auth (login, forgot/reset password), roles, all migrations + RLS + triggers, the 8 stages with every sub-step, seed data, app shell (sidebar + bottom tab bar), Pipeline kanban with drag + stage gate, Student profile (Progress, Details, Activity), follow-ups, Tasks/Today page, + Lead form.

**Phase 2 – Leads and operations**
`/apply` public form + new-leads inbox + assign (with email), Documents checklist, Payments (per student + Payments page), stuck alerts, Students table with all filters, bulk assign, CSV/Excel export.

**Phase 3 – Insight and control**
Dashboard, Settings (staff invite/deactivate, stages/steps editor, document types, universities, templates, round-robin), daily cron + email digest, WhatsApp templates on the student page, PWA, weekly backup GitHub Action, admin 2FA, README with deploy steps.

**Testing without your Supabase yet**: I will run a local Supabase (Docker, via the Supabase CLI) inside this environment if Docker is available, so migrations, RLS and the UI are tested against a real database. If Docker isn't available here, I'll test SQL against a plain local Postgres and the UI against it with the same schema, and say clearly what was and wasn't tested.

---

## 7. Hosting and connection

No Supabase or Vercel tools are connected to this session, so I'll give you exact click-by-click steps in the README (Supabase project in Mumbai, running migrations, env vars for `.env.local` and Vercel, GitHub → Vercel deploy, creating the first admin). Secret keys (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`) are only read in server-only files and are never committed; `.env*` is git-ignored.

---

## 8. Things that are unclear or conflict — please confirm

1. **The logo has no blue.** I checked every pixel: it is pure black (#000000) on white, with no coloured pixels at all. So there is no "exact blue" to extract. Options:
   - (a) Keep the plan's placeholder blue `#1E5EFF` (light mode `#1A4FE0`) — my default if you don't say otherwise.
   - (b) Send me your brand blue hex (or a colour version of the logo / SVG) and I'll swap it in one place.
   The black is `#000000`. I'll use true black for the logo and keep the plan's `#0A0A0B` page background.
2. **Logo file quality.** It's a 360×360 JPG with a white background. I'll make transparent black and white versions from it, but a **PNG or SVG with transparent background** would look sharper on retina screens and in PWA icons.
3. **Next.js version.** The plan says Next.js 15; the current stable is **16**. I plan to use 16 (newer, longer support). Say if you need 15.
4. **File storage.** The plan's architecture diagram mentions "Supabase Storage" and the brief says "upload or tick" for documents, but the build prompt and your instructions say never store files. I'm following **no files**: tick list + Google Drive folder link only.
5. **Which steps are required?** Neither file says. My default: every step is required, except the exam steps, which are required only when "exam required = Yes". Admin can change this in Settings.
6. **Stage 1 "Enquiry received"** — I'll tick it automatically when the student is created, with the lead source as its value.
7. **Stage 2 "Final choice confirmed"** — I'll tie it to the shortlist: it can be ticked only once a university is starred as final.
8. **Visa result** — the brief says approved / rejected (not pass / fail). I've added custom labels for pass/fail steps to cover this. When the visa is approved, the student's status becomes **completed**.
9. **Staff adding leads** — under RLS, staff can only see students assigned to them, so a lead added by a counsellor is **assigned to that counsellor automatically**. Admin can reassign.
10. **Stuck days** — default 7 days for every stage (plan's open question). Editable per stage.
11. **Currency** — default INR for agency fee, CZK for university and nostrification fees; changeable per payment. (Plan's open question.)
12. **Small naming differences between the plan's table and the build prompt** (`documents` vs `student_documents`, `due_date` vs `due_at`, step kinds with/without `text`). I'm following the build prompt.
13. **Three extra small tables** not in the plan's "twelve tables": `app_settings` (round-robin toggle), `message_templates` (WhatsApp templates), `lead_rate_limit` (free anti-spam for `/apply`). No paid service needed.
14. **SheetJS** — the `xlsx` package on npm is outdated (0.18.5, with known security issues). I'll install it from SheetJS's official download (`https://cdn.sheetjs.com`), which is free and current.
15. **Emails (Resend)** — free, but to send to your team's addresses Resend needs a **verified domain** (e.g. seeyouabroad.in, DNS records). Until then it can only send to the Resend account owner's address. Emails are optional: the app works without the key and just skips sending.
16. **Vercel plan** — Vercel's free Hobby plan is officially for non-commercial use; the plan suggests Pro ($20/month) in production. I won't add anything paid — your call when you go live. Daily cron works on Hobby.
17. **Weekly backup** — the architecture shows a weekly GitHub Action export "to a separate storage account". Free option: a GitHub Action that runs `pg_dump` weekly and saves the file as a private, encrypted workflow artifact (kept 90 days). Any external storage account would be a new service — I'll ask first.
18. **Demo staff logins in the seed** — Supabase logins can't be created by plain SQL on a hosted project, so the 2 demo staff are created by a small script (`scripts/seed-demo-users.ts`) and the SQL seed attaches demo students to them.
19. **Supabase free tier pauses after a week with no activity** and has no automatic backups (plan notes this). Fine while testing; Pro ($25/month) when live — your decision.

**Testing note (Step 0):** Python Playwright installed fine. I did **not** run `playwright install chromium`, because this environment already has Chromium pre-installed and installing another copy can conflict with it. Test scripts point Playwright at the existing browser (`/opt/pw-browsers/chromium`). On your own computer, `pip install playwright && playwright install chromium` is the normal way.

---

**Waiting for your OK** (and answers to 1, 3 and anything above you disagree with) before starting Phase 1.
