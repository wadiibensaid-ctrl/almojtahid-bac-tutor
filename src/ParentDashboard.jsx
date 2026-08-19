import React, { useState, useEffect, useContext, useCallback } from "react";
import { AuthContext } from "./AuthContext";
import { Frame, HeaderBar, Star8 } from "./ui/Frame";
import { T } from "./lib/i18n";
import { diffBand } from "./lib/helpers";
import { kvList, kvGet } from "./lib/storage";
import { getLinkedChildren, linkChildByCode } from "./lib/profile";
import { labelFor } from "./lib/curriculum";

export default function ParentDashboard({ profile }) {
  const { email, signOut } = useContext(AuthContext);
  const [lang, setLang] = useState("fr");
  const [children, setChildren] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [code, setCode] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState(null);
  const t = T[lang];

  const refreshChildren = useCallback(async () => {
    const list = await getLinkedChildren();
    setChildren(list);
    if (list.length && !selectedId) setSelectedId(list[0].id);
  }, [selectedId]);

  useEffect(() => { refreshChildren(); }, [refreshChildren]);

  const addChild = async (e) => {
    e.preventDefault();
    setLinking(true);
    setLinkError(null);
    try {
      await linkChildByCode(code);
      setCode("");
      await refreshChildren();
    } catch (err) {
      setLinkError(t.invalidCode);
    }
    setLinking(false);
  };

  return (
    <Frame lang={lang}>
      <HeaderBar
        appName={t.appName}
        tagline={t.parentTagline}
        langBtn={t.langBtn}
        onToggleLang={() => setLang(lang === "fr" ? "ar" : "fr")}
        email={email}
        onSignOut={signOut}
        signOutLabel={t.signOut}
      />
      <div style={{ maxWidth: 900, margin: "0 auto", width: "100%", padding: "28px 24px" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, color: "var(--ink)", margin: "0 0 18px" }}>{t.myChildren}</h1>

        {children === null ? (
          <div style={{ color: "#9c9184" }}>{t.loadingLabel}</div>
        ) : (
          <>
            {children.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                {children.map((c) => (
                  <button key={c.id} className={`btn ${selectedId === c.id ? "active" : ""}`} onClick={() => setSelectedId(c.id)}>
                    {c.name || "Élève"}
                  </button>
                ))}
              </div>
            )}

            <div className="exercise-card" style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>{t.addChild}</div>
              <form onSubmit={addChild} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.enterCode}</label>
                  <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="EX4B7Q" />
                </div>
                <button type="submit" className="btn solid" disabled={linking || !code.trim()}>{linking ? t.loadingLabel : t.addChildBtn}</button>
              </form>
              {linkError && <div style={{ color: "var(--terracotta)", fontSize: 13, marginTop: 8 }}>{linkError}</div>}
            </div>

            {children.length === 0 && <div style={{ color: "#9c9184" }}>{t.noChildren}</div>}

            {children.length > 0 && selectedId && <ChildProgress t={t} lang={lang} childId={selectedId} />}
          </>
        )}
      </div>
    </Frame>
  );
}

function ChildProgress({ t, lang, childId }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    (async () => {
      let keys = [];
      try { const r = await kvList("progress:", childId); keys = r?.keys || []; } catch {}
      const data = [];
      for (const k of keys) {
        try {
          const r = await kvGet(k, childId);
          const p = JSON.parse(r.value);
          const [, level, subject, chapter] = k.match(/^progress:(.+?)\|(.+?)\|(.+)$/) || [];
          data.push({ level, subject, chapter, ...p });
        } catch {}
      }
      if (!cancelled) setRows(data);
    })();
    return () => { cancelled = true; };
  }, [childId]);

  if (rows === null) return <div style={{ color: "#9c9184" }}>{t.loadingLabel}</div>;

  if (rows.length === 0) {
    return <div style={{ color: "#9c9184", padding: "20px 0" }}>{t.noChildActivity}</div>;
  }

  const totalAttempts = rows.reduce((s, r) => s + r.total, 0);
  const totalCorrect = rows.reduce((s, r) => s + r.correct, 0);
  const overallAcc = totalAttempts ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const bySubject = {};
  for (const r of rows) {
    bySubject[r.subject] = bySubject[r.subject] || [];
    bySubject[r.subject].push(r);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 10, flexWrap: "wrap" }}>
        <StatCard label={t.overallAccuracy} value={`${overallAcc}%`} />
        <StatCard label={t.totalAttempts} value={totalAttempts} />
        <StatCard label={t.chaptersStarted} value={rows.length} />
      </div>
      <div style={{ fontSize: 12.5, color: "#8a8172", marginBottom: 22, fontStyle: "italic" }}>{t.privacyNote}</div>

      {Object.entries(bySubject).map(([subject, subjectRows]) => (
        <div key={subject} style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, marginBottom: 10, color: "var(--ink)" }}>{labelFor(subject, lang)}</div>
          {subjectRows.map((r) => (
            <div key={r.chapter} className="exercise-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{labelFor(r.chapter, lang)}</div>
                  <div style={{ fontSize: 11.5, color: "#9c9184" }}>{labelFor(r.level, lang)}</div>
                </div>
                <span className={`pill ${diffBand(r.difficulty)}`}>{r.difficulty}/10</span>
              </div>
              <div className="diffbar-track" style={{ marginBottom: 8 }}>
                <div className="diffbar-fill" style={{ width: `${r.difficulty * 10}%` }} />
              </div>
              <div style={{ fontSize: 12.5, color: "#7a7266" }}>{r.total} {t.attempts} · {r.total ? Math.round((r.correct / r.total) * 100) : 0}% {t.accuracy}</div>
            </div>
          ))}
        </div>
      ))}
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
