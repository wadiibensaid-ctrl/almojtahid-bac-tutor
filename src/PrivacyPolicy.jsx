import React from "react";
import { fr, ar } from "./lib/privacyContent";

export default function PrivacyPolicy({ lang, onClose }) {
  const content = lang === "ar" ? ar : fr;
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(30,26,20,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFDF7", border: "1.5px solid #D8C9A8", borderRadius: 16,
          padding: 32, maxWidth: 560, maxHeight: "80vh", overflowY: "auto",
          direction: lang === "ar" ? "rtl" : "ltr",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, marginBottom: 4 }}>{content.title}</h1>
        <div style={{ fontSize: 12, color: "#9c9184", marginBottom: 20 }}>{content.updated}</div>
        {content.sections.map((s) => (
          <div key={s.h} style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.h}</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "#4a453d" }}>{s.p}</div>
          </div>
        ))}
        <button className="btn solid" onClick={onClose} style={{ marginTop: 8 }}>
          {lang === "ar" ? "إغلاق" : "Fermer"}
        </button>
      </div>
    </div>
  );
}
