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

  // 2. Validate input.
  const { prompt, maxTokens, task, bankLookup } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing or invalid prompt" });
  }
  const model = MODELS[task] || MODELS.generate;

  // 1b. Bank check — self-practice/flashcards only (bankLookup is only ever
  // sent for those, never assignments; see the comment on problem_bank in
  // schema.sql). A hit costs nothing and doesn't count against the daily
  // cap, which is the whole point: it's pre-paid, off-peak, half-price
  // content, so serving it for free here is a real saving, not just a
  // shortcut. A miss falls through to the normal metered path below.
  if (bankLookup && task !== "grade") {
    const { data: bankRow, error: bankError } = await supabaseAdmin.rpc("claim_bank_item", {
      p_level: bankLookup.level,
      p_subject: bankLookup.subject,
      p_chapter: bankLookup.chapter,
      p_lang: bankLookup.lang,
      p_difficulty_band: bankLookup.difficultyBand,
      p_item_type: bankLookup.itemType,
    });
    if (bankError) {
      console.warn("[claude] bank lookup error, falling back to live:", bankError.message);
    } else if (bankRow?.id) {
      return res.status(200).json({ text: JSON.stringify(bankRow.content), model: "problem-bank", bank: true });
    }
  }

  // 1c. Enforce the daily cap via an atomic Postgres increment (see
  // increment_usage() in supabase/schema.sql) — a JS read-then-write would
  // let concurrent requests from the same user race past the cap. Only
  // reached on a bank miss (or no bankLookup at all), so a bank hit above
  // never touches the cap.
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
        // Ceiling 3000 so generateExercise's 2500 request has headroom
        // (raised from 1500 after the eval showed hard exercises still
        // truncating); grading still asks for 500 and is unaffected.
        max_tokens: Math.min(Number(maxTokens) || 800, 3000),
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

    // Opportunistic write-back: this was a bank miss, so stash the live
    // result for next time. Best-effort — a parse failure or write error
    // here must never fail the actual response the student is waiting on.
    if (bankLookup) {
      try {
        const content = JSON.parse(text.replace(/```json|```/g, "").trim());
        await supabaseAdmin.from("problem_bank").insert({
          level: bankLookup.level,
          subject: bankLookup.subject,
          chapter: bankLookup.chapter,
          lang: bankLookup.lang,
          difficulty_band: bankLookup.difficultyBand,
          item_type: bankLookup.itemType,
          content,
          source: "live-fallback",
        });
      } catch (e) {
        console.warn("[claude] bank write-back skipped:", e.message);
      }
    }

    return res.status(200).json({ text, model: data.model });
  } catch (e) {
    return res.status(500).json({ error: "Server error", detail: String(e) });
  }
}
