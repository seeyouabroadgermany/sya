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

Emails sent locally (password resets) appear in Mailpit at http://127.0.0.1:54324. Emails the CRM itself sends (assignments, daily digest) are saved as HTML files in `.email-previews/` while developing. To try the daily email locally, add `CRON_SECRET=anything` to `.env.local` and run `curl -H "Authorization: Bearer anything" http://localhost:3000/api/cron/daily`.

The app opens in the light theme; anyone can switch to dark mode from the menu.

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

**Option B, by copy and paste (no installs needed):**

1. In GitHub, open `supabase/setup/all-in-one.sql` and click **Raw**, then select all and copy.
2. In Supabase, open **SQL Editor → New query**, paste, click **Run**. It should say "Success. No rows returned".
3. Check: **Table Editor → stages** shows 8 rows (Lead / Counselling … Visa).

Run it once, on a new project. (`all-in-one.sql` is every file in `supabase/migrations` joined together; after adding a migration, run `npm run db:bundle` to rebuild it.)

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
3. **Emails → Templates** (this changes the "forgot password" email so its link opens the CRM's own "choose a password" page):
   1. Click the **Reset Password** template.
   2. **Subject**: `Reset your SYB CRM password`
   3. **Message body**: delete what's there and paste everything from `supabase/templates/recovery.html`.
   4. Click **Save**.
   5. Optional: do the same for **Invite user** with `supabase/templates/invite.html`. The CRM's own **Settings → Team → Invite someone** doesn't use this template; it only matters if you ever invite people from the Supabase dashboard.

   The link in the email uses the **Site URL** from step 3.2, so set that to your real CRM address first.

4. **Own email sender (recommended once you go live).** Supabase's built-in sender is for testing: it sends only a few emails per hour and may refuse addresses outside your Supabase team. Connect Resend (free tier) so password-reset emails reach everyone:
   1. Do step 7 first (Resend account, verified domain, API key). You can reuse the same key.
   2. In Supabase: **Authentication → Emails → SMTP Settings** (older dashboards: **Project Settings → Authentication → SMTP Settings**). Turn on **Enable custom SMTP**.
   3. Fill in:
      | Field | Value |
      |---|---|
      | Sender email | `crm@seeyouabroad.in` (any address on your verified domain) |
      | Sender name | `SYB CRM` |
      | Host | `smtp.resend.com` |
      | Port | `465` |
      | Username | `resend` |
      | Password | your Resend API key (`re_…`) |
   4. Click **Save**.
   5. **Authentication → Rate Limits**: raise "Rate limit for sending emails" if needed (e.g. 30 per hour).
   6. Test: open your CRM's **Forgot password?** page, enter your email, and check the email arrives from `crm@…`.

   Shortcut: Resend also offers a Supabase integration (**Resend → Integrations → Supabase**) that fills in these SMTP settings for you.

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
| `CRON_SECRET` | Make one up: any long random text (30+ characters) | **Yes** |

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

Then sign in at your Vercel address and add the rest of the team from **Settings → Team → Invite someone** (see step 9).

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

### 9. Add your team

**Settings → Team → Invite someone.** Enter their name and email and choose Counsellor or Admin. The CRM shows a one-time "set your password" link (valid 24 hours). If email is set up (step 7) they also get it by email; otherwise send the link on WhatsApp. Lost password? Use **Options → New password link** on their row.

To stop someone using the CRM, **Options → Switch off account**. They are signed out at once and can't sign in. Their students stay assigned to them until you reassign them from **Students** (filter by counsellor, select all, Assign).

### 10. Daily 8:00 am email

`vercel.json` tells Vercel to run the daily job at 08:00 India time. Each counsellor gets their overdue and today's follow-ups, tasks and stuck students; admins get a team summary. It needs:

1. `CRON_SECRET` in Vercel's environment variables (step 4), so nobody else can trigger it.
2. Email set up (step 7).
3. **Settings → Leads and emails → Daily email** switched on (it is by default).

On Vercel's free Hobby plan, daily jobs run once a day but may start any time within that hour.

### 11. Two-step login for admins (recommended)

1. In Supabase: **Authentication → Sign In / Providers → Multi-Factor**: make sure **TOTP (Authenticator app)** is enabled.
2. In the CRM: click your name (bottom of the sidebar) → **My account → Set up two-step login**, scan the QR code with Google or Microsoft Authenticator, type the code.

From then on, signing in asks for the 6-digit code. Until the code is entered, the database treats the session as having no admin rights, so a stolen password alone can't see student data. Counsellors can turn it on too.

### 12. Weekly backup

`.github/workflows/weekly-backup.yml` copies the whole database every Monday at 02:00 India time, encrypts it, and keeps it in GitHub for 90 days. Set it up once:

1. Supabase: **Connect** (top bar) → **Session pooler** → copy the connection string and put your database password in it.
2. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_DB_URL` = that connection string
   - `BACKUP_PASSPHRASE` = a long passphrase. Save it in your password manager: without it the backup can't be opened.
3. **Actions → Weekly database backup → Run workflow** to test it. A file appears under **Artifacts** on the run page.

To open a backup: download the artifact, then
`gpg -d syb-crm-YYYY-MM-DD.tar.gz.gpg | tar -xz` (it asks for the passphrase). You get `roles.sql`, `schema.sql` and `data.sql`; Supabase's guide "Restore a backup to a new project" shows how to load them.

### 13. Put it on phones

Open the CRM address in the phone's browser and sign in, then:
- **Android (Chrome):** menu ⋮ → **Add to Home screen** / **Install app**.
- **iPhone (Safari):** Share → **Add to Home Screen**.

It opens full-screen with the See You Abroad eye icon, like an app.

---

## How the security works

- Every table has Row Level Security. A counsellor's database session can only read or change students where `assigned_to` is their own id, plus those students' steps, documents, payments, tasks and history.
- Anonymous visitors have no access to any table. The public `/apply` form writes through server code, with a spam trap and a rate limit.
- The secret key is only used in server files marked `server-only`. It is never sent to the browser.
- Stage moves are checked in the database: a student can't move forward until every required, visible step is done. Admin can override with a written reason, which is saved in the history.
- Every stage change, step tick, payment change and reassignment is written to `activity_log` by database triggers, with who did it and when.
- An admin with two-step login switched on has no admin rights in the database until the 6-digit code is entered.
- Switched-off staff are blocked at login and lose all access immediately.
- Run `npm run db:test` to check all of this against the local database.
