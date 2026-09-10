import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { AuthContext } from "./AuthContext";
import { Frame, HeaderBar, Star8 } from "./ui/Frame";
import { T } from "./lib/i18n";
import { LEVELS, SUBJECTS, STREAMS, CURRICULUM, labelFor } from "./lib/curriculum";
import {
  createClass, getMyClasses, getClassMembers,
  createAssignment, getAssignmentsForTeacher, getSubmissionsForAssignment, releaseAssignmentGrades,
  startLiveSession, endLiveSession, getLiveSessionsForClass, getActiveLiveSession,
  uploadPastPaper, getPastPapers, deletePastPaper,
} from "./lib/teacher";
import { JITSI_DOMAIN, loadJitsiScript } from "./lib/jitsi";

export default function TeacherDashboard({ profile }) {
  const { userId, email, signOut } = useContext(AuthContext);
  const [lang, setLang] = useState("fr");
  const [classes, setClasses] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [newClassName, setNewClassName] = useState("");
  const [creatingClass, setCreatingClass] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState("classes"); // "classes" | "pastPapers"
  const t = T[lang];

  const refreshClasses = useCallback(async () => {
    const list = await getMyClasses(userId);
    setClasses(list);
    if (list.length && !selectedClassId) setSelectedClassId(list[0].id);
  }, [userId, selectedClassId]);

  useEffect(() => { refreshClasses(); }, [refreshClasses]);

  const addClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setCreatingClass(true);
    try {
      const c = await createClass(userId, newClassName.trim());
      setNewClassName("");
      await refreshClasses();
      setSelectedClassId(c.id);
    } finally {
      setCreatingClass(false);
    }
  };

  const selectedClass = (classes || []).find((c) => c.id === selectedClassId) || null;

  return (
    <Frame lang={lang}>
      <HeaderBar
        appName={t.appName}
        tagline={t.teacherTagline}
        langBtn={t.langBtn}
        onToggleLang={() => setLang(lang === "fr" ? "ar" : "fr")}
        email={email}
        onSignOut={signOut}
        signOutLabel={t.signOut}
      />
      <button className="btn mobile-menu-btn" onClick={() => setSidebarOpen(true)}>☰ {t.myClasses}</button>

      <div className="dashboard-shell">
        <div className={`sidebar-backdrop ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
        <div className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--terracotta)", marginBottom: 10, textTransform: "uppercase" }}>{t.myClasses}</div>
          {classes === null ? (
            <div style={{ color: "#9c9184", fontSize: 13 }}>{t.loadingLabel}</div>
          ) : (
            classes.map((c) => (
              <button key={c.id} className={`sidebar-chapter ${view === "classes" && selectedClassId === c.id ? "active" : ""}`} onClick={() => { setSelectedClassId(c.id); setView("classes"); setSidebarOpen(false); }}>
                {c.name}
              </button>
            ))
          )}
          <form onSubmit={addClass} style={{ marginTop: 16, borderTop: "1.5px solid var(--line)", paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--terracotta)", marginBottom: 8, textTransform: "uppercase" }}>{t.createClass}</div>
            <input type="text" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder={t.className} style={{ marginBottom: 8 }} />
            <button type="submit" className="btn solid" style={{ width: "100%" }} disabled={creatingClass || !newClassName.trim()}>
              {creatingClass ? t.loadingLabel : t.createClassBtn}
            </button>
          </form>
          <div style={{ marginTop: 18, borderTop: "1.5px solid var(--line)", paddingTop: 10 }}>
            <button className="sidebar-subject" onClick={() => { setView("pastPapers"); setSidebarOpen(false); }}>
              <span>{t.pastPapersTab}</span>
            </button>
          </div>
        </div>

        <div className="dashboard-content">
          {view === "pastPapers" ? (
            <PastPapersTab t={t} lang={lang} teacherId={userId} />
          ) : !selectedClass ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#9c9184" }}>
              <Star8 size={40} color="var(--line)" style={{ margin: "0 auto 12px" }} />
              <div>{t.selectClassPrompt}</div>
            </div>
          ) : (
            <ClassDetail key={selectedClass.id} t={t} lang={lang} teacherId={userId} klass={selectedClass} />
          )}
        </div>
      </div>
    </Frame>
  );
}

/** Not class-scoped — every teacher and student sees the same shared
 *  library of past papers, official or teacher-uploaded alike. */
function PastPapersTab({ t, lang, teacherId }) {
  const [papers, setPapers] = useState(null);
  const [filterLevel, setFilterLevel] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterStream, setFilterStream] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const list = await getPastPapers({
      level: filterLevel || undefined,
      subject: filterSubject || undefined,
      stream: filterStream || undefined,
    });
    setPapers(list);
  }, [filterLevel, filterSubject, filterStream]);

  useEffect(() => { load(); }, [load]);

  const remove = async (paper) => {
    await deletePastPaper(paper.id, paper.paper_path, paper.correction_path);
    load();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, color: "var(--ink)", margin: 0 }}>{t.pastPapersTab}</h1>
        <button className="btn solid" onClick={() => setShowForm(!showForm)}>{t.uploadPastPaper}</button>
      </div>

      {showForm && (
        <PastPaperForm t={t} lang={lang} teacherId={teacherId} onCreated={() => { setShowForm(false); load(); }} />
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
          <option value="">{t.allLevels}</option>
          {LEVELS.map((l) => <option key={l} value={l}>{labelFor(l, lang)}</option>)}
        </select>
        <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
          <option value="">{t.allSubjects}</option>
          {SUBJECTS.map((s) => <option key={s} value={s}>{labelFor(s, lang)}</option>)}
        </select>
        <select value={filterStream} onChange={(e) => setFilterStream(e.target.value)}>
          <option value="">{t.allStreams}</option>
          {STREAMS.map((s) => <option key={s} value={s}>{labelFor(s, lang)}</option>)}
        </select>
      </div>

      {papers === null ? (
        <div style={{ color: "#9c9184" }}>{t.loadingLabel}</div>
      ) : papers.length === 0 ? (
        <div style={{ color: "#9c9184" }}>{t.noPastPapers}</div>
      ) : (
        papers.map((p) => (
          <div key={p.id} className="exercise-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700 }}>
                {labelFor(p.subject, lang)} — {labelFor(p.stream, lang)} — {p.year} ({p.session === "normale" ? t.sessionNormale : t.sessionRattrapage})
              </div>
              <div style={{ fontSize: 12.5, color: "#7a7266" }}>
                {labelFor(p.level, lang)}{p.title ? ` · ${p.title}` : ""}
                {p.source === "official" && <span className="pill correct" style={{ marginInlineStart: 8 }}>{t.officialBadge}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a className="btn" href={p.paperUrl} target="_blank" rel="noreferrer">{t.viewPaper}</a>
              {p.correctionUrl && <a className="btn" href={p.correctionUrl} target="_blank" rel="noreferrer">{t.viewCorrection}</a>}
              {p.uploaded_by === teacherId && (
                <button className="btn" style={{ borderColor: "var(--terracotta)", color: "var(--terracotta)" }} onClick={() => remove(p)}>{t.deletePaper}</button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function PastPaperForm({ t, lang, teacherId, onCreated }) {
  const [level, setLevel] = useState(LEVELS[LEVELS.length - 1]);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [stream, setStream] = useState(STREAMS[0]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [session, setSession] = useState("normale");
  const [title, setTitle] = useState("");
  const [paperFile, setPaperFile] = useState(null);
  const [correctionFile, setCorrectionFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!paperFile) return;
    setSaving(true); setError(false);
    try {
      await uploadPastPaper({ teacherId, level, subject, stream, year, session, title: title.trim(), paperFile, correctionFile });
      onCreated();
    } catch {
      setError(true);
    }
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="exercise-card" style={{ marginBottom: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.level}</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>{LEVELS.map((l) => <option key={l} value={l}>{labelFor(l, lang)}</option>)}</select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.subject}</label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>{SUBJECTS.map((s) => <option key={s} value={s}>{labelFor(s, lang)}</option>)}</select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.streamLabel}</label>
          <select value={stream} onChange={(e) => setStream(e.target.value)}>{STREAMS.map((s) => <option key={s} value={s}>{labelFor(s, lang)}</option>)}</select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.yearLabel}</label>
          <input type="number" value={year} onChange={(e) => setYear(e.target.value)} min="2000" max="2100" />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.sessionLabel}</label>
          <select value={session} onChange={(e) => setSession(e.target.value)}>
            <option value="normale">{t.sessionNormale}</option>
            <option value="rattrapage">{t.sessionRattrapage}</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.titleOptional}</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.titlePlaceholder} />
        </div>
      </div>
      <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.paperFileLabel}</label>
      <input type="file" accept="application/pdf" onChange={(e) => setPaperFile(e.target.files?.[0] || null)} style={{ marginBottom: 12 }} />
      <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.correctionFileLabel}</label>
      <input type="file" accept="application/pdf" onChange={(e) => setCorrectionFile(e.target.files?.[0] || null)} style={{ marginBottom: 16 }} />
      <button type="submit" className="btn solid" disabled={saving || !paperFile}>{saving ? t.loadingLabel : t.uploadBtn}</button>
      {error && <div style={{ color: "var(--terracotta)", fontSize: 13, marginTop: 10 }}>{t.errorGen}</div>}
    </form>
  );
}

function ClassDetail({ t, lang, teacherId, klass }) {
  const [members, setMembers] = useState(null);
  const [assignments, setAssignments] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);

  const load = useCallback(async () => {
    const [m, a] = await Promise.all([getClassMembers(klass.id), getAssignmentsForTeacher(teacherId)]);
    setMembers(m);
    setAssignments(a.filter((x) => x.class_id === klass.id));
  }, [klass.id, teacherId]);

  useEffect(() => { load(); }, [load]);

  const selectedAssignment = (assignments || []).find((a) => a.id === selectedAssignmentId) || null;

  return (
    <div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, color: "var(--ink)", margin: "0 0 4px" }}>{klass.name}</h1>
      <div style={{ fontSize: 13, color: "#7a7266", marginBottom: 20 }}>
        {t.joinCode}: <strong style={{ letterSpacing: "0.1em", color: "var(--ink)" }}>{klass.join_code}</strong> — {t.classCodeHint}
      </div>

      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, marginBottom: 10, color: "var(--ink)" }}>{t.roster} ({members?.length ?? "…"})</div>
      {members && members.length === 0 && <div style={{ color: "#9c9184", marginBottom: 20 }}>{t.noMembers}</div>}
      {members && members.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {members.map((m) => (
            <span key={m.id} className="pill pending" style={{ padding: "6px 14px" }}>{m.name}</span>
          ))}
        </div>
      )}

      <LiveSessionPanel t={t} lang={lang} teacherId={teacherId} classId={klass.id} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>{t.assignments}</div>
        <button className="btn solid" onClick={() => setShowForm(!showForm)}>{t.newAssignment}</button>
      </div>

      {showForm && (
        <AssignmentForm
          t={t}
          lang={lang}
          onCreated={() => { setShowForm(false); load(); }}
          teacherId={teacherId}
          classId={klass.id}
        />
      )}

      {selectedAssignment ? (
        <AssignmentSubmissions t={t} lang={lang} assignment={selectedAssignment} onBack={() => setSelectedAssignmentId(null)} />
      ) : (
        <>
          {assignments && assignments.length === 0 && <div style={{ color: "#9c9184" }}>{t.noAssignmentsTeacher}</div>}
          {assignments && assignments.map((a) => (
            <button key={a.id} className="exercise-card" style={{ width: "100%", textAlign: "start", cursor: "pointer", display: "block" }} onClick={() => setSelectedAssignmentId(a.id)}>
              <div style={{ fontWeight: 700 }}>{labelFor(a.chapter, lang)}</div>
              <div style={{ fontSize: 12.5, color: "#7a7266" }}>{labelFor(a.subject, lang)} · {labelFor(a.level, lang)} · {t.targetDifficulty} {a.target_difficulty}/10</div>
              {a.due_date && <div style={{ fontSize: 12, color: "#9c9184", marginTop: 4 }}>{t.dueDate} {new Date(a.due_date).toLocaleDateString()}</div>}
            </button>
          ))}
        </>
      )}
    </div>
  );
}

/** Embeds meet.jit.si for the class's active session and enables the Jitsi
 *  Lobby the moment the teacher (moderator) joins — this is the only place
 *  that gate gets turned on, and it depends on this code actually running,
 *  see the safety note in supabase/schema.sql above the live_sessions table. */
function LiveSessionPanel({ t, lang, teacherId, classId }) {
  const [active, setActive] = useState(undefined); // undefined = loading, null = none live
  const [history, setHistory] = useState(null);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [title, setTitle] = useState("");
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  const load = useCallback(async () => {
    const [a, h] = await Promise.all([getActiveLiveSession(classId), getLiveSessionsForClass(classId)]);
    setActive(a);
    setHistory(h);
  }, [classId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!active || !containerRef.current) return undefined;
    let cancelled = false;
    loadJitsiScript().then(() => {
      if (cancelled || !containerRef.current) return;
      const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
        roomName: active.room_name,
        parentNode: containerRef.current,
        width: "100%",
        height: 480,
      });
      apiRef.current = api;
      api.addEventListener("videoConferenceJoined", () => {
        api.executeCommand("toggleLobby", true);
      });
    });
    return () => {
      cancelled = true;
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, [active?.id]);

  const start = async () => {
    setStarting(true);
    try {
      await startLiveSession(teacherId, classId, title.trim() || null);
      setTitle("");
    } catch (e) {
      // 23505 = the one-live-session-per-class unique index rejected this
      // insert because another tab/click already started one — that's not
      // a real error, just load() below to show the session that exists.
      if (e?.code !== "23505") throw e;
    } finally {
      await load();
      setStarting(false);
    }
  };

  const end = async () => {
    if (!active) return;
    setEnding(true);
    try {
      if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; }
      await endLiveSession(active.id);
      await load();
    } finally {
      setEnding(false);
    }
  };

  const toggleWhiteboard = () => {
    apiRef.current?.executeCommand("toggleWhiteboard");
  };

  if (active === undefined) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>{t.liveSession}</div>
        {!active && (
          <div style={{ display: "flex", gap: 8 }}>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.liveSessionTitlePlaceholder} style={{ maxWidth: 200 }} />
            <button className="btn solid" onClick={start} disabled={starting}>{starting ? t.loadingLabel : t.startLiveSession}</button>
          </div>
        )}
      </div>

      {active ? (
        <div className="exercise-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <span className="pill correct">{t.liveNow}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={toggleWhiteboard}>{t.whiteboardBtn}</button>
              <button className="btn" onClick={end} disabled={ending}>{ending ? t.loadingLabel : t.endLiveSession}</button>
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--emerald)", fontWeight: 600, marginBottom: 10 }}>{t.lobbyHint}</div>
          <div ref={containerRef} />
        </div>
      ) : (
        history && history.length > 0 && (
          <div style={{ fontSize: 12.5, color: "#9c9184" }}>
            {history.slice(0, 5).map((s) => (
              <div key={s.id} style={{ padding: "4px 0" }}>
                {s.title || t.liveSession} — {new Date(s.started_at).toLocaleString()}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function AssignmentForm({ t, lang, onCreated, teacherId, classId }) {
  const [level, setLevel] = useState(LEVELS[0]);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const chapters = CURRICULUM[level]?.[subject] || [];
  const [chapter, setChapter] = useState(chapters[0]?.title || "");
  const [difficulty, setDifficulty] = useState(5);
  const [dueDate, setDueDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const list = CURRICULUM[level]?.[subject] || [];
    setChapter(list[0]?.title || "");
  }, [level, subject]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createAssignment({
        teacherId, classId, level, subject, chapter,
        targetDifficulty: Number(difficulty),
        instructions: instructions.trim() || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        timeLimitMinutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
      });
      setDone(true);
      setTimeout(() => onCreated(), 900);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="exercise-card">
      <div style={{ fontSize: 12.5, color: "var(--emerald)", fontWeight: 600, marginBottom: 14 }}>{t.antiCheatNote}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.level}</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>{LEVELS.map((l) => <option key={l} value={l}>{labelFor(l, lang)}</option>)}</select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.subject}</label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>{SUBJECTS.map((s) => <option key={s} value={s}>{labelFor(s, lang)}</option>)}</select>
        </div>
      </div>
      <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.chapter}</label>
      <select value={chapter} onChange={(e) => setChapter(e.target.value)} style={{ marginBottom: 12 }}>
        {chapters.map((c) => <option key={c.title} value={c.title}>{labelFor(c.title, lang)}</option>)}
      </select>
      <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.targetDifficulty}: {difficulty}/10</label>
      <input type="range" min="1" max="10" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={{ width: "100%", marginBottom: 12 }} />
      <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.dueDateOptional}</label>
      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ marginBottom: 12 }} />
      <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.timeLimitOptional}</label>
      <input type="number" min="1" value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(e.target.value)} placeholder={t.timeLimitPlaceholder} style={{ marginBottom: 12 }} />
      <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.instructionsOptional}</label>
      <input type="text" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder={t.instructionsPlaceholder} style={{ marginBottom: 16 }} />
      <button type="submit" className="btn solid" disabled={saving || !chapter}>{saving ? t.loadingLabel : t.assignBtn}</button>
      {done && <div style={{ color: "var(--emerald)", fontSize: 13, marginTop: 10, fontWeight: 600 }}>{t.assignmentCreated}</div>}
    </form>
  );
}

function AssignmentSubmissions({ t, lang, assignment, onBack }) {
  const [rows, setRows] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [releasing, setReleasing] = useState(false);

  const load = useCallback(async () => {
    const r = await getSubmissionsForAssignment(assignment.id);
    setRows(r);
  }, [assignment.id]);

  useEffect(() => { load(); }, [load]);

  const unreleasedCount = (rows || []).filter((r) => r.submitted_at && !r.grade_released).length;

  const release = async () => {
    setReleasing(true);
    try {
      await releaseAssignmentGrades(assignment.id);
      await load();
    } finally {
      setReleasing(false);
    }
  };

  const statusOf = (row) => {
    if (!row) return "pending";
    if (row.submitted_at) return row.grade_status || "graded";
    return "inprogress";
  };
  const statusLabel = (row) => {
    const s = statusOf(row);
    if (s === "pending") return t.notStarted;
    if (s === "inprogress") return t.inProgressStatus;
    if (s === "correct") return t.correct;
    if (s === "partial") return t.partial;
    if (s === "incorrect") return t.incorrect;
    return t.gradedStatus;
  };
  const pillClass = (row) => {
    const s = statusOf(row);
    if (s === "pending") return "pending";
    if (s === "inprogress") return "inprogress";
    return s; // correct | partial | incorrect
  };

  return (
    <div>
      <button className="btn" onClick={onBack} style={{ marginBottom: 16 }}>{t.backToList}</button>
      <div className="exercise-card" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 700 }}>{labelFor(assignment.chapter, lang)}</div>
            <div style={{ fontSize: 12.5, color: "#7a7266" }}>{labelFor(assignment.subject, lang)} · {labelFor(assignment.level, lang)}</div>
            {assignment.time_limit_minutes && <div style={{ fontSize: 12, color: "#9c9184", marginTop: 4 }}>{t.timeLimitLabel} {assignment.time_limit_minutes} {t.minutesLabel}</div>}
          </div>
          <button className="btn solid" onClick={release} disabled={releasing || unreleasedCount === 0}>
            {releasing ? t.loadingLabel : `${t.releaseGrades}${unreleasedCount > 0 ? ` (${unreleasedCount})` : ""}`}
          </button>
        </div>
        {assignment.instructions && <div style={{ fontSize: 13, color: "#4a453c", marginTop: 8 }}>{assignment.instructions}</div>}
      </div>

      {rows === null ? (
        <div style={{ color: "#9c9184" }}>{t.loadingLabel}</div>
      ) : rows.length === 0 ? (
        <div style={{ color: "#9c9184" }}>{t.noMembers}</div>
      ) : (
        rows.map((row) => {
          const isOpen = !!expanded[row.id];
          return (
            <div key={row.id} className="exercise-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 700 }}>{row.studentName}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {row.grade_score != null && <span style={{ fontSize: 13, color: "#7a7266" }}>{row.grade_score}/100</span>}
                  <span className={`pill ${pillClass(row)}`}>{statusLabel(row)}</span>
                  {row.submitted_at && (
                    <span className={`pill ${row.grade_released ? "correct" : "pending"}`}>
                      {row.grade_released ? t.releasedBadge : t.notReleasedBadge}
                    </span>
                  )}
                </div>
              </div>
              {row.exercise_prompt && (
                <>
                  <button className="btn" style={{ marginTop: 12 }} onClick={() => setExpanded({ ...expanded, [row.id]: !isOpen })}>
                    {isOpen ? t.hideSubmission : t.viewSubmission}
                  </button>
                  {isOpen && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--terracotta)", textTransform: "uppercase", marginBottom: 4 }}>{t.exerciseGivenLabel}</div>
                      <div style={{ padding: 12, background: "#F5F0E3", borderRadius: 10, fontSize: 13.5, whiteSpace: "pre-line", marginBottom: 10 }}>{row.exercise_prompt}</div>
                      {row.exercise_solution && (
                        <>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--terracotta)", textTransform: "uppercase", marginBottom: 4 }}>{t.correctSolution}</div>
                          <div style={{ padding: 12, background: "#F5F0E3", borderRadius: 10, fontSize: 13.5, whiteSpace: "pre-line", marginBottom: 10 }}>{row.exercise_solution}</div>
                        </>
                      )}
                      {row.student_answer && (
                        <>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--terracotta)", textTransform: "uppercase", marginBottom: 4 }}>{t.studentAnswerLabel}</div>
                          <div style={{ padding: 12, background: "#F5F0E3", borderRadius: 10, fontSize: 13.5, whiteSpace: "pre-line", marginBottom: 10 }}>{row.student_answer}</div>
                        </>
                      )}
                      {row.grade_feedback && (
                        <>
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--terracotta)", textTransform: "uppercase", marginBottom: 4 }}>{t.feedback}</div>
                          <div style={{ fontSize: 13.5, color: "#4a453c" }}>{row.grade_feedback}</div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
