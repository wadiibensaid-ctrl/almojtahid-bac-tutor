/**
 * Calls our own /api/claude serverless function, which holds the
 * real Anthropic API key server-side and forwards the request.
 * Requires a valid Supabase session token so random visitors can't
 * spend your API credits.
 */
export async function askClaude(prompt, maxTokens, token, task) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt, maxTokens, task }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API request failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.text;
}
