const KEY = "almojtahid_src";

/** First-touch traffic source from ?src=… (e.g. almojtahid.ma/?src=pc). Kept
 *  in localStorage so it survives the trip to the email inbox and back. */
export function captureSource() {
  try {
    const raw = new URLSearchParams(window.location.search).get("src");
    const src = raw && raw.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
    if (src && !localStorage.getItem(KEY)) localStorage.setItem(KEY, src);
  } catch {
    // storage blocked (private mode etc.) — tracking is best-effort
  }
}

export function getSource() {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}
