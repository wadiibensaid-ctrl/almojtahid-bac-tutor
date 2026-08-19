import React, { useState, useContext } from "react";
import { AuthContext } from "./AuthContext";
import { createProfile } from "./lib/profile";
import { Frame, HeaderBar, Star8 } from "./ui/Frame";
import { T } from "./lib/i18n";

export default function RoleChooser({ onDone }) {
  const { userId, email, signOut } = useContext(AuthContext);
  const [lang, setLang] = useState("fr");
  const [role, setRole] = useState(null); // 'student' | 'parent' | null
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const t = T[lang];

  const confirm = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const profile = await createProfile(userId, role, name.trim());
      onDone(profile);
    } catch (err) {
      setError(err.message || String(err));
      setSaving(false);
    }
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
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "var(--card-bg)", border: "1.5px solid var(--line)", borderRadius: 18, padding: 32, width: 360, textAlign: "center" }}>
          <Star8 size={34} style={{ margin: "0 auto 14px" }} />
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 22, margin: "0 0 4px", color: "var(--ink)" }}>{t.welcomeTitle}</h1>
          <p style={{ color: "#7a7266", fontSize: 14, marginBottom: 22 }}>{t.welcomeSubtitle}</p>

          {!role && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button className="btn solid" onClick={() => setRole("student")}>{t.iAmStudent}</button>
              <button className="btn" onClick={() => setRole("parent")}>{t.iAmParent}</button>
              <button className="btn" onClick={() => setRole("teacher")}>{t.iAmTeacher}</button>
            </div>
          )}

          {role && (
            <form onSubmit={confirm} style={{ textAlign: "start" }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: "var(--terracotta)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                {role === "student" ? t.yourName : role === "teacher" ? t.teacherName : t.parentName}
              </label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} style={{ marginBottom: 14 }} />
              <button type="submit" className="btn solid" style={{ width: "100%" }} disabled={saving}>
                {saving ? t.loadingLabel : t.continueBtn}
              </button>
              {error && <p style={{ color: "var(--terracotta)", fontSize: 13, marginTop: 10 }}>{error}</p>}
            </form>
          )}
        </div>
      </div>
    </Frame>
  );
}
