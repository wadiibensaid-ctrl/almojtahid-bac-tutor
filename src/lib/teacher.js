import { supabase } from "./supabaseClient";

function randomCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/* ---- Classes ---- */

export async function createClass(teacherId, name) {
  let lastError = null;
  for (let i = 0; i < 5; i++) {
    const payload = { teacher_id: teacherId, name, join_code: randomCode() };
    const { data, error } = await supabase.from("classes").insert(payload).select().maybeSingle();
    if (!error) return data;
    lastError = error;
    if (error.code !== "23505") throw error;
  }
  throw lastError;
}

export async function getMyClasses(teacherId) {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getClassMembers(classId) {
  const { data, error } = await supabase
    .from("class_members")
    .select("student_id, profiles!class_members_student_id_fkey(display_name)")
    .eq("class_id", classId);
  if (error) throw error;
  return (data || []).map((r) => ({ id: r.student_id, name: r.profiles?.display_name || "Élève" }));
}

/* ---- Student side: joining a class ---- */

export async function joinClassByCode(code) {
  const { error } = await supabase.rpc("join_class_by_code", { p_code: code.trim().toUpperCase() });
  if (error) throw error;
}

export async function getMyClassesAsStudent(studentId) {
  const { data, error } = await supabase
    .from("class_members")
    .select("class_id, classes(name, profiles!classes_teacher_id_fkey(display_name))")
    .eq("student_id", studentId);
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.class_id,
    name: r.classes?.name,
    teacherName: r.classes?.profiles?.display_name || "Enseignant",
  }));
}

/* ---- Assignments ---- */

export async function createAssignment({ teacherId, classId, studentId, level, subject, chapter, targetDifficulty, instructions, dueDate, timeLimitMinutes }) {
  const payload = {
    teacher_id: teacherId,
    class_id: classId || null,
    student_id: studentId || null,
    level, subject, chapter,
    target_difficulty: targetDifficulty,
    instructions: instructions || null,
    due_date: dueDate || null,
    time_limit_minutes: timeLimitMinutes || null,
  };
  const { data, error } = await supabase.from("assignments").insert(payload).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAssignmentsForTeacher(teacherId) {
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/** RLS already restricts this to assignments actually targeted at the caller. */
export async function getAssignmentsForStudent() {
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/* ---- Submissions: one unique AI-generated exercise per (assignment, student) ---- */

/** Student's sole read path for a submission — the table itself has no
 *  student SELECT policy (see schema.sql), because a plain policy can't
 *  hide just the grade columns until the teacher releases them. This RPC
 *  does that masking; always use it instead of querying the table directly. */
export async function getMySubmission(assignmentId) {
  const { data, error } = await supabase.rpc("get_my_submission", { p_assignment_id: assignmentId }).maybeSingle();
  if (error) throw error;
  return data;
}

/** Called the first time a student opens an assignment — stores their own,
 *  unique exercise. No .select() here: the student has insert/update but no
 *  select policy on this table, so the row is fetched back via
 *  getMySubmission() instead, which also applies the grade-masking. */
export async function createSubmissionRow(assignmentId, studentId, exercise) {
  const { error } = await supabase.from("assignment_submissions").insert({
    assignment_id: assignmentId,
    student_id: studentId,
    exercise_prompt: exercise.prompt,
    exercise_solution: exercise.solution,
    generated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return getMySubmission(assignmentId);
}

/** Submits the student's answer + AI grade. The write can fail with a
 *  Postgres exception if the assignment's time limit has passed — see
 *  enforce_assignment_time_limit() in schema.sql; callers should surface
 *  that as a "time's up" message rather than a generic error. */
export async function submitAssignmentAnswer(submissionId, assignmentId, answer, grade) {
  const { error } = await supabase
    .from("assignment_submissions")
    .update({
      student_answer: answer,
      grade_status: grade.status,
      grade_score: grade.score,
      grade_feedback: grade.feedback,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", submissionId);
  if (error) throw error;
  return getMySubmission(assignmentId);
}

/** Teacher side: reveals every submitted-but-unreleased grade for one
 *  assignment at once (see release_assignment_grades() in schema.sql). */
export async function releaseAssignmentGrades(assignmentId) {
  const { error } = await supabase.rpc("release_assignment_grades", { p_assignment_id: assignmentId });
  if (error) throw error;
}

/** Teacher side: full detail per student, including their actual answer and
 *  the true (unreleased) grade — via get_teacher_submissions(), since the
 *  grade columns are column-revoked on the raw table for everyone (see
 *  schema.sql). Deliberately richer than the parent dashboard, because
 *  catching copied work requires reading the student's actual answer. */
export async function getSubmissionsForAssignment(assignmentId) {
  const { data, error } = await supabase.rpc("get_teacher_submissions", { p_assignment_id: assignmentId });
  if (error) throw error;
  return (data || []).map((r) => ({ ...r, studentName: r.student_name }));
}

/* ---- Live classroom sessions (Jitsi, see src/lib/jitsi.js) ----
 * room_name carries the entire access-control burden along with the
 * teacher-enabled lobby (see the comment above the table in
 * supabase/schema.sql) — it must stay cryptographically random and only
 * ever leave the database through this file's RLS-protected queries. */

function randomRoomName() {
  return "mjhd-" + crypto.randomUUID().replace(/-/g, "");
}

/** Starts a new live session for a class and returns the row, including
 *  the fresh room_name to embed. Doesn't check for an already-live session
 *  on this class — the UI is expected to hide "start" while one is active. */
export async function startLiveSession(teacherId, classId, title) {
  const payload = { teacher_id: teacherId, class_id: classId, room_name: randomRoomName(), title: title || null };
  const { data, error } = await supabase.from("live_sessions").insert(payload).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function endLiveSession(sessionId) {
  const { error } = await supabase
    .from("live_sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}

/** Teacher side: session history for a class, most recent first. */
export async function getLiveSessionsForClass(classId) {
  const { data, error } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("class_id", classId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Student side: the active session for a class, or null if none. RLS
 *  already restricts this to classes the caller actually belongs to — a
 *  student outside the class gets zero rows here, not an error. */
export async function getActiveLiveSession(classId) {
  const { data, error } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("class_id", classId)
    .eq("status", "live")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
