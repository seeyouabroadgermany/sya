# SYB CRM

Internal CRM for **See You Abroad**, Kozhikode. It tracks every student going to a Czech university, from first enquiry to visa result.

- **Stack:** Next.js 16 (App Router, TypeScript), Tailwind CSS v4, shadcn/ui, Supabase (Postgres, Auth, Row Level Security), hosted on Vercel.
- **No files are stored.** Only text, numbers, dates and one Google Drive folder link per student.
- **Roles:** admin sees everything. Counsellors (staff) see only the students assigned to them. The database enforces this, not just the app.

See `PLAN.md` for the full plan and the decisions behind it.

---

## Run it on your computer

You need Node.js 20+ and Docker Desktop (for the local database).

```bash
npm install
npm run db:start        # starts a local Supabase in Docker (first time takes a few minutes)
npm run db:reset        # creates the tables, the 8 Czech stages and demo data
cp .env.example .env.local
```

`npm run db:start` prints a **Publishable key** and a **Secret key**. Put them into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

```bash
npm run dev             # open http://localhost:3000
```

Demo logins (local only), password `syb-demo-2026`:

| Email | Role |
|---|---|
| admin@syb.example | Admin |
| anjali@syb.example | Counsellor |
| rahul@syb.example | Counsellor |

Emails sent locally (password resets, invites) appear in Mailpit at http://127.0.0.1:54324.

Useful commands:

