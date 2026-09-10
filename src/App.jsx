import React, { useState, useEffect, useCallback, useMemo, useContext, useRef } from "react";
import AuthGate from "./AuthGate";
import { AuthContext } from "./AuthContext";
import RoleChooser from "./RoleChooser";
import ParentDashboard from "./ParentDashboard";
import { Frame, HeaderBar, Star8 } from "./ui/Frame";
import { T } from "./lib/i18n";
import { uid, chapKey, diffBand, sm2 } from "./lib/helpers";
import { generateExercise, gradeAnswer, generateFlashcards } from "./lib/ai";
import { kvGet, kvSet, kvList } from "./lib/storage";
import { getProfile, getLinkedParents, revokeParent } from "./lib/profile";
import TeacherDashboard from "./TeacherDashboard";
import {
  joinClassByCode, getMyClassesAsStudent, getAssignmentsForStudent,
  getMySubmission, createSubmissionRow, submitAssignmentAnswer,
  getActiveLiveSession, getPastPapers,
} from "./lib/teacher";
import { JITSI_DOMAIN, loadJitsiScript, STUDENT_TOOLBAR_BUTTONS } from "./lib/jitsi";

/* =========================================================================
   ALMOJTAHID — plateforme de tutorat Bac marocain (style LMS / D2L)
   Production build: Supabase auth + storage, backend-proxied AI calls,
   student/parent roles with a read-only aggregate parent dashboard.
   ========================================================================= */

import { LEVELS, SUBJECTS, STREAMS, CURRICULUM, SEED_CONTENT, SEED_CONTENT_AR, labelFor } from "./lib/curriculum";


/* ========================= Root routing (role-aware) ========================= */

export default function App() {
  return (
    <AuthGate>
      <RootRouter />
    </AuthGate>
  );
}

function RootRouter() {
  const { userId } = useContext(AuthContext);
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = none yet
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const p = await getProfile(userId);
      setProfile(p);
    } catch (e) {
      setLoadError(e);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  if (loadError) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F2E8D5", fontFamily: "Inter, sans-serif", color: "#7a7266", flexDirection: "column", gap: 12, padding: 24, textAlign: "center" }}>
        <div>Impossible de charger ton profil. Vérifie ta connexion et réessaie.</div>
        <button onClick={load} style={{ padding: "8px 20px", borderRadius: 999, border: "none", background: "#B5533C", color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Réessayer</button>
      </div>
    );
  }

  if (profile === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F2E8D5", fontFamily: "Inter, sans-serif", color: "#7a7266" }}>
        Chargement…
      </div>
    );
  }
  if (profile === null) return <RoleChooser onDone={setProfile} />;
  if (profile.role === "parent") return <ParentDashboard profile={profile} />;
  if (profile.role === "teacher") return <TeacherDashboard profile={profile} />;
  return <PlatformShell profile={profile} />;
}

/* ========================= Student platform ========================= */

