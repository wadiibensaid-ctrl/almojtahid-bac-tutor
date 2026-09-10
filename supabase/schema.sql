-- Run this once in your Supabase project's SQL editor (Database > SQL Editor).
-- Every statement here is idempotent (create table if not exists, create or
-- replace function, drop policy if exists before create policy), so it's
-- always safe to re-run the whole file after pulling schema changes.
--
-- Statements are ordered so every table/function a policy references
-- already exists by the time that policy is created (Postgres resolves a
-- policy's USING/WITH CHECK expression against the catalog at CREATE POLICY
-- time, so a forward reference fails with "relation does not exist").

create table if not exists kv_store (
  id uuid primary key default gen_random_uuid(),
  owner text not null,        -- a Supabase auth user id, or 'shared'
  key text not null,          -- e.g. 'progress:2ème Bac|Mathématiques|Suites numériques'
  value text not null,        -- JSON-encoded string, same shape the app already produces
  updated_at timestamptz not null default now(),
  unique (owner, key)
);

-- Row Level Security: each student can only read/write their own rows.
alter table kv_store enable row level security;

drop policy if exists "users manage their own rows" on kv_store;
create policy "users manage their own rows"
  on kv_store
  for all
  using (owner = auth.uid()::text or owner = 'shared')
  with check (owner = auth.uid()::text or owner = 'shared');

-- Speeds up the prefix search used by ProgressTab (kvList('progress:', ...)).
create index if not exists kv_store_owner_key_prefix_idx
  on kv_store (owner, key text_pattern_ops);

-- Tracks daily AI usage per user so the backend can cap requests and avoid
-- a runaway API bill. Only the backend (service_role key) writes to this
-- table; RLS just lets a signed-in user read their own row if you ever want
-- to show it in the UI (e.g. "12/50 exercises used today").
create table if not exists usage_daily (
  user_id uuid not null,
  day date not null default current_date,
  request_count int not null default 0,
  primary key (user_id, day)
);
alter table usage_daily enable row level security;
drop policy if exists "users read their own usage" on usage_daily;
create policy "users read their own usage" on usage_daily
  for select using (user_id = auth.uid());

-- Atomic increment-and-return, called once per Claude API request from
-- api/claude.js. The ON CONFLICT DO UPDATE takes a row lock, so concurrent
-- requests from the same user increment serially instead of racing past
-- the cap (a separate read-then-write from the backend would not be safe).
-- security definer: runs as the function owner, bypassing RLS, since the
-- backend calls this with the service_role key on behalf of the user.
create or replace function increment_usage(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
begin
  insert into usage_daily (user_id, day, request_count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, day)
  do update set request_count = usage_daily.request_count + 1
  returning request_count into new_count;
  return new_count;
end;
$$;

-- security definer functions are PUBLIC-executable by default unless
-- explicitly revoked — found the hard way while building the problem-bank
-- feature: this function had no grant restriction at all and takes
-- p_user_id as a raw, unchecked parameter (no internal auth.uid() match),
-- so any authenticated user could call it directly with someone ELSE's
-- user id and exhaust that person's daily cap. This was live and
-- exploitable from whenever this function was first created — not a
-- regression introduced by the problem-bank work, just found while
-- auditing every security definer function for the same class of issue
-- (see the identical fix on claim_bank_item below). Only the service
-- role (api/claude.js) should ever call this.
revoke execute on function increment_usage(uuid) from public;
revoke execute on function increment_usage(uuid) from authenticated;
revoke execute on function increment_usage(uuid) from anon;


-- ============================================================
-- Parent follow-up feature: student/parent roles, invite-code
-- linking, and read-only aggregate access for linked parents.
-- ============================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'parent')),
  display_name text,
  invite_code text unique,  -- only set for students
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "users manage their own profile" on profiles;
create policy "users manage their own profile"
  on profiles for all
  using (id = auth.uid())
  with check (id = auth.uid());

create table if not exists parent_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (parent_id, student_id)
);

alter table parent_links enable row level security;

drop policy if exists "parties can view their own links" on parent_links;
create policy "parties can view their own links"
  on parent_links for select
  using (parent_id = auth.uid() or student_id = auth.uid());