| Command | What it does |
|---|---|
| `npm run db:test` | Runs the security checks (staff can't see other students, stage gate, etc.) |
| `npm run db:types` | Regenerates `src/types/database.ts` after a schema change |
| `npm run lint` / `npm run typecheck` / `npm run build` | Code checks |

---

## Go live: step by step

### 1. Create the Supabase project (Mumbai)

1. Go to https://supabase.com and sign in (use a company email so the account isn't tied to one person).
2. Click **New project**.
3. Name: `syb-crm`. Database password: click **Generate a password** and save it in your password manager.
4. Region: **South Asia (Mumbai)**. Plan: **Free** is fine to start.
5. Click **Create new project** and wait about 2 minutes.

### 2. Create the tables

Pick **one** of these.

**Option A, with the command line (recommended):**

1. In Supabase, open **Project Settings → General** and copy the **Project ID**.
2. In the project folder run:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_ID
   npx supabase db push
   ```
   This runs every file in `supabase/migrations` in order.

**Option B, by copy and paste:**

1. In Supabase, open **SQL Editor → New query**.
2. Open `supabase/migrations/20261026000001_schema.sql`, copy everything, paste it, click **Run**.
3. Do the same for `…000002_functions.sql`, then `…000003_rls.sql`, then `…000004_pipeline_cz.sql`, in that order.

> Do **not** run `supabase/seed.sql` on the live project. It creates demo logins with a known password. Use it only on a separate test project.

### 3. Set up login

In Supabase, open **Authentication**:

1. **Sign In / Providers**:
   - Turn **off** "Allow new users to sign up". Only the admin adds staff.
   - Leave the **Email** provider **on** (turning it off would block all logins).
   - Recommended: under Email, set a minimum password length of 8.
2. **URL Configuration**:
   - **Site URL**: your live address, e.g. `https://syb-crm.vercel.app` (update it after step 5 if you don't know it yet).
   - **Redirect URLs**: add `https://syb-crm.vercel.app/**` (and `http://localhost:3000/**` for local testing).
3. **Emails → Templates**:
   - **Reset Password**: replace the message body with the contents of `supabase/templates/recovery.html`.
   - **Invite user**: replace the message body with `supabase/templates/invite.html`.

   These make the links open the CRM's own "choose a password" page.

> Supabase's built-in email sender only allows a few emails per hour. That's fine for password resets in a small team. For more, connect your own email sender under **Project Settings → Authentication → SMTP** (we'll set up Resend in Phase 2; it has a free tier).

### 4. Copy the keys (environment variables)

In Supabase, open **Project Settings → API Keys** and **Project Settings → Data API**:

| Variable | Where to find it | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Data API → Project URL | No |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | API Keys → Publishable key (`sb_publishable_…`) | No, safe in the browser |
| `SUPABASE_SECRET_KEY` | API Keys → Secret keys → reveal (`sb_secret_…`) | **Yes.** Server only. Never share it, never commit it |
| `NEXT_PUBLIC_SITE_URL` | Your live address, e.g. `https://syb-crm.vercel.app` | No |
| `RESEND_API_KEY` | Optional, see step 7 | **Yes** |
| `EMAIL_FROM` | Optional, see step 7 | No |

Put them in `.env.local` on your computer (this file is ignored by git) and in Vercel (next step). The last two are optional.

### 5. Push to GitHub and deploy on Vercel

1. Push this project to your GitHub repository (it's already set up as a git repo).
2. Go to https://vercel.com, sign in with GitHub.
3. Click **Add New… → Project**, pick the `sya` repository, click **Import**.
4. Framework is detected as **Next.js**. Leave build settings as they are.
5. Open **Environment Variables** and add the 4 variables from step 4 (all environments).
6. Click **Deploy**. When it finishes, you get an address like `https://sya-xxxx.vercel.app`.
7. Copy that address back into Supabase **Site URL** and **Redirect URLs** (step 3.2), and into the Vercel variable `NEXT_PUBLIC_SITE_URL`, then click **Redeploy** in Vercel.
8. Optional: in Vercel **Settings → Functions**, set the region to **Mumbai (bom1)** so the app sits next to the database.

> Vercel's free Hobby plan is meant for non-commercial use. For the business, Vercel Pro is about $20/month. Your decision; nothing paid is required to test.

### 6. Create the first admin

**Option A, script (on your computer, with `.env.local` pointing at the live project):**

```bash
npm run create-admin -- founder@seeyouabroad.in "Nico"
```

It asks you to type a password, then creates the admin. Running it for an existing login turns that login into an admin.

**Option B, in the Supabase dashboard:**

1. **Authentication → Users → Add user → Create new user**. Enter email and password, tick **Auto Confirm User**.
2. **SQL Editor → New query**, run (with the right email):
   ```sql
   update public.profiles set role = 'admin' where email = 'founder@seeyouabroad.in';
   ```

Then sign in at your Vercel address. Staff invites from inside the CRM arrive in Phase 3; until then, add staff the same way as Option B without the SQL (new users are counsellors by default).

### 7. Optional: email counsellors when they get a new student

The CRM emails a counsellor when a lead is assigned to them (one at a time, in bulk, or automatically). This uses Resend, which is free for a small team. Without it everything else works; emails are just skipped.

1. Sign up at https://resend.com (free plan).
2. **Domains → Add domain**, enter your domain (e.g. `seeyouabroad.in`), and add the DNS records it shows at your domain provider. Wait until it says **Verified**.
3. **API Keys → Create API key** (permission: Sending access). Copy it.
4. In Vercel **Settings → Environment Variables** add:
   - `RESEND_API_KEY` = the key
   - `EMAIL_FROM` = `SYB CRM <crm@seeyouabroad.in>` (any address on the verified domain)
5. Redeploy.

### 8. Share the enquiry form

The public form is at `https://YOUR-ADDRESS/apply`. Put that link in your Instagram bio, WhatsApp status and website. New enquiries appear in **New leads** for the admin. Turn on **Auto-assign website leads** there to share them among counsellors in turn.

The form has a consent checkbox (India's DPDP Act), a hidden spam trap, and a limit of 5 enquiries per hour from one connection.

---

## How the security works

- Every table has Row Level Security. A counsellor's database session can only read or change students where `assigned_to` is their own id, plus those students' steps, documents, payments, tasks and history.
- Anonymous visitors have no access to any table. The public `/apply` form writes through server code, with a spam trap and a rate limit.
- The secret key is only used in server files marked `server-only`. It is never sent to the browser.
- Stage moves are checked in the database: a student can't move forward until every required, visible step is done. Admin can override with a written reason, which is saved in the history.
- Every stage change, step tick, payment change and reassignment is written to `activity_log` by database triggers, with who did it and when.
- Run `npm run db:test` to check all of this against the local database.
