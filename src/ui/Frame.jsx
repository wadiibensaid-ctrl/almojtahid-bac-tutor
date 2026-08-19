import React from "react";
import { FeedbackWidget } from "./FeedbackWidget";

export function Star8({ size = 24, color = "var(--saffron)", filled = true, style = {} }) {
  const pts = [];
  const n = 8, outerR = size / 2, innerR = outerR * 0.42;
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / n) * i - Math.PI / 2;
    pts.push(`${outerR + r * Math.cos(angle)},${outerR + r * Math.sin(angle)}`);
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={style}>
      <polygon points={pts.join(" ")} fill={filled ? color : "none"} stroke={color} strokeWidth={filled ? 0 : 1.5} strokeLinejoin="round" />
    </svg>
  );
}

export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=Cairo:wght@400;600;700&display=swap');
  * { box-sizing: border-box; }
  .btn { cursor:pointer; border:1.5px solid var(--ink); background:transparent; color:var(--ink); border-radius:999px; padding:8px 18px; font-size:14px; font-weight:600; transition:all .15s ease; font-family:inherit; }
  .btn:hover { background:var(--ink); color:var(--sand); }
  .btn.active { background:var(--ink); color:var(--sand); }
  .btn.solid { background:var(--terracotta); border-color:var(--terracotta); color:#fff; }
  .btn.solid:hover { background:#96432f; border-color:#96432f; }
  .btn:disabled { opacity:.5; cursor:not-allowed; }
  select, input[type=text], input[type=email] { font-family:inherit; font-weight:600; border:1.5px solid var(--ink); border-radius:10px; padding:8px 12px; background:var(--card-bg); color:var(--ink); font-size:14px; width:100%; }
  .sidebar-subject { width:100%; text-align:start; background:none; border:none; padding:10px 8px; font-weight:700; font-size:13px; color:var(--ink); cursor:pointer; display:flex; justify-content:space-between; align-items:center; font-family:inherit; text-transform:uppercase; letter-spacing:.03em; }
  .sidebar-chapter { width:100%; text-align:start; background:none; border:none; border-inline-start:3px solid transparent; padding:9px 14px; font-size:13.5px; color:#4a453c; cursor:pointer; font-family:inherit; line-height:1.35; }
  .sidebar-chapter:hover { background:#EDE3CB; }
  .sidebar-chapter.active { border-inline-start-color:var(--terracotta); background:#EDE3CB; color:var(--ink); font-weight:700; }
  .flashcard { perspective:1200px; cursor:pointer; height:240px; }
  .flashcard-inner { position:relative; width:100%; height:100%; transition:transform .5s; transform-style:preserve-3d; }
  .flashcard.flipped .flashcard-inner { transform:rotateY(180deg); }
  .flashcard-face { position:absolute; inset:0; backface-visibility:hidden; border-radius:18px; border:1.5px solid var(--line); background:var(--card-bg); display:flex; align-items:center; justify-content:center; text-align:center; padding:28px; font-size:18px; line-height:1.5; box-shadow:0 4px 0 var(--line); }
  .flashcard-face.back { transform:rotateY(180deg); background:var(--ink); color:var(--sand); border-color:var(--ink); }
  .exercise-card { border:1.5px solid var(--line); background:var(--card-bg); border-radius:14px; padding:20px; margin-bottom:16px; }
  .pill { font-size:11px; font-weight:700; padding:3px 10px; border-radius:999px; text-transform:uppercase; letter-spacing:.03em; }
  .pill.easy { background:#E3F0E9; color:var(--emerald); }
  .pill.medium { background:#FBEBD2; color:var(--saffron); }
  .pill.hard { background:#F5DFDA; color:var(--terracotta); }
  .pill.correct { background:#E3F0E9; color:var(--emerald); }
  .pill.partial { background:#FBEBD2; color:var(--saffron); }
  .pill.incorrect { background:#F5DFDA; color:var(--terracotta); }
  .pill.pending { background:#E8E2D3; color:#8a8172; }
  .pill.inprogress { background:#DCE6EE; color:var(--ink); }
  textarea { width:100%; font-family:inherit; font-size:14px; border:1.5px solid var(--line); border-radius:12px; padding:14px; resize:vertical; min-height:100px; background:var(--card-bg); }
  .diffbar-track { height:8px; background:var(--line); border-radius:999px; overflow:hidden; }
  .diffbar-fill { height:100%; background:var(--terracotta); transition:width .3s; }

  /* Dashboard shell: fixed-width sidebar + content, used by the student
     and teacher dashboards. Below 768px there's no room for a fixed
     sidebar next to content, so it becomes an off-canvas panel toggled by
     .mobile-menu-btn instead of always being visible. */
  .dashboard-shell { display:flex; flex:1; max-width:1200px; margin:0 auto; width:100%; position:relative; }
  .dashboard-sidebar { flex-shrink:0; border-inline-end:1.5px solid var(--line); padding:18px; background:#EDE3CB44; overflow-y:auto; }
  .dashboard-content { flex:1; padding:24px 28px; min-width:0; }
  .mobile-menu-btn { display:none; }
  .sidebar-backdrop { display:none; }

  @media (max-width: 768px) {
    .mobile-menu-btn { display:inline-flex; margin:14px 14px 0; }
    .dashboard-sidebar {
      position:fixed; inset-block:0; inset-inline-start:0; z-index:60;
      width:82vw; max-width:300px; background:var(--sand);
      box-shadow:4px 0 20px rgba(0,0,0,.15);
      transform:translateX(-100%); transition:transform .25s ease;
    }
    [dir="rtl"] .dashboard-sidebar { transform:translateX(100%); box-shadow:-4px 0 20px rgba(0,0,0,.15); }
    .dashboard-sidebar.open { transform:translateX(0); }
    .dashboard-content { padding:16px; }
    .sidebar-backdrop.open { display:block; position:fixed; inset:0; background:rgba(27,58,92,.45); z-index:50; }
  }
`;

const STYLE_VARS = {
  "--sand": "#F2E8D5", "--ink": "#1B3A5C", "--saffron": "#E8A33D",
  "--terracotta": "#B5533C", "--emerald": "#2E6E5E", "--charcoal": "#2A2420",
  "--line": "#D8C9A8", "--card-bg": "#FFFDF7",
};

/** Outer page shell: palette, fonts, RTL direction, global CSS. */
export function Frame({ lang, children }) {
  const isRTL = lang === "ar";
  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{ ...STYLE_VARS, minHeight: "100vh", background: "var(--sand)", color: "var(--charcoal)", fontFamily: isRTL ? "'Cairo', sans-serif" : "'Inter', sans-serif", display: "flex", flexDirection: "column" }}
    >
      <style>{GLOBAL_CSS}</style>
      {children}
      <FeedbackWidget lang={lang} />
    </div>
  );
}

/** Top bar: logo, tagline, optional email, language toggle, sign out. */
export function HeaderBar({ appName, tagline, langBtn, onToggleLang, email, onSignOut, signOutLabel }) {
  return (
    <div style={{ background: "var(--ink)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Star8 size={26} color="var(--saffron)" />
        <div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 700, color: "var(--sand)" }}>{appName}</div>
          <div style={{ fontSize: 12, color: "var(--saffron)" }}>{tagline}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {email && <span style={{ fontSize: 12.5, color: "var(--sand)", opacity: 0.8 }}>{email}</span>}
        <button className="btn" style={{ borderColor: "var(--saffron)", color: "var(--saffron)" }} onClick={onToggleLang}>{langBtn}</button>
        <button className="btn" style={{ borderColor: "var(--sand)", color: "var(--sand)" }} onClick={onSignOut}>{signOutLabel}</button>
      </div>
    </div>
  );
}