drop policy if exists "students can revoke a parent's access" on parent_links;
create policy "students can revoke a parent's access"
  on parent_links for delete
  using (student_id = auth.uid());

-- These two reference parent_links, so they're created after it exists.
drop policy if exists "parent can view linked child's profile" on profiles;
create policy "parent can view linked child's profile"
  on profiles for select
  using (
    id in (select student_id from parent_links where parent_id = auth.uid() and status = 'active')
  );

drop policy if exists "student can view linked parent's profile" on profiles;
create policy "student can view linked parent's profile"
  on profiles for select
  using (
    id in (select parent_id from parent_links where student_id = auth.uid() and status = 'active')
  );

-- Parents never insert into parent_links directly (no INSERT policy
-- granted to authenticated users) — linking only happens through this
-- SECURITY DEFINER function, which validates the invite code first.
-- Because it's defined by the table owner, it bypasses RLS internally,
-- which is exactly why it's the only allowed path to create a link.
create or replace function link_student_by_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
begin
  select id into v_student_id from profiles where invite_code = p_code and role = 'student';
  if v_student_id is null then
    raise exception 'invalid_code';
  end if;
  insert into parent_links (parent_id, student_id, status)
  values (auth.uid(), v_student_id, 'active')
  on conflict (parent_id, student_id) do update set status = 'active';
end;
$$;

grant execute on function link_student_by_code(text) to authenticated;

-- Extend kv_store access: a parent may SELECT (never write) a linked
-- child's progress: rows only. srs:/deck: rows (the child's actual
-- flashcards and generated exercises) stay invisible to parents by
-- design — this is the "aggregate, not transcript" boundary.
drop policy if exists "parents view linked children's progress only" on kv_store;
create policy "parents view linked children's progress only"
  on kv_store for select
  using (
    key like 'progress:%'
    and owner in (
      select student_id::text from parent_links
      where parent_id = auth.uid() and status = 'active'
    )
  );


-- ============================================================
-- Teacher role: classes, individualized assignments, and
-- per-student submission tracking.
--
-- Anti-cheating design: an assignment specifies a target
-- (level, subject, chapter, difficulty) but NOT a fixed exercise.
-- Each student's actual exercise is generated the first time THEY
-- open it (see assignment_submissions) — so two students given
-- "the same" assignment get different problems testing the same
-- skill. Comparing final answers between students is useless
-- because there's nothing to compare.
--
-- Privacy note: unlike the parent role (aggregate-only, enforced
-- by RLS on kv_store), the teacher role intentionally CAN read a
-- student's actual submitted answer and exercise text — a teacher
-- needs the real work to assess it and to catch copying. This is a
-- deliberate difference between the two roles, not an oversight.
-- ============================================================

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('student', 'parent', 'teacher'));

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

alter table classes enable row level security;