function PlatformShell({ profile }) {
  const { email, signOut } = useContext(AuthContext);
  const [lang, setLang] = useState("fr");
  const [level, setLevel] = useState(LEVELS[0]);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [expandedSubjects, setExpandedSubjects] = useState({ [SUBJECTS[0]]: true });
  const [chapterTitle, setChapterTitle] = useState(null);
  const [tab, setTab] = useState("content");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const t = T[lang];
  const chapters = CURRICULUM[level]?.[subject] || [];
  const chapter = chapters.find((c) => c.title === chapterTitle) || null;
  const seed = chapter ? (lang === "ar" ? SEED_CONTENT_AR : SEED_CONTENT)[chapter.title] : null;

  const selectChapter = (title) => {
    setChapterTitle(title);
    setTab("content");
    setSidebarOpen(false);
  };

  return (
    <Frame lang={lang}>
      <HeaderBar
        appName={t.appName}
        tagline={t.tagline}
        langBtn={t.langBtn}
        onToggleLang={() => setLang(lang === "fr" ? "ar" : "fr")}
        email={email}
        onSignOut={signOut}
        signOutLabel={t.signOut}
      />

      <button className="btn mobile-menu-btn" onClick={() => setSidebarOpen(true)}>☰ {t.level}/{t.subject}</button>

      <div className="dashboard-shell">
        <div className={`sidebar-backdrop ${sidebarOpen ? "open" : ""}`} onClick={() => setSidebarOpen(false)} />
        <div className={`dashboard-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--terracotta)", marginBottom: 6, textTransform: "uppercase" }}>{t.level}</div>
            <select value={level} onChange={(e) => { setLevel(e.target.value); setChapterTitle(null); }}>
              {LEVELS.map((l) => <option key={l} value={l}>{labelFor(l, lang)}</option>)}
            </select>
          </div>
          {SUBJECTS.map((s) => (
            <div key={s} style={{ marginBottom: 4 }}>
              <button className="sidebar-subject" onClick={() => { setSubject(s); setExpandedSubjects({ ...expandedSubjects, [s]: !expandedSubjects[s] }); }}>
                <span>{labelFor(s, lang)}</span>
                <span>{expandedSubjects[s] && subject === s ? "−" : "+"}</span>
              </button>
              {expandedSubjects[s] && subject === s && (
                <div style={{ borderInlineStart: "1.5px solid var(--line)", marginInlineStart: 8 }}>
                  {(CURRICULUM[level]?.[s] || []).map((c) => (
                    <button key={c.title} className={`sidebar-chapter ${chapterTitle === c.title && subject === s ? "active" : ""}`} onClick={() => selectChapter(c.title)}>
                      {labelFor(c.title, lang)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div style={{ marginTop: 18, borderTop: "1.5px solid var(--line)", paddingTop: 10 }}>
            <button className="sidebar-subject" onClick={() => { setChapterTitle(null); setTab("assignments"); setSidebarOpen(false); }}>
              <span>{t.tabAssignments}</span>
            </button>
            <button className="sidebar-subject" onClick={() => { setChapterTitle(null); setTab("pastPapers"); setSidebarOpen(false); }}>
              <span>{t.pastPapersTab}</span>
            </button>
            <button className="sidebar-subject" onClick={() => { setChapterTitle(null); setTab("account"); setSidebarOpen(false); }}>
              <span>{t.tabAccount}</span>
            </button>
          </div>
        </div>

        <div className="dashboard-content">
          {!chapter && tab !== "account" && tab !== "assignments" && tab !== "pastPapers" && (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#9c9184" }}>
              <Star8 size={40} color="var(--line)" style={{ margin: "0 auto 12px" }} />
              <div>{t.pickChapter}</div>
            </div>
          )}

          {!chapter && tab === "account" && <AccountTab t={t} profile={profile} />}
          {!chapter && tab === "assignments" && <AssignmentsTab t={t} lang={lang} />}
          {!chapter && tab === "pastPapers" && <PastPapersView t={t} lang={lang} />}

          {chapter && (
            <>
              <div style={{ fontSize: 12, color: "#8a8172", marginBottom: 4 }}>{labelFor(level, lang)} / {labelFor(subject, lang)}</div>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, color: "var(--ink)", margin: "0 0 18px" }}>{labelFor(chapter.title, lang)}</h1>

              <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
                <button className={`btn ${tab === "content" ? "active" : ""}`} onClick={() => setTab("content")}>{t.tabContent}</button>
                <button className={`btn ${tab === "practice" ? "active" : ""}`} onClick={() => setTab("practice")}>{t.tabPractice}</button>
                <button className={`btn ${tab === "flashcards" ? "active" : ""}`} onClick={() => setTab("flashcards")}>{t.tabFlash}</button>
                <button className={`btn ${tab === "progress" ? "active" : ""}`} onClick={() => setTab("progress")}>{t.tabProgress}</button>
              </div>

              {tab === "content" && <ContentTab t={t} seed={seed} />}
              {tab === "practice" && <PracticeTab t={t} lang={lang} level={level} subject={subject} chapter={chapter.title} />}
              {tab === "flashcards" && <FlashcardsTab t={t} lang={lang} level={level} subject={subject} chapter={chapter.title} seed={seed} />}
              {tab === "progress" && <ProgressTab t={t} lang={lang} level={level} subject={subject} />}
              {tab === "account" && <AccountTab t={t} profile={profile} />}
            </>
          )}
        </div>
      </div>
    </Frame>
  );
}

function ContentTab({ t, seed }) {
  const [open, setOpen] = useState({});
  if (!seed) {
    return (
      <div style={{ padding: 28, textAlign: "center", color: "#7a7266", border: "1.5px dashed var(--line)", borderRadius: 14 }}>
        <div style={{ marginBottom: 8 }}>{t.noContentYet}</div>
        <div style={{ fontSize: 13.5, color: "var(--emerald)", fontWeight: 600 }}>{t.useAI}</div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 17, marginBottom: 14, color: "var(--ink)" }}>{t.keyNotions}</div>
      {seed.notions.map((n, i) => (
        <div key={i} className="exercise-card">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{n.q}</div>
          <div style={{ color: "#5c564c" }}>{n.a}</div>
        </div>
      ))}
      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 17, margin: "24px 0 14px", color: "var(--ink)" }}>{t.lessonExercises}</div>
      {seed.exercises.map((ex, i) => {
        const isOpen = !!open[i];
        return (
          <div key={i} className="exercise-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
              <div style={{ fontWeight: 600, whiteSpace: "pre-line" }}>{ex.prompt}</div>
              <span className={`pill ${ex.difficulty}`}>{t[ex.difficulty + "_"]}</span>
            </div>
            <button className="btn" onClick={() => setOpen({ ...open, [i]: !isOpen })}>{isOpen ? t.hideSolution : t.showSolution}</button>
            {isOpen && <div style={{ marginTop: 12, padding: 14, background: "#F5F0E3", borderRadius: 10, whiteSpace: "pre-line", fontSize: 14, color: "#4a453c" }}>{ex.solution}</div>}
          </div>
        );
      })}
    </div>
  );
}

function PracticeTab({ t, lang, level, subject, chapter }) {
  const { userId, token } = useContext(AuthContext);
  const key = `progress:${chapKey(level, subject, chapter)}`;
  const [progress, setProgress] = useState(null);
  const [current, setCurrent] = useState(null);
  const [loadingEx, setLoadingEx] = useState(false);
  const [answer, setAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await kvGet(key, userId);
        if (!cancelled) setProgress(r ? JSON.parse(r.value) : { difficulty: 3, correct: 0, total: 0, history: [] });
      } catch {
        if (!cancelled) setProgress({ difficulty: 3, correct: 0, total: 0, history: [] });
      }
      setCurrent(null); setResult(null); setAnswer(""); setError(false);
    })();
    return () => { cancelled = true; };
  }, [key, userId]);

  const saveProgress = async (p) => {
    setProgress(p);
    try { await kvSet(key, JSON.stringify(p), userId); } catch {}
  };

  const loadNext = async () => {
    setLoadingEx(true); setError(false); setResult(null); setAnswer("");
    try {
      const ex = await generateExercise({ level, subject, chapter, lang, difficultyNum: progress?.difficulty || 3, token, allowBank: true });
      setCurrent(ex);
    } catch { setError(true); }
    setLoadingEx(false);
  };

  const submit = async () => {
    if (!answer.trim() || !current) return;
    setGrading(true); setError(false);
    try {
      const g = await gradeAnswer({ exercisePrompt: current.prompt, correctSolution: current.solution, studentAnswer: answer, lang, token });
      setResult(g);
      const p = progress || { difficulty: 3, correct: 0, total: 0, history: [] };
      const delta = g.status === "correct" ? 1 : g.status === "incorrect" ? -1 : 0;
      const newDiff = Math.min(10, Math.max(1, p.difficulty + delta));
      const newHistory = [...(p.history || []), { ts: Date.now(), status: g.status, score: g.score }].slice(-30);
      await saveProgress({ difficulty: newDiff, correct: p.correct + (g.status === "correct" ? 1 : 0), total: p.total + 1, history: newHistory });
    } catch { setError(true); }
    setGrading(false);
  };

  if (!progress) return <div style={{ color: "#9c9184" }}>{t.loadingLabel}</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--terracotta)" }}>{t.difficultyLabel}: {progress.difficulty}/10</div>
        <div style={{ flex: 1, minWidth: 120, maxWidth: 220 }} className="diffbar-track">
          <div className="diffbar-fill" style={{ width: `${progress.difficulty * 10}%` }} />
        </div>
        <span className={`pill ${diffBand(progress.difficulty)}`}>{t[diffBand(progress.difficulty) + "_"]}</span>
        {progress.total > 0 && <div style={{ fontSize: 12.5, color: "#7a7266" }}>{progress.total} {t.attempts} · {Math.round((progress.correct / progress.total) * 100)}% {t.accuracy}</div>}
      </div>

      {!current && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <button className="btn solid" onClick={loadNext} disabled={loadingEx}>{loadingEx ? t.grading : t.startPractice}</button>
        </div>
      )}

      {current && (
        <div className="exercise-card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <div style={{ fontWeight: 600, whiteSpace: "pre-line", fontSize: 15.5 }}>{current.prompt}</div>
            <span className={`pill ${current.difficulty}`}>{t[current.difficulty + "_"]}</span>
          </div>

          {!result && (
            <>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--terracotta)", marginBottom: 6, textTransform: "uppercase" }}>{t.yourAnswer}</div>
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={t.answerPlaceholder} />
              <div style={{ marginTop: 12 }}>
                <button className="btn solid" onClick={submit} disabled={grading || !answer.trim()}>{grading ? t.grading : t.submitGrade}</button>
              </div>
            </>
          )}

          {result && (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span className={`pill ${result.status}`}>{t[result.status]}</span>
                <span style={{ fontSize: 13, color: "#7a7266" }}>{result.score}/100</span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--terracotta)", marginBottom: 4, textTransform: "uppercase" }}>{t.feedback}</div>
              <div style={{ marginBottom: 14, color: "#4a453c" }}>{result.feedback}</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--terracotta)", marginBottom: 4, textTransform: "uppercase" }}>{t.correctSolution}</div>
              <div style={{ padding: 14, background: "#F5F0E3", borderRadius: 10, whiteSpace: "pre-line", fontSize: 14, color: "#4a453c", marginBottom: 14 }}>{current.solution}</div>
              <button className="btn solid" onClick={loadNext} disabled={loadingEx}>{loadingEx ? t.grading : t.nextExercise}</button>
            </div>
          )}
        </div>
      )}
      {error && <div style={{ color: "var(--terracotta)", fontSize: 13, marginTop: 10 }}>{t.errorGen}</div>}
    </div>
  );
}

function FlashcardsTab({ t, lang, level, subject, chapter, seed }) {
  const { userId, token } = useContext(AuthContext);
  const srsKey = `srs:${chapKey(level, subject, chapter)}`;
  const deckKey = `deck:${chapKey(level, subject, chapter)}`;
  const [srsMap, setSrsMap] = useState(null);
  const [deck, setDeck] = useState([]);
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [error, setError] = useState(false);

  const baseCards = useMemo(() => (seed ? seed.notions.map((n, i) => ({ id: `base-${i}`, q: n.q, a: n.a })) : []), [seed]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let srs = {};
      let extraDeck = [];
      try { const r = await kvGet(srsKey, userId); srs = r ? JSON.parse(r.value) : {}; } catch {}
      try { const r = await kvGet(deckKey, userId); extraDeck = r ? JSON.parse(r.value) : []; } catch {}
      if (cancelled) return;
      setSrsMap(srs);
      setDeck(extraDeck);
      const all = [...baseCards, ...extraDeck];
      const now = Date.now();
      const due = all.filter((c) => !srs[c.id] || srs[c.id].due <= now);
      due.sort((a, b) => (srs[a.id]?.due || 0) - (srs[b.id]?.due || 0));
      setQueue(due);
      setIdx(0);
      setFlipped(false);
    })();
    return () => { cancelled = true; };
  }, [srsKey, deckKey, baseCards, userId]);

  const rate = async (quality) => {
    const card = queue[idx];
    if (!card) return;
    const newState = sm2(quality, srsMap[card.id]);
    const newSrs = { ...srsMap, [card.id]: newState };
    setSrsMap(newSrs);
    try { await kvSet(srsKey, JSON.stringify(newSrs), userId); } catch {}
    setFlipped(false);
    setIdx(idx + 1);
  };

  const genMore = async () => {
    setGenLoading(true); setError(false);
    try {
      const items = await generateFlashcards({ level, subject, chapter, lang, token, allowBank: true });
      const newCards = items.map((it) => ({ id: uid(), q: it.q, a: it.a }));
      const newDeck = [...deck, ...newCards];
      setDeck(newDeck);
      try { await kvSet(deckKey, JSON.stringify(newDeck), userId); } catch {}
      setQueue([...queue, ...newCards]);
    } catch { setError(true); }
    setGenLoading(false);
  };

  if (srsMap === null) return <div style={{ color: "#9c9184" }}>{t.loadingLabel}</div>;

  const card = queue[idx];
  const remaining = Math.max(0, queue.length - idx);

  return (
    <div>
      <div style={{ fontSize: 13, color: "#7a7266", marginBottom: 16 }}>{remaining} {t.cardsRemaining}</div>

      {card ? (
        <>
          <div className={`flashcard ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(!flipped)}>
            <div className="flashcard-inner">
              <div className="flashcard-face">{card.q}</div>
              <div className="flashcard-face back">{card.a}</div>
            </div>
          </div>
          {!flipped ? (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button className="btn" onClick={() => setFlipped(true)}>{t.flip}</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
              <button className="btn" style={{ borderColor: "var(--terracotta)", color: "var(--terracotta)" }} onClick={() => rate(0)}>{t.again}</button>
              <button className="btn" onClick={() => rate(3)}>{t.hard}</button>
              <button className="btn" onClick={() => rate(4)}>{t.good}</button>
              <button className="btn" style={{ borderColor: "var(--emerald)", color: "var(--emerald)" }} onClick={() => rate(5)}>{t.easy}</button>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--emerald)", fontWeight: 600 }}>{t.allDoneToday}</div>
      )}

      <div style={{ textAlign: "center", marginTop: 30 }}>
        <button className="btn solid" onClick={genMore} disabled={genLoading}>{genLoading ? t.grading : t.generateMoreCards}</button>
        {error && <div style={{ color: "var(--terracotta)", fontSize: 13, marginTop: 8 }}>{t.errorGen}</div>}
      </div>
    </div>
  );
}

