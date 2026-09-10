import { createClient } from "@supabase/supabase-js";

// Server-side only — service role bypasses RLS, which is fine here since
// problem_bank/batch_jobs have NO client policies at all (see schema.sql) —
// this job is the only thing that ever touches them.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Pilot scope, per the plan agreed for this feature: Mathématiques only,
// across all three levels, both languages. Expand to Physique-Chimie/SVT
// by adding them here once the pipeline's proven out.
const SUBJECT = "Mathématiques";
const CHAPTERS_BY_LEVEL = {
  "Tronc Commun": [
    "Calcul numérique et algébrique", "Ensembles de nombres", "Arithmétique dans N",
    "Ensembles et applications", "La droite dans le plan", "La projection dans le plan",
    "Ordre dans R", "Calcul vectoriel dans le plan", "Transformations du plan",
    "Trigonométrie — angles orientés", "Géométrie dans l'espace", "Statistiques",
  ],
  "1ère Bac": [
    "Généralités sur les fonctions", "Le produit scalaire", "La dérivation",
    "Géométrie dans l'espace — droites et plans", "Les suites numériques",
    "La trigonométrie", "La rotation", "Étude des fonctions", "Le dénombrement", "Les statistiques",
  ],
  "2ème Bac": [
    "Limites et continuité", "Suites numériques", "Fonction logarithme népérien",
    "Dérivabilité et étude de fonctions", "Fonction exponentielle", "Calcul intégral",
    "Les nombres complexes", "Équations différentielles", "Dénombrement et probabilités", "Structures algébriques",
  ],
};
const LANGS = ["fr", "ar"];
const EXERCISE_BANDS = { easy: 2, medium: 5, hard: 9 }; // representative difficultyNum per band

const FLOOR = 3;   // replenish when unused count drops below this
const TARGET = 5;  // ...back up to this many

// Minimal Arabic labels for the chapters/subject above — kept in sync by
// hand with src/lib/curriculum.js's SUBJECTS_AR/CHAPTER_TITLES_AR. This
// file is deliberately self-contained (no cross-import from src/lib) to
// match the rest of this project's api/ files (see weekly-digest.js) and
// avoid depending on how Vercel's function bundler resolves relative
// imports outside api/ — untested territory, not worth the risk here.
const SUBJECT_AR = "الرياضيات";
const LEVEL_AR = {
  "Tronc Commun": "الجذع المشترك",
  "1ère Bac": "الأولى بكالوريا",
  "2ème Bac": "الثانية بكالوريا",
};
const CHAPTER_AR = {
  "Calcul numérique et algébrique": "الحساب العددي والجبري",
  "Ensembles de nombres": "مجموعات الأعداد",
  "Arithmétique dans N": "الحساب في N",
  "Ensembles et applications": "المجموعات والتطبيقات",
  "La droite dans le plan": "المستقيم في المستوى",
  "La projection dans le plan": "الإسقاط في المستوى",
  "Ordre dans R": "الترتيب في R",
  "Calcul vectoriel dans le plan": "الحساب المتجهي في المستوى",
  "Transformations du plan": "التحويلات في المستوى",
  "Trigonométrie — angles orientés": "حساب المثلثات — الزوايا الموجهة",
  "Géométrie dans l'espace": "الهندسة الفضائية",
  "Statistiques": "الإحصاء",
  "Généralités sur les fonctions": "عموميات حول الدوال",
  "Le produit scalaire": "الجداء السلمي",
  "La dérivation": "الاشتقاق",
  "Géométrie dans l'espace — droites et plans": "الهندسة الفضائية — المستقيمات والمستويات",
  "Les suites numériques": "المتتاليات العددية",
  "La trigonométrie": "حساب المثلثات",
  "La rotation": "الدوران",
  "Étude des fonctions": "دراسة الدوال",
  "Le dénombrement": "الترتيب والتوفيق",
  "Les statistiques": "الإحصاء",
  "Limites et continuité": "النهايات والاتصال",
  "Suites numériques": "المتتاليات العددية",
  "Fonction logarithme népérien": "دالة اللوغاريتم النبيري",
  "Dérivabilité et étude de fonctions": "الاشتقاقية ودراسة الدوال",
  "Fonction exponentielle": "الدالة الأسية",
  "Calcul intégral": "حساب التكامل",
  "Les nombres complexes": "الأعداد العقدية",
  "Équations différentielles": "المعادلات التفاضلية",
  "Dénombrement et probabilités": "الترتيب والتوفيق والاحتمالات",
  "Structures algébriques": "البنيات الجبرية",
};