create table if not exists class_members (
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

alter table class_members enable row level security;

-- classes' and class_members' RLS policies each need to check a condition
-- on the OTHER table (is this student a member? is this the teacher?).
-- Doing that with a plain correlated subquery creates a policy cycle:
-- evaluating classes' policy evaluates class_members' policy, which
-- evaluates classes' policy again, forever ("infinite recursion detected
-- in policy for relation ..."). These two SECURITY DEFINER functions break
-- the cycle: as SECURITY DEFINER owned by the table owner (with no FORCE
-- ROW LEVEL SECURITY set), their internal query bypasses RLS entirely
-- instead of re-entering policy evaluation. Same pattern as
-- link_student_by_code/join_class_by_code above, just for reads.
create or replace function is_member_of_class(p_class_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from class_members
    where class_id = p_class_id and student_id = auth.uid()
  );
$$;

create or replace function is_teacher_of_class(p_class_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from classes
    where id = p_class_id and teacher_id = auth.uid()
  );
$$;

grant execute on function is_member_of_class(uuid) to authenticated;
grant execute on function is_teacher_of_class(uuid) to authenticated;

drop policy if exists "teacher manages own classes" on classes;
create policy "teacher manages own classes"
  on classes for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists "students can view classes they belong to" on classes;
create policy "students can view classes they belong to"
  on classes for select
  using (is_member_of_class(id));

drop policy if exists "teacher views members of own classes" on class_members;
create policy "teacher views members of own classes"
  on class_members for select
  using (is_teacher_of_class(class_id));

drop policy if exists "student views own class memberships" on class_members;
create policy "student views own class memberships"
  on class_members for select
  using (student_id = auth.uid());

drop policy if exists "student can leave a class" on class_members;
create policy "student can leave a class"
  on class_members for delete
  using (student_id = auth.uid());

-- These two reference classes/class_members, so they're created after
-- both tables exist.
drop policy if exists "teacher can view profiles of students in own classes" on profiles;
create policy "teacher can view profiles of students in own classes"
  on profiles for select
  using (
    id in (
      select cm.student_id from class_members cm
      join classes c on c.id = cm.class_id
      where c.teacher_id = auth.uid()
    )
  );

drop policy if exists "student can view profile of teachers of own classes" on profiles;
create policy "student can view profile of teachers of own classes"
  on profiles for select
  using (
    id in (
      select c.teacher_id from classes c
      join class_members cm on cm.class_id = c.id
      where cm.student_id = auth.uid()
    )
  );

-- Joining only happens through this function (validates the code first),
-- same pattern as link_student_by_code above.
create or replace function join_class_by_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_id uuid;
begin
  select id into v_class_id from classes where join_code = p_code;
  if v_class_id is null then
    raise exception 'invalid_code';
  end if;
  insert into class_members (class_id, student_id)
  values (v_class_id, auth.uid())
  on conflict (class_id, student_id) do nothing;
end;
$$;

grant execute on function join_class_by_code(text) to authenticated;

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references profiles(id) on delete cascade,
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  level text not null,
  subject text not null,
  chapter text not null,
  target_difficulty int not null default 5,
  instructions text,
  due_date timestamptz,
  -- Optional per-assignment time limit (minutes), counted from the moment
  -- the student's own exercise is generated (assignment_submissions.generated_at)
  -- — see enforce_assignment_time_limit() below for the actual enforcement,
  -- which happens server-side so a client that skips the auto-submit can't
  -- just submit late with a looked-up answer.
  time_limit_minutes int,
  created_at timestamptz not null default now(),
  constraint assignment_has_a_target check (class_id is not null or student_id is not null)
);

alter table assignments enable row level security;

drop policy if exists "teacher manages own assignments" on assignments;
create policy "teacher manages own assignments"
  on assignments for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists "student views assignments targeted at them" on assignments;
create policy "student views assignments targeted at them"
  on assignments for select
  using (
    student_id = auth.uid()
    or class_id in (select class_id from class_members where student_id = auth.uid())
  );

create table if not exists assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  exercise_prompt text,
  exercise_solution text,
  student_answer text,
  grade_status text,
  grade_score int,
  grade_feedback text,
  -- Grade fields above are computed by the AI as soon as the student
  -- submits (unchanged), but stay hidden from the student until the
  -- teacher reviews and releases them — see get_my_submission() below.
  -- RLS is row-level only, so it can't mask just these columns; that's
  -- done with a column-level REVOKE further down instead.
  grade_released boolean not null default false,
  released_at timestamptz,
  generated_at timestamptz,
  submitted_at timestamptz,
  unique (assignment_id, student_id)
);

alter table assignment_submissions enable row level security;

-- Split from the old "for all" policy. Student gets full row-level select
-- back (see below for why) plus insert/update on their own row.
drop policy if exists "student manages their own submission" on assignment_submissions;
drop policy if exists "student inserts their own submission" on assignment_submissions;
create policy "student inserts their own submission"
  on assignment_submissions for insert
  with check (student_id = auth.uid());

drop policy if exists "student updates their own submission" on assignment_submissions;
create policy "student updates their own submission"
  on assignment_submissions for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- A table with RLS enabled and NO select policy at all for a role makes
