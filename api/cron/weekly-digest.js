import { createClient } from "@supabase/supabase-js";

// Server-side only — service role bypasses RLS, which is fine here since
// this job legitimately needs to read across all users to build digests.
// It never writes anything and never returns raw data to a client.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WEEK_MS = 7 * 86400000;

export default async function handler(req, res) {
  // Vercel Cron sends this bearer token automatically when CRON_SECRET is
  // set as a project env var — this stops anyone else from triggering
  // mass emails by just requesting the URL.
  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { data: links, error: linksError } = await supabaseAdmin
      .from("parent_links")
      .select("parent_id, student_id, profiles!parent_links_student_id_fkey(display_name)")
      .eq("status", "active");
    if (linksError) throw linksError;

    // Group by parent so each parent gets exactly one email covering all their children.
    const byParent = {};
    for (const link of links || []) {
      byParent[link.parent_id] = byParent[link.parent_id] || [];
      byParent[link.parent_id].push({ id: link.student_id, name: link.profiles?.display_name || "Élève" });
    }

    let sent = 0;
    let skippedEmpty = 0;
    const failures = [];

    for (const [parentId, children] of Object.entries(byParent)) {
      try {
        const childSummaries = [];
        for (const child of children) {
          const summary = await buildChildWeeklySummary(child.id);
          if (summary.totalWeeklyAttempts > 0) {
            childSummaries.push({ name: child.name, ...summary });
          }
        }

        // Don't send an empty digest — a "nothing happened" email trains
        // parents to ignore the next one. Silence this week is fine.
        if (childSummaries.length === 0) {
          skippedEmpty++;
          continue;
        }

        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(parentId);
        if (userError || !userData?.user?.email) throw new Error("no parent email");

        await sendDigestEmail(userData.user.email, childSummaries);
        sent++;
      } catch (e) {
        failures.push({ parentId, error: String(e) });
      }
    }

    return res.status(200).json({ sent, skippedEmpty, failures });
  } catch (e) {
    return res.status(500).json({ error: "Digest job failed", detail: String(e) });
  }
}

async function buildChildWeeklySummary(studentId) {
  const { data: rows, error } = await supabaseAdmin
    .from("kv_store")
    .select("key, value")
    .eq("owner", studentId)
    .like("key", "progress:%");
  if (error) throw error;

  const cutoff = Date.now() - WEEK_MS;
  const chapters = [];
  let totalWeeklyAttempts = 0;
  let totalWeeklyCorrect = 0;

  for (const row of rows || []) {
    let p;
    try { p = JSON.parse(row.value); } catch { continue; }
    const match = row.key.match(/^progress:(.+?)\|(.+?)\|(.+)$/);
    if (!match) continue;
    const [, level, subject, chapter] = match;

    const weekly = (p.history || []).filter((h) => h.ts >= cutoff);
    if (weekly.length === 0) continue;

    const weeklyCorrect = weekly.filter((h) => h.status === "correct").length;
    totalWeeklyAttempts += weekly.length;
    totalWeeklyCorrect += weeklyCorrect;

    chapters.push({
      level, subject, chapter,
      attempts: weekly.length,
      accuracy: Math.round((weeklyCorrect / weekly.length) * 100),
      difficulty: p.difficulty,
    });
  }

  return { totalWeeklyAttempts, totalWeeklyCorrect, chapters };
}

async function sendDigestEmail(toEmail, childSummaries) {
  const html = renderDigestHtml(childSummaries);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: toEmail,
      subject: "Résumé de la semaine — Almojtahid",
      html,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend error: ${detail}`);
  }
}

function renderDigestHtml(childSummaries) {
  const sections = childSummaries
    .map((child) => {
      const overallAcc = child.totalWeeklyAttempts
        ? Math.round((child.totalWeeklyCorrect / child.totalWeeklyAttempts) * 100)
        : 0;
      const rows = child.chapters
        .map(
          (c) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #D8C9A8;">
            <div style="font-weight:600;color:#1B3A5C;">${escapeHtml(c.chapter)}</div>
            <div style="font-size:12px;color:#8a8172;">${escapeHtml(c.subject)} · ${escapeHtml(c.level)}</div>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #D8C9A8;text-align:right;font-size:13px;color:#4a453c;">
            ${c.attempts} exercice(s) · ${c.accuracy}% · niveau ${c.difficulty}/10
          </td>
        </tr>`
        )
        .join("");

      return `
      <div style="margin-bottom:28px;">
        <h2 style="font-family:Georgia,serif;color:#1B3A5C;font-size:18px;margin:0 0 4px;">${escapeHtml(child.name)}</h2>
        <p style="color:#7a7266;font-size:13px;margin:0 0 12px;">
          ${child.totalWeeklyAttempts} exercice(s) cette semaine · ${overallAcc}% de précision
        </p>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
      </div>`;
    })
    .join("");

  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#F2E8D5;">
    <div style="background:#1B3A5C;padding:20px 24px;border-radius:12px 12px 0 0;">
      <div style="color:#F2E8D5;font-family:Georgia,serif;font-size:20px;font-weight:700;">Almojtahid</div>
      <div style="color:#E8A33D;font-size:12px;">Résumé de la semaine</div>
    </div>
    <div style="background:#FFFDF7;padding:24px;border-radius:0 0 12px 12px;">
      ${sections}
      <p style="font-size:11.5px;color:#9c9184;font-style:italic;margin-top:20px;">
        Ce résumé montre la progression globale (précision, niveau de difficulté, nombre d'exercices) —
        jamais les réponses détaillées de votre enfant, pour préserver un espace d'apprentissage sans jugement.
      </p>
    </div>
  </div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
