import { createClient } from "@supabase/supabase-js";

// Server-side only — uses the SERVICE ROLE key, never exposed to the browser.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Max Claude API calls per user per day (one practice round = 2 calls:
// generate + grade). Tune this to your budget — see README "Cost awareness".
const DAILY_REQUEST_CAP = 50;

// Model per task, chosen server-side from a fixed whitelist — the client
// sends a task name, never a raw model string, so it can't request an
// arbitrary (more expensive) model. Grading compares a student's answer
// against a known reference solution, a task well within a cheaper model;
// generation (exercises, flashcards) stays on the stronger model since
// quality there is user-facing content, not a pass/fail comparison.
const MODELS = {
  generate: "claude-sonnet-4-6",
  grade: "claude-haiku-4-5",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1. Verify the caller has a real, logged-in Supabase session.
  //    This is what stops random visitors from burning your API credits.
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }
  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !userData?.user) {
    return res.status(401).json({ error: "Invalid session" });
  }

  // 1b. Enforce the daily cap via an atomic Postgres increment (see
  // increment_usage() in supabase/schema.sql) — a JS read-then-write would
  // let concurrent requests from the same user race past the cap.
  const { data: newCount, error: usageError } = await supabaseAdmin.rpc("increment_usage", {
    p_user_id: userData.user.id,
  });
  if (usageError) {
    return res.status(500).json({ error: "Usage check failed", detail: usageError.message });
  }
  if (newCount > DAILY_REQUEST_CAP) {
    return res.status(429).json({
      error: "Daily limit reached",
      detail: `You've used ${newCount - 1}/${DAILY_REQUEST_CAP} requests today. Try again tomorrow.`,
    });
  }

  // 2. Validate input.
  const { prompt, maxTokens, task } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing or invalid prompt" });
  }
  const model = MODELS[task] || MODELS.generate;

  // 3. Forward to Anthropic using the real key, which lives only here.
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: Math.min(Number(maxTokens) || 800, 1500),
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(502).json({ error: "Anthropic API error", detail });
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    console.log(
      `[claude] task=${task || "generate"} model=${data.model} in=${data.usage?.input_tokens} out=${data.usage?.output_tokens} promptStart=${JSON.stringify(prompt.slice(0, 40))}`
    );

    return res.status(200).json({ text, model: data.model });
  } catch (e) {
    return res.status(500).json({ error: "Server error", detail: String(e) });
  }
}