-- every write from that role via PostgREST silently affect 0 rows — not an
-- error, just a no-op (confirmed empirically; PostgREST's insert/update
-- handling needs a satisfiable select policy even with return=minimal). So
-- the student needs this plain row-level select, same as before. The grade
-- fields stay hidden through the column-level REVOKE below instead — RLS
-- is row-level only and can't mask individual columns, this can.
drop policy if exists "student selects their own submission" on assignment_submissions;
create policy "student selects their own submission"
  on assignment_submissions for select
  using (student_id = auth.uid());

-- Blocks a direct table read of the grade for EVERYONE in `authenticated`
-- — students and teachers alike — regardless of RLS. The only two read
-- paths left for these three columns are get_my_submission() (masks by
-- grade_released) and get_teacher_submissions() below (always full); both
-- are security definer and therefore exempt from this.
--
-- Note this has to be REVOKE-the-whole-table then GRANT-the-safe-columns,
-- not a column-level REVOKE on top of the existing table-level SELECT
-- grant — table-level and column-level privileges are independent, additive
-- ACL entries in Postgres, so revoking just the sensitive columns while a
-- broader table-level SELECT grant still exists does nothing at all
-- (confirmed the hard way: a plain `revoke select (col) ... from
-- authenticated` here left the columns fully readable, because
-- `authenticated` already had table-level SELECT from Supabase's default
-- setup, and only a table-level revoke actually narrows that).
revoke select on assignment_submissions from authenticated;
grant select (
  id, assignment_id, student_id, exercise_prompt, exercise_solution,
  student_answer, grade_released, released_at, generated_at, submitted_at
) on assignment_submissions to authenticated;

-- Teacher gets read-only row-level access to everything except the three
-- grade columns (blocked for everyone by the column-level revoke above,
-- teacher included) — full grade visibility for review comes exclusively
-- through get_teacher_submissions() below, a security definer function.
drop policy if exists "teacher views submissions for own assignments" on assignment_submissions;
create policy "teacher views submissions for own assignments"
  on assignment_submissions for select
  using (assignment_id in (select id from assignments where teacher_id = auth.uid()));


-- ============================================================
-- Free-text feedback widget, available to every role. Insert-only by
-- design: no select/update/delete policy for the authenticated role, so a
-- user can submit feedback but never read anyone else's (or even their
-- own) submissions back through the app. Review happens directly in the
-- Supabase dashboard (Table Editor / SQL Editor), which uses the
-- service_role key and bypasses RLS entirely — join against `profiles`
-- there if you want each entry's role, e.g.:
--   select f.*, p.role from feedback f join profiles p on p.id = f.user_id;
-- ============================================================

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('bug', 'suggestion', 'other')),
  message text not null,
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

drop policy if exists "users submit their own feedback" on feedback;
create policy "users submit their own feedback"
  on feedback for insert
  with check (user_id = auth.uid());


-- ============================================================
-- Live classroom sessions (Jitsi Meet, meet.jit.si public instance —
-- see src/lib/jitsi.js). No per-session cost, no API key, but also no
-- built-in auth on the free tier: anyone who knows a room name can join
-- it. Two things carry the entire security burden here, both mandatory:
--
-- 1. room_name is cryptographically random (generated client-side via
--    crypto.randomUUID() in startLiveSession(), never derived from the
--    class name or any human-readable string) and is only ever exposed
--    through this table's own RLS-protected SELECT — never rendered,
--    logged, or passed through a URL param a search engine could index.
-- 2. The teacher enables Jitsi's Lobby (waiting room) via the IFrame API
--    once they join as moderator (toggleLobby command) — every
--    participant must be manually admitted. This is enforced client-side
--    (Jitsi has no server-side lobby toggle on the free public instance),
--    so it depends on the teacher's client actually running that code;
--    there is no way to enforce it from Postgres.
--
-- No plan-gating trigger here (unlike e.g. a hypothetical
-- enforce_class_limit()) — this project has no subscription/plan system
-- yet. Any teacher can start a session for any class they own.
-- ============================================================

