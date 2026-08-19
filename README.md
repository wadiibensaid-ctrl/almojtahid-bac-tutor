# Almojtahid — Bac marocain tutoring platform

A D2L-style tutoring platform for Moroccan Baccalauréat students (Tronc Commun,
1ère Bac, 2ème Bac) covering Math, Physique-Chimie, and SVT — with a full
curriculum tree, AI-graded unlimited practice exercises (adaptive difficulty),
and spaced-repetition flashcards (SM-2). Bilingual FR/AR with RTL support.

## Architecture

- **Frontend**: React + Vite, deployed as a static site
- **Backend**: one Vercel serverless function (`api/claude.js`) that holds your
  real Anthropic API key and proxies requests — the browser never sees it
- **Database & auth**: Supabase (Postgres + magic-link email auth). Free tier
  is enough to start.
- **AI**: Claude, called only from the backend function

Student progress, spaced-repetition state, and AI-generated flashcard decks
persist per-user in Supabase, protected by row-level security.

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com), create a free project.
2. In **Database → SQL Editor**, paste and run the contents of
   `supabase/schema.sql`.
3. In **Authentication → Providers**, make sure **Email** is enabled
   (magic link / OTP is on by default).
4. In **Authentication → URL Configuration**, add your local dev URL
   (`http://localhost:5173`) and your production URL (once you have it,
   e.g. `https://your-app.vercel.app`) to the redirect allow-list.
5. Grab three values from **Project Settings → API**:
   - `Project URL`
   - `anon public` key
   - `service_role` key (keep this one secret — never put it in a `VITE_*` var)

## 2. Get an Anthropic API key

