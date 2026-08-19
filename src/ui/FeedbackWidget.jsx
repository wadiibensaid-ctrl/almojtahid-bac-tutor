import React, { useContext, useState } from "react";
import { AuthContext } from "../AuthContext";
import { T } from "../lib/i18n";
import { submitFeedback } from "../lib/feedback";

/** Floating "send feedback" button + form, rendered once inside Frame so
 * it's available on every screen regardless of role. */
export function FeedbackWidget({ lang }) {
  const { userId } = useContext(AuthContext);
  const t = T[lang];
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const close = () => {
    setOpen(false);
    setSent(false);
    setError(false);
    setCategory("bug");
    setMessage("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError(false);
    try {
      await submitFeedback({ userId, category, message });
      setSent(true);
      setMessage("");
    } catch {
      setError(true);
    }
    setSending(false);
  };

  return (
    <>
      <button
        className="btn solid"
        onClick={() => setOpen(true)}
        style={{ position: "fixed", insetInlineEnd: 24, insetBlockEnd: 24, zIndex: 40, boxShadow: "0 4px 14px rgba(0,0,0,.2)" }}
      >
        {t.sendFeedback}
      </button>

      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(27,58,92,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}
          onClick={close}
        >
          <div className="exercise-card" style={{ maxWidth: 420, width: "100%", margin: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 17, marginBottom: 14, color: "var(--ink)" }}>{t.feedbackTitle}</div>

            {sent ? (
              <>
                <div style={{ color: "var(--emerald)", fontWeight: 600, marginBottom: 16 }}>{t.feedbackSent}</div>
                <button className="btn" onClick={close}>{t.feedbackClose}</button>
              </>
            ) : (
              <form onSubmit={submit}>
                <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.feedbackCategory}</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ marginBottom: 12 }}>
                  <option value="bug">{t.feedbackCategoryBug}</option>
                  <option value="suggestion">{t.feedbackCategorySuggestion}</option>
                  <option value="other">{t.feedbackCategoryOther}</option>
                </select>

                <label style={{ fontSize: 12, color: "#7a7266", display: "block", marginBottom: 4 }}>{t.feedbackMessage}</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t.feedbackPlaceholder} style={{ marginBottom: 14 }} />

                {error && <div style={{ color: "var(--terracotta)", fontSize: 13, marginBottom: 10 }}>{t.errorGen}</div>}

                <div style={{ display: "flex", gap: 10 }}>
                  <button type="submit" className="btn solid" disabled={sending || !message.trim()}>
                    {sending ? t.loadingLabel : t.feedbackSubmit}
                  </button>
                  <button type="button" className="btn" onClick={close}>{t.feedbackClose}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
