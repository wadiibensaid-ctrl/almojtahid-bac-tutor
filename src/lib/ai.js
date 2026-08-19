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

export async function generateExercise({ level, subject, chapter, lang, difficultyNum, token }) {
  const band = diffBand(difficultyNum); // "easy" | "medium" | "hard" — enum literal, not translated
  const prompt =
    lang === "ar"
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
  const text = await askClaude(prompt, 500, token);
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

export async function generateFlashcards({ level, subject, chapter, lang, token }) {
  const prompt =
    lang === "ar"
      ? `ولّد بالضبط 4 بطاقات مراجعة جديدة (سؤال/جواب) في مادة "${labelFor(subject, "ar")}" للمستوى "${labelFor(level, "ar")}"، الدرس "${labelFor(chapter, "ar")}".
مهم: يجب أن يكون نص الأسئلة والأجوبة مكتوبًا بالكامل باللغة العربية الفصحى، وليس بالفرنسية.
أجب فقط بصيغة JSON صالحة، بالصيغة الدقيقة التالية:
{"items":[{"q":"...","a":"..."}]}`
      : `Génère exactement 4 nouvelles fiches de révision (question/réponse) de "${subject}" pour le niveau "${level}", chapitre "${chapter}".
Réponds UNIQUEMENT avec un JSON valide, format exact :
{"items":[{"q":"...","a":"..."}]}`;
  const text = await askClaude(prompt, 900, token);
  const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
  return parsed.items || [];
}