function ProgressTab({ t, lang, level, subject }) {
  const { userId } = useContext(AuthContext);
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let keys = [];
      try { const r = await kvList("progress:", userId); keys = r?.keys || []; } catch {}
      const data = [];
      for (const k of keys) {
        if (!k.startsWith(`progress:${level}|${subject}|`)) continue;
        try {
          const r = await kvGet(k, userId);
          const p = JSON.parse(r.value);
          const chapterName = k.split("|")[2];
          data.push({ chapter: chapterName, ...p });
        } catch {}
      }
      if (!cancelled) setRows(data);
    })();
    return () => { cancelled = true; };
  }, [level, subject, userId]);

  if (rows === null) return <div style={{ color: "#9c9184" }}>{t.loadingLabel}</div>;
  if (rows.length === 0) return <div style={{ color: "#9c9184", padding: "20px 0" }}>{t.noProgress}</div>;

  const totalAttempts = rows.reduce((s, r) => s + r.total, 0);
  const totalCorrect = rows.reduce((s, r) => s + r.correct, 0);
  const overallAcc = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label={t.overallAccuracy} value={`${overallAcc}%`} />
        <StatCard label={t.totalAttempts} value={totalAttempts} />
        <StatCard label={t.chaptersStarted} value={rows.length} />
      </div>
      {rows.map((r) => (
        <div key={r.chapter} className="exercise-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontWeight: 700 }}>{labelFor(r.chapter, lang)}</div>
            <span className={`pill ${diffBand(r.difficulty)}`}>{t.difficultyLabel} {r.difficulty}/10</span>
          </div>
          <div className="diffbar-track" style={{ marginBottom: 8 }}>
            <div className="diffbar-fill" style={{ width: `${r.difficulty * 10}%` }} />
          </div>
          <div style={{ fontSize: 12.5, color: "#7a7266" }}>{r.total} {t.attempts} · {r.total ? Math.round((r.correct / r.total) * 100) : 0}% {t.accuracy}</div>
        </div>
      ))}
    </div>
  );
}