create table if not exists live_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  room_name text not null unique,
  title text,
  status text not null default 'live' check (status in ('live', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table live_sessions enable row level security;

drop policy if exists "teacher manages own sessions" on live_sessions;
create policy "teacher manages own sessions"
  on live_sessions for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists "students view live sessions for their classes" on live_sessions;
create policy "students view live sessions for their classes"
  on live_sessions for select
  using (class_id in (select class_id from class_members where student_id = auth.uid()));

-- Speeds up the student-side poll (getActiveLiveSession: one row per
-- class where status='live').
create index if not exists live_sessions_class_status_idx
  on live_sessions (class_id, status);

-- At most one 'live' row per class at a time — a plain unique(class_id)
-- would also block having multiple *ended* rows in the class's history,
-- so this has to be a partial index scoped to status='live' rather than a
-- table-level unique constraint. Closes the gap where opening the same
-- class in two tabs (or double-clicking "Démarrer") could otherwise spin
-- up two simultaneous rooms for one class — startLiveSession()'s insert
-- now fails with a 23505 unique violation in that case, which
-- LiveSessionPanel treats as "someone already started it," not an error.
create unique index if not exists live_sessions_one_live_per_class
  on live_sessions (class_id)
  where status = 'live';


-- ============================================================
-- Assignment time limits + teacher grade validation.
--
-- 1. Time limit: assignments.time_limit_minutes (optional). The clock
--    starts at assignment_submissions.generated_at (when the student's own
--    exercise was generated). The client auto-submits when its own
--    countdown hits zero, but that alone is trivially bypassed (skip the
--    JS, submit later with an answer looked up elsewhere) — the real
--    enforcement is enforce_assignment_time_limit() below, a trigger that
--    rejects the UPDATE outright once the deadline (+ a short grace period
--    for normal network latency) has passed.
--
-- 2. Grade validation: assignment_submissions.grade_released (default
--    false). The AI still grades immediately on submission as before, but
--    the student can no longer read grade_status/grade_score/grade_feedback
--    directly — see the "student manages their own submission" split
--    above, which leaves them with NO select policy on the base table.
--    get_my_submission() is their only read path, and it nulls the grade
--    columns until grade_released is true. release_assignment_grades()
--    is the teacher's bulk "reveal everyone's grade at once" action, meant
--    to be triggered right before discussing results in a live session.
-- ============================================================

alter table assignments add column if not exists time_limit_minutes int;
alter table assignment_submissions add column if not exists grade_released boolean not null default false;
alter table assignment_submissions add column if not exists released_at timestamptz;

create or replace function enforce_assignment_time_limit()
returns trigger
language plpgsql
as $$
declare
  v_time_limit int;
begin
  -- Only the transition into "submitted" matters — editing other fields,
  -- or a teacher-side release touching this row, isn't a submission.
  if new.submitted_at is not null and old.submitted_at is null then
    select time_limit_minutes into v_time_limit
      from assignments where id = new.assignment_id;
    if v_time_limit is not null and new.generated_at is not null
       and now() > new.generated_at + (v_time_limit || ' minutes')::interval + interval '60 seconds'
    then
      raise exception 'Time limit exceeded for this assignment';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists assignment_submission_time_limit on assignment_submissions;
create trigger assignment_submission_time_limit
  before update on assignment_submissions
  for each row execute function enforce_assignment_time_limit();

-- Student's sole read path for a submission — masks the grade columns
-- until the teacher has released them. Bypasses RLS (security definer) and
-- does its own ownership check instead, since the table has no student
-- SELECT policy to rely on.
create or replace function get_my_submission(p_assignment_id uuid)
returns table (
  id uuid, assignment_id uuid, student_id uuid,
  exercise_prompt text, exercise_solution text, student_answer text,
  grade_status text, grade_score int, grade_feedback text,
  grade_released boolean, generated_at timestamptz, submitted_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.id, s.assignment_id, s.student_id,
    s.exercise_prompt, s.exercise_solution, s.student_answer,
    case when s.grade_released then s.grade_status else null end,
    case when s.grade_released then s.grade_score else null end,
    case when s.grade_released then s.grade_feedback else null end,
    s.grade_released, s.generated_at, s.submitted_at
  from assignment_submissions s
  where s.assignment_id = p_assignment_id
    and s.student_id = auth.uid();
$$;

grant execute on function get_my_submission(uuid) to authenticated;

-- Teacher's full read of one assignment's submissions, including the
-- grade columns the column-level revoke above otherwise blocks — this is
-- the only place a teacher sees them (used instead of a raw table select).
create or replace function get_teacher_submissions(p_assignment_id uuid)
returns table (
  id uuid, assignment_id uuid, student_id uuid, student_name text,
  exercise_prompt text, exercise_solution text, student_answer text,
  grade_status text, grade_score int, grade_feedback text,
  grade_released boolean, generated_at timestamptz, submitted_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.id, s.assignment_id, s.student_id, coalesce(p.display_name, 'Élève'),
    s.exercise_prompt, s.exercise_solution, s.student_answer,
    s.grade_status, s.grade_score, s.grade_feedback,
    s.grade_released, s.generated_at, s.submitted_at
  from assignment_submissions s
  join profiles p on p.id = s.student_id
  where s.assignment_id = p_assignment_id
    and exists (
      select 1 from assignments a
      where a.id = p_assignment_id and a.teacher_id = auth.uid()
    );
$$;

grant execute on function get_teacher_submissions(uuid) to authenticated;

-- Teacher's bulk release: reveals every submitted-but-unreleased grade for
-- one assignment at once. Manual ownership check (security definer bypasses
-- RLS) instead of relying on a policy, same pattern as join_class_by_code.
create or replace function release_assignment_grades(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from assignments
    where id = p_assignment_id and teacher_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  update assignment_submissions
  set grade_released = true, released_at = now()
  where assignment_id = p_assignment_id
    and submitted_at is not null
    and grade_released = false;
end;
$$;

grant execute on function release_assignment_grades(uuid) to authenticated;


-- ============================================================
-- Past national Bac exam papers (épreuves nationales), with correction
-- keys. Two sources, same table: teacher uploads (source='teacher',
-- uploaded_by set) and papers pulled from the official Ministry (CNEE)
-- portal (source='official', uploaded_by null, inserted directly via the
-- dashboard/service role, not through the app).
--
-- Unlike assignments/live_sessions, this content is NOT sensitive — a
-- past Bac paper is the same PDF any student could already find on public
-- exam-archive sites, and the official ones literally come from a
-- government portal. So the storage bucket is public (see below) and the
-- table's select policy is open to any authenticated user, not scoped to
-- a class — the value here is having ALL of them in one place, not
-- restricting who sees which one.
-- ============================================================

create table if not exists past_papers (
  id uuid primary key default gen_random_uuid(),
  level text not null,
  subject text not null,
  stream text not null,
  year int not null,
  session text not null check (session in ('normale', 'rattrapage')),
  title text,
  paper_path text not null,
  correction_path text,
  source text not null default 'teacher' check (source in ('official', 'teacher')),
  uploaded_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table past_papers enable row level security;

drop policy if exists "authenticated users view past papers" on past_papers;
create policy "authenticated users view past papers"
  on past_papers for select
  using (auth.role() = 'authenticated');

drop policy if exists "teachers upload past papers" on past_papers;
create policy "teachers upload past papers"
  on past_papers for insert
  with check (
    uploaded_by = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and role = 'teacher')
  );

drop policy if exists "teachers manage their own uploaded papers" on past_papers;
create policy "teachers manage their own uploaded papers"
  on past_papers for update
  using (uploaded_by = auth.uid())
  with check (uploaded_by = auth.uid());

drop policy if exists "teachers delete their own uploaded papers" on past_papers;
create policy "teachers delete their own uploaded papers"
  on past_papers for delete
  using (uploaded_by = auth.uid());

create index if not exists past_papers_filter_idx
  on past_papers (level, subject, stream, year);

-- Public bucket — see the comment above the table for why. Uploads are
-- still gated to teachers via the storage.objects policy below; only
-- reads are unrestricted.
insert into storage.buckets (id, name, public)
values ('past-papers', 'past-papers', true)
on conflict (id) do nothing;

drop policy if exists "teachers upload to past-papers bucket" on storage.objects;
create policy "teachers upload to past-papers bucket"
  on storage.objects for insert
  with check (
    bucket_id = 'past-papers'
    and exists (select 1 from profiles where id = auth.uid() and role = 'teacher')
  );

drop policy if exists "teachers delete their own past-paper files" on storage.objects;
create policy "teachers delete their own past-paper files"
  on storage.objects for delete
  using (bucket_id = 'past-papers' and owner = auth.uid());


-- ============================================================
-- AI cost controls: a pre-generated problem bank for self-practice and
-- flashcards, replenished off-peak via Anthropic's Batch API (50% off
-- standard pricing) — see api/cron/batch-replenish.js.
--
-- Deliberately NOT used for assignments. The anti-cheat design (each
-- student's assigned exercise is generated fresh, just for them — see the
-- comment on assignment_submissions) depends on no two students ever
-- getting the same exercise for graded work; a shared pool would break
-- that. Self-practice and flashcards carry no such constraint — they're
-- personal, ungraded, never compared against a classmate — so serving the
-- same pooled item to different students (or the same student twice) is
-- fine there.
--
-- Both tables are server-only: RLS is enabled with NO policies for
-- anon/authenticated, so every access goes through the service role from
-- api/claude.js or the cron job — nothing here is ever reachable over the
-- public PostgREST API, by construction rather than by policy.
-- ============================================================

create table if not exists problem_bank (
  id uuid primary key default gen_random_uuid(),
  level text not null,
  subject text not null,
  chapter text not null,
  lang text not null check (lang in ('fr', 'ar')),
  difficulty_band text not null check (difficulty_band in ('easy', 'medium', 'hard')),
  item_type text not null check (item_type in ('exercise', 'flashcard')),
  content jsonb not null,
  source text not null default 'batch' check (source in ('batch', 'live-fallback')),
  used_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table problem_bank enable row level security;

create index if not exists problem_bank_lookup_idx
  on problem_bank (level, subject, chapter, lang, item_type, difficulty_band, used_count);

-- Atomically claims the least-used matching item (or the oldest among
-- ties) and bumps its used_count in the same transaction — `for update
-- skip locked` means two concurrent claims never grab the same row; the
-- second one just gets the next-best row instead of blocking or double-
-- serving. Returns no row (all columns null) when the pool is empty for
-- that combo, which the caller treats as a cache miss.
--
-- security definer functions are executable by PUBLIC by default unless
-- explicitly revoked — confirmed the hard way: without the three revokes
-- below, any authenticated user (or anon) could call this directly,
-- bypassing /api/claude's auth check and the daily rate limit entirely,
-- and drain the whole bank in a scripted loop. Only the service role
-- (api/claude.js, api/cron/batch-replenish.js) should ever call this.
create or replace function claim_bank_item(
  p_level text, p_subject text, p_chapter text,
  p_lang text, p_difficulty_band text, p_item_type text
)
returns problem_bank
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row problem_bank;
begin
  select * into v_row from problem_bank
  where level = p_level and subject = p_subject and chapter = p_chapter
    and lang = p_lang and difficulty_band = p_difficulty_band and item_type = p_item_type
  order by used_count asc, created_at asc
  limit 1
  for update skip locked;

  if v_row.id is not null then
    update problem_bank set used_count = used_count + 1 where id = v_row.id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

revoke execute on function claim_bank_item(text, text, text, text, text, text) from public;
revoke execute on function claim_bank_item(text, text, text, text, text, text) from authenticated;
revoke execute on function claim_bank_item(text, text, text, text, text, text) from anon;

-- Tracks each Anthropic batch submitted by the replenish cron between its
-- "submit" and "collect" phases (both run in the same daily invocation,
-- but a batch can still be mid-processing when the next day's run starts —
-- see the job for why status stays 'submitted' across runs until then).
-- requests_meta maps each request's custom_id to the (level, subject,
-- chapter, lang, difficulty_band, item_type) it was generated for, since
-- batch results come back keyed only by custom_id, in no particular order.
create table if not exists batch_jobs (
  id text primary key,
  status text not null default 'submitted' check (status in ('submitted', 'completed', 'failed')),
  requests_meta jsonb not null,
  submitted_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table batch_jobs enable row level security;