Create one at [console.anthropic.com](https://console.anthropic.com) if you
don't have one. This is separate from your claude.ai login.

## 3. Local setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

The backend-only variables (`ANTHROPIC_API_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`) aren't read from `.env` locally by Vite — for
local testing of the `/api` function you'll want the Vercel CLI:

```bash
npm install -g vercel
vercel dev
```

`vercel dev` reads all four backend + frontend vars from a `.env` file (or
prompts you to pull them from your Vercel project once it's linked) and
serves both the Vite frontend and the `/api/claude` function together on one
port — this matters because the frontend calls `/api/claude` as a relative
path.

## 4. Deploy to Vercel

```bash
vercel
```

Follow the prompts to link/create a project, then set your environment
variables in the Vercel dashboard (**Project Settings → Environment
Variables**), or via CLI:

```bash
vercel env add ANTHROPIC_API_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

Then deploy to production:

```bash
vercel --prod
```

Add the resulting `https://your-app.vercel.app` URL to Supabase's redirect
allow-list (step 1.4 above) if you haven't already.

## 5. Try it

Open your deployed URL, enter an email, click the magic link it sends you,
and you're in. Pick a level and subject in the sidebar, open a chapter, and
try the Practice tab — it will call Claude live to generate an exercise,
grade what you write, and adjust difficulty for the next one.

## Parent follow-up

New in this version: students and parents pick a role on first login
(`RoleChooser`). Students get a 6-character invite code (shown in the
**Compte** tab) to share with a parent. A parent enters that code once to
link the account and sees an aggregate-only dashboard — accuracy,
difficulty level, and exercises attempted per chapter — through Supabase
row-level security (see the `parent_links` / `kv_store` policies at the
bottom of `supabase/schema.sql`).

Deliberately **not** visible to parents: the student's actual written
answers, AI feedback text, or flashcard contents (`srs:` / `deck:` keys
stay parent-inaccessible at the database level, not just hidden in the
UI). Students can revoke a parent's access at any time from the Compte
tab. This boundary is enforced by Postgres RLS, so it holds even if the
frontend has bugs — worth keeping that property if you extend this later.

No extra setup beyond what's in step 1 above: the new tables, policies,
and the `link_student_by_code` function are all in the same
`supabase/schema.sql` you already ran (or re-run it now if you set up
Supabase before this update — it uses `create table if not exists`, so
re-running is safe).

## Weekly parent digest

Every Sunday at 18:00 UTC, `api/cron/weekly-digest.js` runs automatically
(via Vercel Cron), looks at each linked child's activity over the past 7
days, and emails their parent a summary — exercises attempted, accuracy,
and current difficulty level per chapter. Same privacy rule as the
dashboard: aggregate numbers only, never a child's actual answers.

If a parent's linked children had zero activity that week, they simply
don't get an email — a "nothing happened" email trains people to ignore
the next one, so silence is better than a hollow digest.

### Setup

1. Create a free account at [resend.com](https://resend.com) and get an
   API key. For real delivery you'll want to verify your own sending
   domain (Resend walks you through the DNS records); for testing, you
   can send from `onboarding@resend.dev` without verifying anything.
2. Generate a random secret for `CRON_SECRET`:
   ```bash
   openssl rand -hex 32
   ```
3. Set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `CRON_SECRET` as
   environment variables in your Vercel project (same place as the other
   backend vars).
4. Deploy. Vercel reads the `crons` entry in `vercel.json` automatically —
   no separate setup needed. You can see scheduled runs and their logs in
   the Vercel dashboard under **Cron Jobs**.

### Testing it without waiting for Sunday

Call the endpoint directly with the same bearer token Vercel would send:

```bash
curl -X POST https://your-app.vercel.app/api/cron/weekly-digest \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

It responds with `{ sent, skippedEmpty, failures }` so you can confirm it
ran without digging through logs.

### Worth adding before relying on this at scale

- **Retry/idempotency tracking** — if the job fails partway through (e.g.
  Resend rate-limits you), it currently just reports the failure per
  parent rather than retrying. A small `digest_log` table (parent_id,
  week, sent_at) would let you skip parents already emailed that week and
  safely re-run the job.
- **WhatsApp instead of/alongside email** — most Moroccan parents live in
  WhatsApp, not email. The WhatsApp Business Platform can send templated
  messages like this, but requires Meta business verification and
  template pre-approval, which takes real time — worth starting that
  process early if you want it, but don't block launch on it. Email works
  today with zero approval process.
- **Per-parent language preference** — the digest is French-only right
  now. Adding a `lang` column to `profiles` and branching
  `renderDigestHtml` the same way the app already does for FR/AR would
  match a parent's actual preference.

## Teacher role & individualized assignments

Third role alongside student and parent: a teacher creates a class (gets a
join code students enter once, same pattern as the parent invite code but
reversed), then assigns an exercise by specifying a **target** — level,
subject, chapter, difficulty — rather than a fixed exercise text.

**Anti-cheating mechanism, concretely:** when a student opens an
assignment for the first time, the app calls Claude right then to
generate *that student's own* exercise on the assigned topic and stores
it permanently against their submission row. A classmate given "the same"
assignment gets a different problem testing the same skill. There's
nothing to photograph and pass around — the final answer one student
gets doesn't apply to another student's version. Combined with the fact
that grading checks written reasoning rather than a single numeric
answer, copying stops being useful rather than just being against the
rules.

**Deliberately different privacy boundary from the parent role:** a
teacher can read the actual exercise text, the student's actual written
answer, and the AI's grading feedback (`getSubmissionsForAssignment` in
`src/lib/teacher.js`). This is intentional, not an inconsistency — real
assessment and catching copied work both require reading the actual
work, where a parent only ever needed trends. It's enforced by a
dedicated read-only RLS policy on `assignment_submissions`, so a teacher
can see it but never edit a grade directly through this API — grades
only come from the AI grader, keeping the assessment consistent.

No new environment variables needed — this reuses the same Supabase auth,
the same `/api/claude` proxy, and the same `askClaude`/`gradeAnswer`
functions already wired up. Re-run `supabase/schema.sql` if you set up
your database before this update (all statements are idempotent —
`create table if not exists`, `drop constraint if exists` before
re-adding).

### Worth adding before relying on this with a real class

- **Bulk roster import** — right now students join one at a time via
  code. A teacher with 30 students typing a code is fine; a school
  administrator provisioning 500 accounts across many classes is not —
  that's a CSV-import job for later.
- **Per-student difficulty override** — assignments currently target one
  difficulty for the whole class. Some teachers will want to assign the
  same chapter at different difficulty bands to different students
  (differentiated instruction) — the data model already supports this via
  the `student_id` column on `assignments` (an assignment can target one
  student directly instead of a whole class), it just isn't exposed in
  the current `AssignmentForm` UI.
- **Late-submission handling** — `due_date` is stored and displayed but
  nothing currently prevents or flags a submission made after it.

## What to build next

- **Expand the curriculum** — `SEED_CONTENT` in `src/App.jsx` currently has
  hand-written notes for ~24 flagship chapters. Every chapter in
  `CURRICULUM` is navigable and fully usable via AI-generated practice even
  without seed content, but richer curated notes will make the Content tab
  more valuable per chapter.
- **Rate limiting** — see the commented-out `usage_daily` table in
  `supabase/schema.sql`. Right now a single very active (or malicious)
  account could generate a lot of Claude calls. Add a daily cap in
  `api/claude.js` before this goes fully public.
- **Weekly digest** — the parent dashboard is pull-based (parent has to
  open the app). A push-based weekly summary (email, or WhatsApp via the
  WhatsApp Business API) sent automatically would drive real habitual
  engagement from parents without them remembering to check. The query is
  already written in `ChildProgress` (`ParentDashboard.jsx`) — turning it
  into a scheduled digest just needs a cron job (Vercel Cron or a Supabase
  Edge Function) that runs it per parent and sends the result.
- **Teacher view** — same data model, one more role (`'teacher'`) and a
  policy allowing it to read a whole class's `progress:` rows instead of
  one child's.
- **Mobile app** — the same Supabase backend and `/api/claude` function can
  serve a React Native or Flutter client later without changes.

## Cost awareness

Each exercise generation, grading, and flashcard-batch call is one Claude
API request. Practice actively with a few students for a day and check your
Anthropic usage dashboard before opening this up broadly, so you know your
real per-student cost before scaling up.
