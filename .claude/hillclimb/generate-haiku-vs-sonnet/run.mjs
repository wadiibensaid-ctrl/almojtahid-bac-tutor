// Eval runner: claude-sonnet-4-6 (baseline, current production model for
// task=generate) vs claude-haiku-4-5 (v1, candidate) on exercise
// generation, graded by claude-opus-5 (neutral — not one of the two
// candidates under comparison) for correctness, target-language
// consistency, and difficulty calibration.
//
// Usage: node run.mjs --variant baseline|v1 [--only case-00,case-01] [--pilot 3]
import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CASES = JSON.parse(fs.readFileSync(path.join(HERE, "cases.json")));

const VARIANTS = {
  baseline: "claude-sonnet-4-6",
  v1: "claude-haiku-4-5",
};
const JUDGE_MODEL = "claude-opus-5";
const WALL_CLOCK_CEILING_MS = 60_000;
const MAX_RETRIES = 4;

// ---- Same prompt template as src/lib/ai.js buildExercisePrompt — kept in
// sync by hand (see the same note in api/cron/batch-replenish.js). ----
const SUBJECT_AR = "الرياضيات";
const LEVEL_AR = { "Tronc Commun": "الجذع المشترك", "1ère Bac": "الأولى بكالوريا", "2ème Bac": "الثانية بكالوريا" };
const CHAPTER_AR = {
  "Calcul numérique et algébrique": "الحساب العددي والجبري", "Ensembles de nombres": "مجموعات الأعداد",
  "Arithmétique dans N": "الحساب في N", "Ensembles et applications": "المجموعات والتطبيقات",
  "La droite dans le plan": "المستقيم في المستوى", "La projection dans le plan": "الإسقاط في المستوى",
  "Ordre dans R": "الترتيب في R", "Calcul vectoriel dans le plan": "الحساب المتجهي في المستوى",
  "Transformations du plan": "التحويلات في المستوى", "Trigonométrie — angles orientés": "حساب المثلثات — الزوايا الموجهة",
  "Géométrie dans l'espace": "الهندسة الفضائية", "Statistiques": "الإحصاء",
  "Généralités sur les fonctions": "عموميات حول الدوال", "Le produit scalaire": "الجداء السلمي",
  "La dérivation": "الاشتقاق", "Géométrie dans l'espace — droites et plans": "الهندسة الفضائية — المستقيمات والمستويات",
  "Les suites numériques": "المتتاليات العددية", "La trigonométrie": "حساب المثلثات", "La rotation": "الدوران",
  "Étude des fonctions": "دراسة الدوال", "Le dénombrement": "الترتيب والتوفيق", "Les statistiques": "الإحصاء",
  "Limites et continuité": "النهايات والاتصال", "Suites numériques": "المتتاليات العددية",
  "Fonction logarithme népérien": "دالة اللوغاريتم النبيري", "Dérivabilité et étude de fonctions": "الاشتقاقية ودراسة الدوال",
  "Fonction exponentielle": "الدالة الأسية", "Calcul intégral": "حساب التكامل", "Les nombres complexes": "الأعداد العقدية",
  "Équations différentielles": "المعادلات التفاضلية", "Dénombrement et probabilités": "الترتيب والتوفيق والاحتمالات",
  "Structures algébriques": "البنيات الجبرية",
};

function buildExercisePrompt({ level, chapter, lang, band, difficultyNum }) {
  return lang === "ar"
    ? `أنت أستاذ مغربي تُعِدّ تمارين للباكالوريا.
ولّد تمرينًا جديدًا واحدًا في مادة "${SUBJECT_AR}" للمستوى "${LEVEL_AR[level]}"، الدرس "${CHAPTER_AR[chapter] || chapter}".
مستوى الصعوبة المستهدف: ${difficultyNum}/10 (فئة "${band}"). كيّف التعقيد بدقة مع هذا المستوى.
مهم: يجب أن يكون نص التمرين (prompt) ونص الحل (solution) مكتوبَين بالكامل باللغة العربية الفصحى، وليس بالفرنسية.
أجب فقط بصيغة JSON صالحة، بدون أي نص قبلها أو بعدها، بدون markdown، بالصيغة الدقيقة التالية:
{"prompt":"...","solution":"...","difficulty":"${band}"}`
    : `Tu es un professeur marocain qui prépare des exercices de baccalauréat.
Génère UN SEUL nouvel exercice de "Mathématiques" pour le niveau "${level}", chapitre "${chapter}".
Niveau de difficulté ciblé : ${difficultyNum}/10 (bande "${band}"). Adapte la complexité précisément à ce niveau.
Réponds UNIQUEMENT avec un JSON valide, sans texte avant/après, sans markdown, format exact :
{"prompt":"...","solution":"...","difficulty":"${band}"}`;
}