/** Polls (not Realtime — see project notes on the SMTP silent-failure saga
 *  that made polling the safer default here) each joined class for an
 *  active live session and shows a join button. The room_name never touches
 *  a URL or gets logged — it's only ever passed straight into the IFrame API. */
function StudentLiveSessions({ t, classes }) {
  const [liveByClass, setLiveByClass] = useState({});
  const [joined, setJoined] = useState(null); // { classId, session } | null
  const containerRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    if (!classes || classes.length === 0) return undefined;
    let cancelled = false;
    const poll = async () => {
      const entries = await Promise.all(
        classes.map(async (c) => {
          try { return [c.id, await getActiveLiveSession(c.id)]; } catch { return [c.id, null]; }
        })
      );
      if (!cancelled) setLiveByClass(Object.fromEntries(entries));
    };
    poll();
    const id = setInterval(poll, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, [classes]);

  useEffect(() => {
    if (!joined || !containerRef.current) return undefined;
    let cancelled = false;
    loadJitsiScript().then(() => {
      if (cancelled || !containerRef.current) return;
      apiRef.current = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
        roomName: joined.session.room_name,
        parentNode: containerRef.current,
        width: "100%",
        height: 480,
        // Screen-share ('desktop') is teacher-only — omitted here, left
        // enabled (default) on the teacher's own embed in TeacherDashboard.
        configOverwrite: { toolbarButtons: STUDENT_TOOLBAR_BUTTONS },
      });
    });
    return () => {
      cancelled = true;
      if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; }
    };
  }, [joined?.session?.id]);

  if (joined) {
    return (
      <div className="exercise-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <span className="pill correct">{t.liveNow}</span>
          <button className="btn" onClick={() => setJoined(null)}>{t.leaveLiveSession}</button>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--emerald)", fontWeight: 600, marginBottom: 10 }}>{t.lobbyWaitHint}</div>
        <div ref={containerRef} />
      </div>
    );
  }

  const activeEntries = (classes || []).filter((c) => liveByClass[c.id]);
  if (activeEntries.length === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      {activeEntries.map((c) => (
        <div key={c.id} className="exercise-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div>
            <span className="pill correct" style={{ marginInlineEnd: 10 }}>{t.liveNow}</span>
            <strong>{c.name}</strong> — {c.teacherName}
          </div>
          <button className="btn solid" onClick={() => setJoined({ classId: c.id, session: liveByClass[c.id] })}>{t.joinLiveSession}</button>
        </div>
      ))}
    </div>
  );
}

