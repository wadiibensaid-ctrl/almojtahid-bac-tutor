import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { AuthContext } from "./AuthContext";
import PrivacyPolicy from "./PrivacyPolicy";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [consent, setConsent] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div style={pageStyle}><div style={cardStyle}>Chargement…</div></div>;
  }

  if (!session) {
    const sendLink = async (e) => {
      e.preventDefault();
      if (!consent) return;
      setError(null);
      const { error: err } = await supabase.auth.signInWithOtp({ email });
      if (err) setError(err.message);
      else setSent(true);
    };
    return (
      <div style={pageStyle}>
        {showPrivacy && <PrivacyPolicy lang="fr" onClose={() => setShowPrivacy(false)} />}
        <form onSubmit={sendLink} style={cardStyle}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 24, marginBottom: 6 }}>Almojtahid</h1>
          <p style={{ color: "#6b6459", marginBottom: 20, fontSize: 14 }}>
            Connecte-toi avec ton email — aucun mot de passe nécessaire.
          </p>
          {sent ? (
            <p style={{ color: "#2E6E5E", fontWeight: 600 }}>
              Lien de connexion envoyé à {email}. Vérifie ta boîte mail (et les spams).
            </p>
          ) : (
            <>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton.email@exemple.com"
                style={inputStyle}
              />
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "#6b6459", marginBottom: 14, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <span>
                  J'ai lu et j'accepte la{" "}
                  <a href="#" onClick={(e) => { e.preventDefault(); setShowPrivacy(true); }} style={{ color: "#B5533C" }}>
                    politique de confidentialité
                  </a>
                  . Si j'ai moins de 18 ans, je confirme avoir l'autorisation de mon parent ou tuteur légal pour créer ce compte.
                </span>
              </label>
              <button type="submit" style={btnStyle} disabled={!consent}>Recevoir un lien de connexion</button>
              {error && <p style={{ color: "#B5533C", fontSize: 13, marginTop: 10 }}>{error}</p>}
            </>
          )}
        </form>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        userId: session.user.id,
        token: session.access_token,
        email: session.user.email,
        signOut: () => supabase.auth.signOut(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#F2E8D5",
  fontFamily: "Inter, sans-serif",
};
const cardStyle = {
  background: "#FFFDF7",
  border: "1.5px solid #D8C9A8",
  borderRadius: 16,
  padding: 32,
  width: 340,
};
const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1.5px solid #D8C9A8",
  fontSize: 14,
  marginBottom: 12,
  fontFamily: "inherit",
};
const btnStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 999,
  border: "none",
  background: "#B5533C",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