const GRADER_SCHEMA = {
  type: "object",
  properties: {
    correct: { type: "boolean" },
    correct_reason: { type: "string" },
    right_language: { type: "boolean" },
    right_language_reason: { type: "string" },
    difficulty_calibrated: { type: "boolean" },
    difficulty_calibrated_reason: { type: "string" },
  },
  required: ["correct", "correct_reason", "right_language", "right_language_reason", "difficulty_calibrated", "difficulty_calibrated_reason"],
  additionalProperties: false,
};

function buildGraderPrompt({ level, chapter, lang, band, difficultyNum, exercisePrompt, exerciseSolution }) {
  const langName = lang === "ar" ? "Arabic (Modern Standard Arabic)" : "French";
  return `You are auditing one AI-generated Moroccan Baccalauréat math exercise for a tutoring app.

Level: ${level}
Chapter: ${chapter}
Target language: ${langName}
Target difficulty: ${difficultyNum}/10 (band "${band}")

Generated exercise prompt:
${exercisePrompt}

Generated solution:
${exerciseSolution}

Evaluate three independent, checkable properties. Be conservative — only mark false when you are reasonably confident.

1. correct: Is this a valid, well-posed problem for the stated level/chapter, and is the solution mathematically correct — no computational or logical errors, actually solves the stated problem?
2. right_language: Are BOTH the exercise prompt and the solution written entirely in ${langName}? Any sentence, explanatory phrase, or non-notation term in the other language (e.g. French leaking into an Arabic response) fails this, even if just one phrase — standard mathematical notation/symbols are not a violation.
3. difficulty_calibrated: Is the exercise's actual conceptual/computational difficulty roughly consistent with the requested band, for a Moroccan Baccalauréat student at this level — not trivially easier or substantially harder than requested?

Give a one-sentence reason for each verdict.`;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function withRetryAndCeiling(fn, label) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("wall-clock-ceiling")), WALL_CLOCK_CEILING_MS)),
      ]);
    } catch (e) {
      lastErr = e;
      const retryable = e instanceof Anthropic.RateLimitError || e instanceof Anthropic.APIConnectionError ||
        (e instanceof Anthropic.APIError && e.status >= 500) || e.message === "wall-clock-ceiling";
      if (!retryable || attempt === MAX_RETRIES) throw e;
      const backoff = Math.min(1000 * 2 ** attempt, 20000) + Math.random() * 500;
      console.warn(`[${label}] retry ${attempt + 1}/${MAX_RETRIES} after ${e.message} — backing off ${Math.round(backoff)}ms`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

function parseJsonFromText(text) {
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function runOne(variant, model, testCase, rep) {
  const flowDir = path.join(HERE, variant);
  const resultsPath = path.join(flowDir, "results.jsonl");
  const errorsPath = path.join(flowDir, "errors.jsonl");
  const tracePath = path.join(flowDir, "traces", `${testCase.prompt_id}_rep${rep}.json`);

  // Resume: skip if this (case, rep) is already scored.
  if (fs.existsSync(resultsPath)) {
    const already = fs.readFileSync(resultsPath, "utf8").split("\n").filter(Boolean)
      .some((line) => { const r = JSON.parse(line); return r.prompt_id === testCase.prompt_id && r.rep === rep; });
    if (already) return { skipped: true };
  }

  const prompt = buildExercisePrompt(testCase);
  const trace = [{ role: "user", content: prompt }];

  let genResponse;
  try {
    genResponse = await withRetryAndCeiling(
      // 1500 matches production after the truncation fix (src/lib/ai.js generateExercise).
      () => client.messages.create({ model, max_tokens: 2500, messages: [{ role: "user", content: prompt }] }),
      `${variant}/${testCase.prompt_id}/generate`
    );
  } catch (e) {
    fs.appendFileSync(errorsPath, JSON.stringify({ prompt_id: testCase.prompt_id, phase: "generate", failure_class: e.message === "wall-clock-ceiling" ? "timeout" : "harness_or_serving_error", error: String(e) }) + "\n");
    return { error: true };
  }

  // Alias -> dated-snapshot resolution is expected (claude-haiku-4-5 ->
  // claude-haiku-4-5-20251001); only a genuinely different family/version fails.
  if (!genResponse.model.startsWith(model)) {
    fs.appendFileSync(errorsPath, JSON.stringify({ prompt_id: testCase.prompt_id, phase: "generate", failure_class: "served_model_mismatch", requested: model, served: genResponse.model }) + "\n");
    return { error: true };
  }

  const genText = genResponse.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  trace.push({ role: "assistant", content: genText });

  // Truncation at the production max_tokens (500) is a real, representative
  // outcome — record it as status:truncated (counted, excluded from means),
  // don't grade a clipped exercise or throw it away as an error.
  if (genResponse.stop_reason === "max_tokens") {
    fs.writeFileSync(tracePath, JSON.stringify(trace, null, 2));
    fs.appendFileSync(resultsPath, JSON.stringify({
      prompt_id: testCase.prompt_id, rep, prompt, tags: testCase.tags,
      stop_reason: "max_tokens", status: "truncated",
      model: genResponse.model, usage: genResponse.usage,
      grade: { correct: null, right_language: null, difficulty_calibrated: null },
    }) + "\n");
    return { truncated: true };
  }

  let exercise;
  try {
    exercise = parseJsonFromText(genText);
  } catch {
    fs.appendFileSync(errorsPath, JSON.stringify({ prompt_id: testCase.prompt_id, phase: "generate", failure_class: "unparseable_output", model: genResponse.model, usage: genResponse.usage }) + "\n");
    return { error: true };
  }

  // Grade with the neutral judge, structured output.
  const graderPrompt = buildGraderPrompt({ ...testCase, exercisePrompt: exercise.prompt, exerciseSolution: exercise.solution });
  let judgeResponse;
  try {
    judgeResponse = await withRetryAndCeiling(
      () => client.messages.create({
        model: JUDGE_MODEL,
        max_tokens: 2500, // headroom: Opus 5 adaptive thinking + the JSON output
        messages: [{ role: "user", content: graderPrompt }],
        // effort:medium keeps the correctness reasoning without letting
        // thinking eat the whole budget and leave an empty JSON block.
        output_config: { format: { type: "json_schema", schema: GRADER_SCHEMA }, effort: "medium" },
      }),
      `${variant}/${testCase.prompt_id}/judge`
    );
  } catch (e) {
    fs.appendFileSync(errorsPath, JSON.stringify({ prompt_id: testCase.prompt_id, phase: "judge", failure_class: e.message === "wall-clock-ceiling" ? "timeout" : "harness_or_serving_error", error: String(e) }) + "\n");
    return { error: true };
  }
  const judgeText = judgeResponse.content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  trace.push({ role: "assistant", content: `[judge] ${judgeText}` });
  let grade;
  try {
    grade = JSON.parse(judgeText);
  } catch {
    fs.appendFileSync(errorsPath, JSON.stringify({ prompt_id: testCase.prompt_id, phase: "judge", failure_class: "judge_unparseable", judge_stop_reason: judgeResponse.stop_reason, judge_model: judgeResponse.model, judge_usage: judgeResponse.usage }) + "\n");
    return { error: true };
  }

  fs.writeFileSync(tracePath, JSON.stringify(trace, null, 2));

  const row = {
    prompt_id: testCase.prompt_id,
    rep,
    prompt,
    tags: testCase.tags,
    stop_reason: genResponse.stop_reason,
    status: "ok",
    model: genResponse.model,
    usage: genResponse.usage,
    judge_model: judgeResponse.model,
    judge_usage: judgeResponse.usage,
    grade: { correct: grade.correct ? 1 : 0, right_language: grade.right_language ? 1 : 0, difficulty_calibrated: grade.difficulty_calibrated ? 1 : 0 },
    explanation: { correct: grade.correct_reason, right_language: grade.right_language_reason, difficulty_calibrated: grade.difficulty_calibrated_reason },
  };
  fs.appendFileSync(resultsPath, JSON.stringify(row) + "\n");
  return { row };
}

async function main() {
  const args = process.argv.slice(2);
  const variant = args[args.indexOf("--variant") + 1];
  const pilotIdx = args.indexOf("--pilot");
  const pilotN = pilotIdx >= 0 ? Number(args[pilotIdx + 1]) : null;
  const repsIdx = args.indexOf("--reps");
  const reps = repsIdx >= 0 ? Number(args[repsIdx + 1]) : 1;
  if (!VARIANTS[variant]) throw new Error(`--variant must be one of ${Object.keys(VARIANTS).join(", ")}`);

  const model = VARIANTS[variant];
  const cases = pilotN ? CASES.slice(0, pilotN) : CASES;
  // Flat (case, rep) task list.
  const tasks = [];
  for (const c of cases) for (let rep = 0; rep < reps; rep++) tasks.push({ c, rep });
  console.log(`Running ${cases.length} case(s) x ${reps} rep(s) = ${tasks.length} for variant=${variant} model=${model}...`);

  const CONCURRENCY = 4;
  let idx = 0;
  let done = 0;
  async function worker() {
    while (idx < tasks.length) {
      const { c, rep } = tasks[idx++];
      const r = await runOne(variant, model, c, rep);
      done++;
      const tag = r.skipped ? "(skipped)" : r.error ? "ERROR" : r.truncated ? "truncated" : "ok";
      console.log(`[${variant}] ${done}/${tasks.length} ${c.prompt_id} rep${rep} ${tag}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