/** Read-only for students — same shared library teachers upload to, no
 *  class-scoping (see get_past_papers()/past_papers RLS in schema.sql). */
function PastPapersView({ t, lang }) {
  const [papers, setPapers] = useState(null);
  const [filterLevel, setFilterLevel] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterStream, setFilterStream] = useState("");

  const load = useCallback(async () => {
    const list = await getPastPapers({
      level: filterLevel || undefined,
      subject: filterSubject || undefined,
      stream: filterStream || undefined,
    });
    setPapers(list);
  }, [filterLevel, filterSubject, filterStream]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, color: "var(--ink)", margin: "0 0 22px" }}>{t.pastPapersTab}</h1>

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
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AssignmentsTab({ t, lang }) {
  const { userId, token } = useContext(AuthContext);
  const [classes, setClasses] = useState(null);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [assignments, setAssignments] = useState(null);
  const [openId, setOpenId] = useState(null);

  const refresh = useCallback(async () => {
    const [c, a] = await Promise.all([getMyClassesAsStudent(userId), getAssignmentsForStudent()]);
    setClasses(c);
    setAssignments(a);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const join = async (e) => {
    e.preventDefault();
    setJoining(true); setJoinError(null);
    try {
      await joinClassByCode(code);
      setCode("");
      await refresh();
    } catch {
      setJoinError(t.invalidClassCode);
    }
    setJoining(false);
  };

  const openAssignment = (id) => setOpenId(id === openId ? null : id);

  return (
    <div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, color: "var(--ink)", margin: "0 0 22px" }}>{t.tabAssignments}</h1>

      <StudentLiveSessions t={t} classes={classes} />

      <div className="exercise-card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>{t.joinClass}</div>
        <form onSubmit={join} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.enterClassCode}</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="AB12CD" />
          </div>
          <button type="submit" className="btn solid" disabled={joining || !code.trim()}>{joining ? t.loadingLabel : t.joinClassBtn}</button>
        </form>
        {joinError && <div style={{ color: "var(--terracotta)", fontSize: 13, marginTop: 8 }}>{joinError}</div>}
        {classes && classes.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {classes.map((c) => (
              <span key={c.id} className="pill pending" style={{ padding: "6px 14px" }}>{c.name} — {c.teacherName}</span>
            ))}
          </div>
        )}
      </div>

      {assignments === null ? (
        <div style={{ color: "#9c9184" }}>{t.loadingLabel}</div>
      ) : assignments.length === 0 ? (
        <div style={{ color: "#9c9184" }}>{t.noAssignmentsStudent}</div>
      ) : (
        assignments.map((a) => (
          <AssignmentItem key={a.id} t={t} lang={lang} assignment={a} userId={userId} token={token} isOpen={openId === a.id} onToggle={() => openAssignment(a.id)} />
        ))
      )}
    </div>
  );
}