// Same prompt wording as src/lib/ai.js's buildExercisePrompt/
// buildFlashcardsPrompt — keep these two in sync by hand if either changes.
function buildExercisePrompt(level, chapter, lang, band, difficultyNum) {
  return lang === "ar"
    ? `أنت أستاذ مغربي تُعِدّ تمارين للباكالوريا.
ولّد تمرينًا جديدًا واحدًا في مادة "${SUBJECT_AR}" للمستوى "${LEVEL_AR[level]}"، الدرس "${CHAPTER_AR[chapter] || chapter}".
مستوى الصعوبة المستهدف: ${difficultyNum}/10 (فئة "${band}"). كيّف التعقيد بدقة مع هذا المستوى.
مهم: يجب أن يكون نص التمرين (prompt) ونص الحل (solution) مكتوبَين بالكامل باللغة العربية الفصحى، وليس بالفرنسية.
أجب فقط بصيغة JSON صالحة، بدون أي نص قبلها أو بعدها، بدون markdown، بالصيغة الدقيقة التالية:
{"prompt":"...","solution":"...","difficulty":"${band}"}`
    : `Tu es un professeur marocain qui prépare des exercices de baccalauréat.
Génère UN SEUL nouvel exercice de "${SUBJECT}" pour le niveau "${level}", chapitre "${chapter}".
Niveau de difficulté ciblé : ${difficultyNum}/10 (bande "${band}"). Adapte la complexité précisément à ce niveau.
Réponds UNIQUEMENT avec un JSON valide, sans texte avant/après, sans markdown, format exact :
{"prompt":"...","solution":"...","difficulty":"${band}"}`;
}

function buildFlashcardsPrompt(level, chapter, lang) {
  return lang === "ar"
    ? `ولّد بالضبط 4 بطاقات مراجعة جديدة (سؤال/جواب) في مادة "${SUBJECT_AR}" للمستوى "${LEVEL_AR[level]}"، الدرس "${CHAPTER_AR[chapter] || chapter}".
مهم: يجب أن يكون نص الأسئلة والأجوبة مكتوبًا بالكامل باللغة العربية الفصحى، وليس بالفرنسية.
أجب فقط بصيغة JSON صالحة، بالصيغة الدقيقة التالية:
{"items":[{"q":"...","a":"..."}]}`
    : `Génère exactement 4 nouvelles fiches de révision (question/réponse) de "${SUBJECT}" pour le niveau "${level}", chapitre "${chapter}".
Réponds UNIQUEMENT avec un JSON valide, format exact :
{"items":[{"q":"...","a":"..."}]}`;
}

const ANTHROPIC_HEADERS = {
  "x-api-key": process.env.ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
  "content-type": "application/json",
};

export default async function handler(req, res) {
  // Same convention as weekly-digest.js — Vercel Cron sends this
  // automatically when CRON_SECRET is set as a project env var.
  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const collected = await collectFinishedBatches();
    const submitted = await submitReplenishmentBatch();
    return res.status(200).json({ collected, submitted });
  } catch (e) {
    return res.status(500).json({ error: "Batch replenish job failed", detail: String(e) });
  }
}

/** Checks every batch still marked 'submitted' from a previous run; ingests
 *  results for any that have finished, leaves the rest for next time (a
 *  batch can take up to 24h — this job runs once/day, so nothing is lost,
 *  just picked up a day later than the fast-path case). */
