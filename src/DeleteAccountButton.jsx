import React, { useContext, useState } from "react";
import { AuthContext } from "./AuthContext";
import { deleteMyAccount } from "./lib/account";

/** Self-service erasure (Loi 09-08 right to erasure). Requires typing the
 *  account's own email before the delete call fires, since this is
 *  irreversible — cascades through every table the account owns. */
export default function DeleteAccountButton({ t }) {
  const { email, token, signOut } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);

  const canDelete = confirmText.trim().toLowerCase() === (email || "").toLowerCase();

  const handleDelete = async () => {
    setDeleting(true);
    setError(false);
    try {
      await deleteMyAccount(token);
      signOut();
    } catch {
      setError(true);
      setDeleting(false);
    }
  };

  if (!open) {
    return (
      <button
        className="btn"
        style={{ borderColor: "var(--terracotta)", color: "var(--terracotta)" }}
        onClick={() => setOpen(true)}
      >
        {t.deleteAccountBtn}
      </button>
    );
  }

  return (
    <div className="exercise-card" style={{ borderColor: "var(--terracotta)" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{t.deleteAccountConfirmTitle}</div>
      <div style={{ fontSize: 13, color: "#7a7266", marginBottom: 14 }}>{t.deleteAccountConfirmBody}</div>
      <input
        type="email"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={email}
        style={{ marginBottom: 12 }}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          className="btn solid"
          style={{ background: "var(--terracotta)" }}
          disabled={!canDelete || deleting}
          onClick={handleDelete}
        >
          {deleting ? t.loadingLabel : t.deleteAccountConfirmBtn}
        </button>
        <button className="btn" onClick={() => { setOpen(false); setConfirmText(""); setError(false); }}>
          {t.cancel}
        </button>
      </div>
      {error && <div style={{ color: "var(--terracotta)", fontSize: 13, marginTop: 10 }}>{t.errorGen}</div>}
    </div>
  );
}