function formatRemaining(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function AssignmentItem({ t, lang, assignment, userId, token, isOpen, onToggle }) {
  const [submission, setSubmission] = useState(undefined); // undefined = not loaded
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [now, setNow] = useState(Date.now());
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      const existing = await getMySubmission(assignment.id);
      if (cancelled) return;
      if (existing) {
        setSubmission(existing);
      } else {
        // First time opening this assignment: generate THIS student's own
        // unique exercise and store it — this is what makes copying a
        // classmate's answer pointless, since their exercise is different.
        setBusy(true);
        try {
          const ex = await generateExercise({
            level: assignment.level, subject: assignment.subject, chapter: assignment.chapter,
            lang, difficultyNum: assignment.target_difficulty, token,
          });
          const row = await createSubmissionRow(assignment.id, userId, ex);
          if (!cancelled) setSubmission(row);
        } catch {
          if (!cancelled) setError(true);
        }
        setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, assignment, userId, lang, token]);

  // Ticks once a second while open, purely to redrive the countdown display
  // and expiry check below — nothing here is the actual enforcement, see
  // enforce_assignment_time_limit() in schema.sql for that.
  useEffect(() => {
    if (!isOpen) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isOpen]);

  const deadline = submission?.generated_at && assignment.time_limit_minutes
    ? new Date(submission.generated_at).getTime() + assignment.time_limit_minutes * 60000
    : null;
  const remainingMs = deadline !== null ? deadline - now : null;
  const expired = remainingMs !== null && remainingMs <= 0;

  const submit = async (force) => {
    if (!submission || busy) return;
    if (!force && !answer.trim()) return;
    setBusy(true); setError(false); setTimeUp(false);
    try {
      const g = await gradeAnswer({ exercisePrompt: submission.exercise_prompt, correctSolution: submission.exercise_solution, studentAnswer: answer, lang, token });
      const updated = await submitAssignmentAnswer(submission.id, assignment.id, answer, g);
      setSubmission(updated);
    } catch (e) {
      if (String(e?.message || "").includes("Time limit")) setTimeUp(true);
      else setError(true);
    }
    setBusy(false);
  };

  useEffect(() => {
    if (expired && submission && !submission.submitted_at && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      submit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired, submission]);

  const submitted = submission && submission.submitted_at;
  const released = submission && submission.grade_released;

  return (
    <div className="exercise-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{labelFor(assignment.chapter, lang)}</div>
          <div style={{ fontSize: 12.5, color: "#7a7266" }}>{labelFor(assignment.subject, lang)} · {labelFor(assignment.level, lang)}</div>
          {assignment.due_date && <div style={{ fontSize: 12, color: "#9c9184", marginTop: 2 }}>{t.dueDate} {new Date(assignment.due_date).toLocaleDateString()}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {released && <span className={`pill ${submission.grade_status}`}>{t[submission.grade_status]}</span>}
          {submitted && !released && <span className="pill pending">{t.pendingReview}</span>}
          <button className="btn" onClick={onToggle}>{isOpen ? t.hideSubmission : t.openAssignment}</button>
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: 16 }}>
          {assignment.instructions && <div style={{ fontSize: 13, color: "#4a453c", marginBottom: 12, fontStyle: "italic" }}>{assignment.instructions}</div>}

          {submission === undefined || (busy && !submission) ? (
            <div style={{ color: "#9c9184" }}>{t.loadingLabel}</div>
          ) : submission ? (
            <>
              <div style={{ fontWeight: 600, whiteSpace: "pre-line", marginBottom: 14 }}>{submission.exercise_prompt}</div>

              {!submitted ? (
                <>
                  {remainingMs !== null && (
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: expired ? "var(--terracotta)" : "var(--emerald)", marginBottom: 10 }}>
                      {expired ? t.timeUpMessage : `${t.timeRemaining}: ${formatRemaining(remainingMs)}`}
                    </div>
                  )}
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--terracotta)", marginBottom: 6, textTransform: "uppercase" }}>{t.yourAnswer}</div>
                  <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={t.answerPlaceholder} disabled={expired} />
                  <div style={{ marginTop: 12 }}>
                    <button className="btn solid" onClick={() => submit(false)} disabled={busy || !answer.trim() || expired}>{busy ? t.grading : t.submitGrade}</button>
                  </div>
                </>
              ) : released ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span className={`pill ${submission.grade_status}`}>{t[submission.grade_status]}</span>
                    <span style={{ fontSize: 13, color: "#7a7266" }}>{t.yourGrade}: {submission.grade_score}/100</span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--terracotta)", marginBottom: 4, textTransform: "uppercase" }}>{t.feedback}</div>
                  <div style={{ color: "#4a453c" }}>{submission.grade_feedback}</div>
                </>
              ) : (
                <div style={{ color: "#7a7266", fontSize: 13.5 }}>{t.pendingReviewHint}</div>
              )}
            </>
          ) : null}
          {timeUp && <div style={{ color: "var(--terracotta)", fontSize: 13, marginTop: 10 }}>{t.timeUpMessage}</div>}
          {error && <div style={{ color: "var(--terracotta)", fontSize: 13, marginTop: 10 }}>{t.errorGen}</div>}
        </div>
      )}
    </div>
  );
}

