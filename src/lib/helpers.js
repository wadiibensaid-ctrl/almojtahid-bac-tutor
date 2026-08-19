export const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + "-" + Math.random().toString(36).slice(2);

export const chapKey = (level, subject, chapter) => `${level}|${subject}|${chapter}`;

export const diffBand = (n) => (n <= 3 ? "easy" : n <= 7 ? "medium" : "hard");

/** SM-2 spaced repetition scheduling (same algorithm Anki uses). */
export function sm2(quality, prev) {
  const p = prev || { interval: 0, repetitions: 0, ease: 2.5 };
  let { interval, repetitions, ease } = p;
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * ease);
    repetitions += 1;
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  const due = Date.now() + interval * 86400000;
  return { interval, repetitions, ease, due };
}
