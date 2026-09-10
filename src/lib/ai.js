import { askClaude } from "./api";
import { diffBand } from "./helpers";
import { labelFor } from "./curriculum";

// Prompts are written entirely in the target language rather than a French
// template with a single translated instruction appended — a lone embedded
// "respond in Arabic" line inside an otherwise-French prompt was getting
// diluted, so generated exercises/flashcards/feedback kept coming back in
// French even when the UI was switched to Arabic.
//
// Second, subtler issue found via testing: level/subject/chapter are
// canonical French identifiers (used as DB keys, AI params, etc.) — even
// inside the Arabic prompt template, embedding the raw French names (e.g.
// "Mathématiques", "Calcul numérique et algébrique") pulled the model back
// toward French for the exercise content itself, since the instruction
// language alone wasn't a strong enough signal. Fix: pass the Arabic
// display label (labelFor) into the Arabic prompt instead of the raw
// French identifier, and say explicitly that the content itself — not
// just the instructions — must be written in Arabic.

/** Pure prompt text, no network call — shared with api/cron/batch-replenish.js
 *  so pre-generated bank items use exactly the same wording as a live call.
 *  Keep this the single source of truth for the exercise prompt; don't
 *  let the cron job grow its own copy. */
export function buildExercisePrompt({ level, subject, chapter, lang, difficultyNum }) {
  const band = diffBand(difficultyNum); // "easy" | "medium" | "hard" — enum literal, not translated
  return lang === "ar"
    ? `أنت أستاذ مغربي تُعِدّ تمارين للباكالوريا.
ولّد تمرينًا جديدًا واحدًا في مادة "${labelFor(subject, "ar")}" للمستوى "${labelFor(level, "ar")}"، الدرس "${labelFor(chapter, "ar")}".
مستوى الصعوبة المستهدف: ${difficultyNum}/10 (فئة "${band}"). كيّف التعقيد بدقة مع هذا المستوى.
مهم: يجب أن يكون نص التمرين (prompt) ونص الحل (solution) مكتوبَين بالكامل باللغة العربية الفصحى، وليس بالفرنسية.
أجب فقط بصيغة JSON صالحة، بدون أي نص قبلها أو بعدها، بدون markdown، بالصيغة الدقيقة التالية:
{"prompt":"...","solution":"...","difficulty":"${band}"}`
    : `Tu es un professeur marocain qui prépare des exercices de baccalauréat.
Génère UN SEUL nouvel exercice de "${subject}" pour le niveau "${level}", chapitre "${chapter}".
Niveau de difficulté ciblé : ${difficultyNum}/10 (bande "${band}"). Adapte la complexité précisément à ce niveau.
Réponds UNIQUEMENT avec un JSON valide, sans texte avant/après, sans markdown, format exact :
{"prompt":"...","solution":"...","difficulty":"${band}"}`;
}

/** allowBank defaults false — pass true only for self-practice, never for
 *  an assignment. See the problem_bank comment in schema.sql: assignments
 *  must always get a fresh, uniquely-generated exercise, never a pooled
 *  one another student could also have gotten. */
export async function generateExercise({ level, subject, chapter, lang, difficultyNum, token, allowBank = false }) {
  const prompt = buildExercisePrompt({ level, subject, chapter, lang, difficultyNum });
  const bankLookup = allowBank
    ? { level, subject, chapter, lang, difficultyBand: diffBand(difficultyNum), itemType: "exercise" }
    : undefined;
  // 2500, not 500: a full worked solution for a medium/hard Bac exercise
  // routinely exceeds 500 output tokens and was getting truncated mid-
  // solution in production. The Haiku-vs-Sonnet eval showed 1500 still
  // truncated ~90% of hard-band Sonnet solutions, so 2500. Trades a higher
  // per-exercise output-token cost (hard band mostly) for finished solutions.
  const text = await askClaude(prompt, 2500, token, "generate", bankLookup);
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

export async function gradeAnswer({ exercisePrompt, correctSolution, studentAnswer, lang, token }) {
  const prompt =
    lang === "ar"
      ? `أنت مصحّح للباكالوريا المغربي، عادل ومتفهّم.
التمرين: ${exercisePrompt}
الحل المرجعي: ${correctSolution}
إجابة التلميذ: ${studentAnswer}

قيّم إجابة التلميذ. كن متسامحًا مع الصياغة، صارمًا مع المنطق والنتيجة.
مهم: يجب أن يكون نص الملاحظات (feedback) مكتوبًا بالكامل باللغة العربية الفصحى.
أجب فقط بصيغة JSON صالحة، بالصيغة الدقيقة التالية:
{"status":"correct|partial|incorrect","score":0-100,"feedback":"شرح قصير وبنّاء، جملتان أو ثلاث"}`
      : `Tu es un correcteur de baccalauréat marocain, juste et bienveillant.
Exercice : ${exercisePrompt}
Solution de référence : ${correctSolution}
Réponse de l'élève : ${studentAnswer}

Évalue la réponse de l'élève. Sois tolérant sur la forme, strict sur le raisonnement et le résultat.
Réponds UNIQUEMENT avec un JSON valide, format exact :
{"status":"correct|partial|incorrect","score":0-100,"feedback":"explication courte et constructive, 2-3 phrases"}`;
  const text = await askClaude(prompt, 500, token, "grade");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

/** Pure prompt text — see the note on buildExercisePrompt above. */
export function buildFlashcardsPrompt({ level, subject, chapter, lang }) {
  return lang === "ar"
    ? `ولّد بالضبط 4 بطاقات مراجعة جديدة (سؤال/جواب) في مادة "${labelFor(subject, "ar")}" للمستوى "${labelFor(level, "ar")}"، الدرس "${labelFor(chapter, "ar")}".
مهم: يجب أن يكون نص الأسئلة والأجوبة مكتوبًا بالكامل باللغة العربية الفصحى، وليس بالفرنسية.
أجب فقط بصيغة JSON صالحة، بالصيغة الدقيقة التالية:
{"items":[{"q":"...","a":"..."}]}`
    : `Génère exactement 4 nouvelles fiches de révision (question/réponse) de "${subject}" pour le niveau "${level}", chapitre "${chapter}".
Réponds UNIQUEMENT avec un JSON valide, format exact :
{"items":[{"q":"...","a":"..."}]}`;
}

/** allowBank defaults false, same reasoning as generateExercise above.
 *  Flashcards have no per-student difficulty, so every bank row for
 *  item_type='flashcard' is filed under difficulty_band='medium' — a
 *  fixed bucket rather than a real difficulty measure. */
export async function generateFlashcards({ level, subject, chapter, lang, token, allowBank = false }) {
  const prompt = buildFlashcardsPrompt({ level, subject, chapter, lang });
  const bankLookup = allowBank
    ? { level, subject, chapter, lang, difficultyBand: "medium", itemType: "flashcard" }
    : undefined;
  const text = await askClaude(prompt, 900, token, "generate", bankLookup);
  const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
  return parsed.items || [];
}