function AccountTab({ t, profile }) {
  const [parents, setParents] = useState(null);

  const refresh = useCallback(async () => {
    const list = await getLinkedParents();
    setParents(list);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const revoke = async (parentId) => {
    await revokeParent(parentId);
    refresh();
  };

  return (
    <div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, color: "var(--ink)", margin: "0 0 22px" }}>{t.tabAccount}</h1>

      <div className="exercise-card" style={{ textAlign: "center", padding: 28 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--terracotta)", textTransform: "uppercase", marginBottom: 10 }}>{t.yourInviteCode}</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 36, fontWeight: 700, letterSpacing: "0.15em", color: "var(--ink)", marginBottom: 14 }}>
          {profile.invite_code}
        </div>
        <div style={{ fontSize: 13, color: "#7a7266", maxWidth: 420, margin: "0 auto" }}>{t.inviteCodeHint}</div>
      </div>

      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 17, margin: "24px 0 14px", color: "var(--ink)" }}>{t.parentsWithAccess}</div>
      {parents === null ? (
        <div style={{ color: "#9c9184" }}>{t.loadingLabel}</div>
      ) : parents.length === 0 ? (
        <div style={{ color: "#9c9184" }}>{t.noParentsLinked}</div>
      ) : (
        parents.map((p) => (
          <div key={p.id} className="exercise-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 600 }}>{p.name || "Parent"}</div>
            <button className="btn" style={{ borderColor: "var(--terracotta)", color: "var(--terracotta)" }} onClick={() => revoke(p.id)}>{t.revoke}</button>
          </div>
        ))
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ border: "1.5px solid var(--line)", background: "var(--card-bg)", borderRadius: 14, padding: "16px 22px", minWidth: 140 }}>
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, color: "var(--ink)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#8a8172", textTransform: "uppercase", letterSpacing: ".03em" }}>{label}</div>
    </div>
  );
}