async function collectFinishedBatches() {
  const { data: pending, error } = await supabaseAdmin
    .from("batch_jobs")
    .select("*")
    .eq("status", "submitted");
  if (error) throw error;

  let ingested = 0;
  let stillPending = 0;
  let failed = 0;

  for (const job of pending || []) {
    const statusRes = await fetch(`https://api.anthropic.com/v1/messages/batches/${job.id}`, {
      headers: ANTHROPIC_HEADERS,
    });
    if (!statusRes.ok) {
      console.warn(`[batch-replenish] status check failed for ${job.id}: ${await statusRes.text()}`);
      continue;
    }
    const batch = await statusRes.json();
    if (batch.processing_status !== "ended") {
      stillPending++;
      continue;
    }

    const resultsRes = await fetch(batch.results_url, { headers: ANTHROPIC_HEADERS });
    if (!resultsRes.ok) {
      console.warn(`[batch-replenish] results fetch failed for ${job.id}: ${await resultsRes.text()}`);
      await supabaseAdmin.from("batch_jobs").update({ status: "failed" }).eq("id", job.id);
      failed++;
      continue;
    }

    // .jsonl — one JSON object per line, order not guaranteed; match each
    // back to its metadata via custom_id.
    const jsonl = await resultsRes.text();
    const rows = [];
    for (const line of jsonl.split("\n")) {
      if (!line.trim()) continue;
      const result = JSON.parse(line);
      const meta = job.requests_meta[result.custom_id];
      if (!meta) continue; // shouldn't happen, but never crash the whole ingest over one row
      if (result.result.type !== "succeeded") continue; // errored/expired/canceled — just skip

      const text = (result.result.message.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      try {
        const content = JSON.parse(text.replace(/```json|```/g, "").trim());
        rows.push({
          level: meta.level, subject: meta.subject, chapter: meta.chapter,
          lang: meta.lang, difficulty_band: meta.difficulty_band, item_type: meta.item_type,
          content, source: "batch",
        });
      } catch {
        // malformed model output for this one item — skip it, not fatal
      }
    }

    if (rows.length) {
      const { error: insertError } = await supabaseAdmin.from("problem_bank").insert(rows);
      if (insertError) throw insertError;
    }
    await supabaseAdmin.from("batch_jobs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", job.id);
    ingested += rows.length;
  }

  return { ingested, stillPending, failed };
}

/** Tops up any (level, chapter, lang, difficulty_band, item_type) combo
 *  currently below FLOOR unused items, back up to TARGET. Submits at most
 *  one batch per run — if nothing needs replenishing, submits nothing. */
async function submitReplenishmentBatch() {
  const requests = [];
  const requestsMeta = {};
  let counter = 0;

  for (const [level, chapters] of Object.entries(CHAPTERS_BY_LEVEL)) {
    for (const chapter of chapters) {
      for (const lang of LANGS) {
        // Exercises: one combo per difficulty band.
        for (const [band, difficultyNum] of Object.entries(EXERCISE_BANDS)) {
          const need = await neededCount(level, chapter, lang, band, "exercise");
          for (let i = 0; i < need; i++) {
            const customId = `ex-${counter++}`;
            requests.push({
              custom_id: customId,
              params: {
                model: "claude-sonnet-4-6",
                max_tokens: 2500, // match generateExercise (src/lib/ai.js) — 500 truncated medium/hard solutions
                messages: [{ role: "user", content: buildExercisePrompt(level, chapter, lang, band, difficultyNum) }],
              },
            });
            requestsMeta[customId] = { level, subject: SUBJECT, chapter, lang, difficulty_band: band, item_type: "exercise" };
          }
        }
        // Flashcards: single fixed band, one batch of 4 cards per row.
        const need = await neededCount(level, chapter, lang, "medium", "flashcard");
        for (let i = 0; i < need; i++) {
          const customId = `fc-${counter++}`;
          requests.push({
            custom_id: customId,
            params: {
              model: "claude-sonnet-4-6",
              max_tokens: 900,
              messages: [{ role: "user", content: buildFlashcardsPrompt(level, chapter, lang) }],
            },
          });
          requestsMeta[customId] = { level, subject: SUBJECT, chapter, lang, difficulty_band: "medium", item_type: "flashcard" };
        }
      }
    }
  }

  if (requests.length === 0) {
    return { submitted: 0, batchId: null };
  }

  const createRes = await fetch("https://api.anthropic.com/v1/messages/batches", {
    method: "POST",
    headers: ANTHROPIC_HEADERS,
    body: JSON.stringify({ requests }),
  });
  if (!createRes.ok) {
    throw new Error(`Batch create failed: ${await createRes.text()}`);
  }
  const batch = await createRes.json();

  const { error } = await supabaseAdmin.from("batch_jobs").insert({
    id: batch.id,
    status: "submitted",
    requests_meta: requestsMeta,
  });
  if (error) throw error;

  return { submitted: requests.length, batchId: batch.id };
}

async function neededCount(level, chapter, lang, band, itemType) {
  const { count, error } = await supabaseAdmin
    .from("problem_bank")
    .select("id", { count: "exact", head: true })
    .eq("level", level).eq("subject", SUBJECT).eq("chapter", chapter)
    .eq("lang", lang).eq("difficulty_band", band).eq("item_type", itemType)
    .eq("used_count", 0);
  if (error) throw error;
  return (count ?? 0) < FLOOR ? TARGET - (count ?? 0) : 0;
}
