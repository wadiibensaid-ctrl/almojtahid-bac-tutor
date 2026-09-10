/**
 * Calls our own /api/claude serverless function, which holds the
 * real Anthropic API key server-side and forwards the request.
 * Requires a valid Supabase session token so random visitors can't
 * spend your API credits.
 *
 * bankLookup (optional): { level, subject, chapter, lang, difficultyBand,
 * itemType } — when set, the server tries the pre-generated problem_bank
 * first (free, doesn't count against the daily cap) before falling back
 * to a live call. Only pass this for self-practice/flashcards, never for
 * assignments — see the comment on problem_bank in schema.sql for why.
 */
export async function askClaude(prompt, maxTokens, token, task, bankLookup) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt, maxTokens, task, bankLookup }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API request failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.text;
}
