export const LEVELS = ["Tronc Commun", "1ère Bac", "2ème Bac"];
export const SUBJECTS = ["Mathématiques", "Physique-Chimie", "SVT"];

// Arabic display labels for levels/subjects/chapter titles. The French
// strings above remain the canonical identifiers everywhere (CURRICULUM
// keys, kv_store keys, AI prompt params, SEED_CONTENT_AR keys) — these
// maps are display-only, looked up via labelFor() at render time.
const LEVELS_AR = {
  "Tronc Commun": "الجذع المشترك",
  "1ère Bac": "الأولى بكالوريا",
  "2ème Bac": "الثانية بكالوريا",
};

const SUBJECTS_AR = {
  "Mathématiques": "الرياضيات",
  "Physique-Chimie": "الفيزياء والكيمياء",
  "SVT": "علوم الحياة والأرض",
};

const CHAPTER_TITLES_AR = {
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
  "La mesure en physique": "القياس في الفيزياء",
  "Constitution de la matière": "بنية المادة",
  "La mole et quantité de matière": "المول وكمية المادة",
  "Mouvement et repos": "الحركة والسكون",
  "Interactions et forces": "التآثرات والقوى",
  "Le poids et la masse": "الوزن والكتلة",
  "La pression": "الضغط",
  "Transformations chimiques": "التحولات الكيميائية",
  "Extraction et séparation de substances": "استخلاص وفصل المواد",
  "La cellule, unité du vivant": "الخلية، وحدة بنيوية للكائن الحي",
  "La reproduction chez les êtres vivants": "التكاثر عند الكائنات الحية",
  "Les fonctions de nutrition": "وظائف التغذية",
  "Relations des êtres vivants avec le milieu": "علاقات الكائنات الحية بالوسط",
  "Géologie — roches et phénomènes externes": "الجيولوجيا — الصخور والظواهر الخارجية",
  "Généralités sur les fonctions": "عموميات حول الدوال",
  "Le produit scalaire": "الجداء السلمي",
  "La dérivation": "الاشتقاق",
  "Géométrie dans l'espace — droites et plans": "الهندسة الفضائية — المستقيمات والمستويات",
  "Les suites numériques": "المتتاليات العددية",
  "La trigonométrie": "حساب المثلثات",
  "La rotation": "الدوران",
  "Étude des fonctions": "دراسة الدوال",
  "Le dénombrement": "العد",
  "Les statistiques": "الإحصاء",
  "Les ondes mécaniques": "الموجات الميكانيكية",
  "La mécanique newtonienne": "الميكانيك النيوتوني",
  "Travail et énergie": "الشغل والطاقة",
  "Réactions acido-basiques": "التفاعلات حمض-قاعدة",
  "Dissolution et conductivité": "الانحلال والناقلية",
  "Alcanes et dérivés halogénés": "الألكانات والمشتقات الهالوجينية",
  "Quantité de matière en solution": "كمية المادة في المحلول",
  "Génétique et hérédité": "الوراثة",
  "Reproduction humaine": "التكاثر عند الإنسان",
  "Le système immunitaire": "الجهاز المناعي",
  "Relation nerveuse et hormonale": "التنسيق العصبي والهرموني",
  "Tectonique des plaques — introduction": "تكتونية الصفائح — مدخل",
  "Limites et continuité": "النهايات والاتصال",
  "Suites numériques": "المتتاليات العددية",
  "Fonction logarithme népérien": "دالة اللوغاريتم النبيري",
  "Dérivabilité et étude de fonctions": "الاشتقاقية ودراسة الدوال",
  "Fonction exponentielle": "الدالة الأسية",
  "Calcul intégral": "الحساب التكاملي",
  "Les nombres complexes": "الأعداد العقدية",
  "Équations différentielles": "المعادلات التفاضلية",
  "Dénombrement et probabilités": "العد والاحتمالات",
  "Structures algébriques": "البنيات الجبرية",
  "Ondes et particules": "الموجات والجسيمات",
  "Circuits électriques RC/RL": "الدارات الكهربائية RC/RL",
  "Évolution des systèmes chimiques": "تطور المجموعات الكيميائية",
  "Suivi temporel d'un système chimique": "التتبع الزمني لتطور مجموعة كيميائية",
  "Contrôle de qualité par titrage": "مراقبة الجودة بالمعايرة",
  "Transformations en chimie organique": "التحولات في الكيمياء العضوية",
  "Radioactivité et réactions nucléaires": "النشاط الإشعاعي والتفاعلات النووية",
  "Mécanique du solide": "ميكانيك الجسم الصلب",
  "Immunologie": "المناعة",
  "Plaque tectonique et phénomènes géologiques": "تكتونية الصفائح والظواهر الجيولوجية",
  "Patrimoine génétique et transmission": "المورثات ونقلها",
  "La communication nerveuse": "التواصل العصبي",
  "Génie génétique et biotechnologies": "الهندسة الوراثية والتقانات الحيوية",
  "Ressources énergétiques et sol": "الموارد الطاقية والتربة",
};

// Display-only label lookup — pass the canonical (French) identifier and
// the active UI language; returns the Arabic label when lang is "ar" and a
// translation exists, otherwise falls back to the original string (never
// blank, even for an untranslated title).
export function labelFor(text, lang) {
  if (lang !== "ar" || !text) return text;
  return LEVELS_AR[text] ?? SUBJECTS_AR[text] ?? CHAPTER_TITLES_AR[text] ?? text;
}

export const CURRICULUM = {
  "Tronc Commun": {
    "Mathématiques": [
      { title: "Calcul numérique et algébrique", seed: true },
      { title: "Ensembles de nombres", seed: true },
      { title: "Arithmétique dans N" },
      { title: "Ensembles et applications" },
      { title: "La droite dans le plan", seed: true },
      { title: "La projection dans le plan" },
      { title: "Ordre dans R" },
      { title: "Calcul vectoriel dans le plan" },
      { title: "Transformations du plan" },
      { title: "Trigonométrie — angles orientés" },
      { title: "Géométrie dans l'espace" },
      { title: "Statistiques" },
    ],
    "Physique-Chimie": [
      { title: "La mesure en physique", seed: true },
      { title: "Constitution de la matière" },
      { title: "La mole et quantité de matière" },
      { title: "Mouvement et repos", seed: true },
      { title: "Interactions et forces", seed: true },
      { title: "Le poids et la masse" },
      { title: "La pression" },
      { title: "Transformations chimiques" },
      { title: "Extraction et séparation de substances" },
    ],
    "SVT": [
      { title: "La cellule, unité du vivant", seed: true },
      { title: "La reproduction chez les êtres vivants", seed: true },
      { title: "Les fonctions de nutrition" },
      { title: "Relations des êtres vivants avec le milieu" },
      { title: "Géologie — roches et phénomènes externes" },
    ],
  },
  "1ère Bac": {
    "Mathématiques": [
      { title: "Généralités sur les fonctions", seed: true },
      { title: "Le produit scalaire", seed: true },
      { title: "La dérivation", seed: true },
      { title: "Géométrie dans l'espace — droites et plans" },
      { title: "Les suites numériques" },
      { title: "La trigonométrie" },
      { title: "La rotation" },
      { title: "Étude des fonctions" },
      { title: "Le dénombrement" },
      { title: "Les statistiques" },
    ],
    "Physique-Chimie": [
      { title: "Les ondes mécaniques", seed: true },
      { title: "La mécanique newtonienne", seed: true },
      { title: "Travail et énergie" },
      { title: "Transformations chimiques", seed: true },
      { title: "Réactions acido-basiques" },
      { title: "Dissolution et conductivité" },
      { title: "Alcanes et dérivés halogénés" },
      { title: "Quantité de matière en solution" },
    ],
    "SVT": [
      { title: "Génétique et hérédité", seed: true },
      { title: "Reproduction humaine", seed: true },
      { title: "Le système immunitaire" },
      { title: "Relation nerveuse et hormonale" },
      { title: "Tectonique des plaques — introduction" },
    ],
  },
  "2ème Bac": {
    "Mathématiques": [
      { title: "Limites et continuité", seed: true },
      { title: "Suites numériques", seed: true },
      { title: "Fonction logarithme népérien", seed: true },
      { title: "Dérivabilité et étude de fonctions" },
      { title: "Fonction exponentielle" },
      { title: "Calcul intégral" },
      { title: "Les nombres complexes" },
      { title: "Équations différentielles" },
      { title: "Dénombrement et probabilités" },
      { title: "Structures algébriques" },
    ],
    "Physique-Chimie": [
      { title: "Ondes et particules", seed: true },
      { title: "Circuits électriques RC/RL", seed: true },
      { title: "Évolution des systèmes chimiques", seed: true },
      { title: "Suivi temporel d'un système chimique" },
      { title: "Contrôle de qualité par titrage" },
      { title: "Transformations en chimie organique" },
      { title: "Radioactivité et réactions nucléaires" },
      { title: "Mécanique du solide" },
    ],
    "SVT": [
      { title: "Immunologie", seed: true },
      { title: "Plaque tectonique et phénomènes géologiques", seed: true },
      { title: "Patrimoine génétique et transmission" },
      { title: "La communication nerveuse" },
      { title: "Génie génétique et biotechnologies" },
      { title: "Ressources énergétiques et sol" },
    ],
  },
};

export const SEED_CONTENT = {
  "Calcul numérique et algébrique": {
    notions: [
      { q: "Nombre irrationnel", a: "Nombre qui ne peut pas s'écrire sous forme de fraction a/b. Exemple : √2, π." },
      { q: "(a+b)²", a: "a² + 2ab + b²" },
      { q: "a² − b²", a: "(a−b)(a+b)" },
    ],
    exercises: [
      { prompt: "Développer et réduire : (2x − 3)² − (x + 1)(x − 1)", solution: "4x²−12x+9 − (x²−1) = 3x² − 12x + 10", difficulty: "medium" },
      { prompt: "Simplifier : (√50 − √8) / √2", solution: "√50=5√2, √8=2√2 → (5√2−2√2)/√2 = 3", difficulty: "easy" },
    ],
  },
  "Ensembles de nombres": {
    notions: [{ q: "N, Z, Q, D, R", a: "Naturels, relatifs, rationnels, décimaux, réels." }],
    exercises: [{ prompt: "0,333… (périodique) est-il décimal ? Justifier.", solution: "Non, un décimal a un nombre fini de décimales. C'est un rationnel non décimal.", difficulty: "medium" }],
  },
  "La droite dans le plan": {
    notions: [{ q: "Équation réduite", a: "y = ax + b (a = pente, b = ordonnée à l'origine)" }],
    exercises: [{ prompt: "Équation de la droite passant par A(1,2) et B(3,6).", solution: "a=(6−2)/(3−1)=2 → y=2x", difficulty: "easy" }],
  },
  "La mesure en physique": {
    notions: [{ q: "Unités SI", a: "Mètre (m), kilogramme (kg), seconde (s)." }],
    exercises: [{ prompt: "Convertir 250 mL en m³.", solution: "250×10⁻⁶ m³ = 2,5×10⁻⁴ m³", difficulty: "easy" }],
  },
  "Mouvement et repos": {
    notions: [{ q: "Vitesse moyenne", a: "v = distance / durée (m/s)" }],
    exercises: [{ prompt: "120 km en 1h30 → vitesse moyenne en m/s ?", solution: "120000/5400 ≈ 22,2 m/s", difficulty: "easy" }],
  },
  "Interactions et forces": {
    notions: [{ q: "3ᵉ loi de Newton", a: "Actions réciproques : A→B s'accompagne de B→A, même intensité, sens opposé." }],
    exercises: [{ prompt: "Livre de 1 kg posé sur une table : représenter les forces.", solution: "Poids P (≈10N, vers le bas) et réaction normale N (vers le haut), N=P à l'équilibre.", difficulty: "medium" }],
  },
  "La cellule, unité du vivant": {
    notions: [{ q: "Cellule animale vs végétale", a: "Végétale : paroi, chloroplastes, vacuole. Animale : aucun des trois." }],
    exercises: [{ prompt: "3 organites communs aux deux types de cellules.", solution: "Noyau, mitochondries, ribosomes.", difficulty: "easy" }],
  },
  "La reproduction chez les êtres vivants": {
    notions: [{ q: "Sexuée vs asexuée", a: "Sexuée : fusion de gamètes (diversité). Asexuée : un seul parent (clones)." }],
    exercises: [{ prompt: "Exemple de reproduction asexuée chez les végétaux.", solution: "Le bouturage.", difficulty: "easy" }],
  },
  "Généralités sur les fonctions": {
    notions: [{ q: "Fonction paire/impaire", a: "Paire : f(−x)=f(x). Impaire : f(−x)=−f(x)." }],
    exercises: [{ prompt: "Domaine de f(x) = √(x−3)/(x+1)", solution: "x≥3 et x≠−1 → Df=[3;+∞[", difficulty: "medium" }],
  },
  "Le produit scalaire": {
    notions: [{ q: "Formule (coordonnées)", a: "u·v = xx' + yy'" }],
    exercises: [{ prompt: "u(3,−2), v(4,6) orthogonaux ?", solution: "u·v=12−12=0 → oui", difficulty: "easy" }],
  },
  "La dérivation": {
    notions: [
      { q: "(xⁿ)'", a: "n·xⁿ⁻¹" },
      { q: "f'(a), interprétation", a: "Coefficient directeur de la tangente en a." },
    ],
    exercises: [{ prompt: "Dériver f(x)=(2x+1)/(x−3)", solution: "f'(x) = −7/(x−3)²", difficulty: "hard" }],
  },
  "Les ondes mécaniques": {
    notions: [{ q: "Célérité", a: "v = distance / temps" }],
    exercises: [{ prompt: "Onde parcourt 8 m en 0,4 s : célérité ?", solution: "v=20 m/s", difficulty: "easy" }],
  },
  "La mécanique newtonienne": {
    notions: [{ q: "2ᵉ loi de Newton", a: "ΣF = m·a" }],
    exercises: [{ prompt: "F=20N, m=4kg (sans frottement) : accélération ?", solution: "a=5 m/s²", difficulty: "medium" }],
  },
  "Transformations chimiques": {
    notions: [{ q: "Réactif limitant", a: "Consommé en premier ; détermine la quantité max de produit." }],
    exercises: [{ prompt: "Comment identifier le réactif limitant ?", solution: "Comparer n/coefficient stœchiométrique pour chaque réactif : le plus petit rapport est limitant.", difficulty: "medium" }],
  },
  "Génétique et hérédité": {
    notions: [{ q: "Allèle dominant/récessif", a: "Dominant : s'exprime même hétérozygote. Récessif : seulement homozygote." }],
    exercises: [{ prompt: "Croisement Aa×Aa : proportions génotypiques ?", solution: "1/4 AA, 1/2 Aa, 1/4 aa", difficulty: "medium" }],
  },
  "Reproduction humaine": {
    notions: [{ q: "FSH / LH", a: "FSH : croissance folliculaire. LH : déclenche l'ovulation." }],
    exercises: [{ prompt: "Quand a lieu le pic de LH et sa conséquence ?", solution: "Vers J14 ; déclenche l'ovulation.", difficulty: "easy" }],
  },
  "Limites et continuité": {
    notions: [
      { q: "lim sin(x)/x en 0", a: "= 1" },
      { q: "Continuité en a", a: "lim(x→a) f(x) = f(a)" },
    ],
    exercises: [{ prompt: "lim(x→+∞) (3x²−2x+1)/(x²+5)", solution: "= 3", difficulty: "medium" }],
  },
  "Suites numériques": {
    notions: [
      { q: "Suite arithmétique", a: "u(n)=u(0)+n·r" },
      { q: "Suite géométrique", a: "u(n)=u(0)·qⁿ" },
    ],
    exercises: [{ prompt: "u0=3, q=2 : calculer u5.", solution: "u5=3×32=96", difficulty: "easy" }],
  },
  "Fonction logarithme népérien": {
    notions: [
      { q: "ln(ab)", a: "= ln(a)+ln(b)" },
      { q: "(ln x)'", a: "= 1/x" },
    ],
    exercises: [{ prompt: "Résoudre ln(x+1)=2", solution: "x = e²−1", difficulty: "medium" }],
  },
  "Ondes et particules": {
    notions: [{ q: "Planck-Einstein", a: "E = h·ν" }],
    exercises: [{ prompt: "E d'un photon, ν=5×10¹⁴ Hz (h=6,63×10⁻³⁴)", solution: "E≈3,3×10⁻¹⁹ J", difficulty: "hard" }],
  },
  "Circuits électriques RC/RL": {
    notions: [{ q: "Constante de temps τ (RC)", a: "τ = R × C" }],
    exercises: [{ prompt: "R=1000Ω, C=2µF : τ ?", solution: "τ=2 ms", difficulty: "medium" }],
  },
  "Évolution des systèmes chimiques": {
    notions: [{ q: "Quotient de réaction Qr", a: "Rapport [produits]/[réactifs] pondéré, à un instant donné." }],
    exercises: [{ prompt: "Prévoir le sens d'évolution : Qr vs K ?", solution: "Qr<K → sens direct. Qr>K → sens inverse. Qr=K → équilibre.", difficulty: "medium" }],
  },
  "Immunologie": {
    notions: [{ q: "Immunité innée vs adaptative", a: "Innée : rapide, non spécifique. Adaptative : spécifique, avec mémoire." }],
    exercises: [{ prompt: "Rôle des lymphocytes B ?", solution: "Différenciation en plasmocytes sécrétant des anticorps spécifiques.", difficulty: "medium" }],
  },
  "Plaque tectonique et phénomènes géologiques": {
    notions: [{ q: "Zone de subduction", a: "Une plaque océanique plonge sous une autre → séismes, volcanisme." }],
    exercises: [{ prompt: "2 phénomènes géologiques en zone de subduction ?", solution: "Séismes profonds et volcanisme explosif.", difficulty: "easy" }],
  },
};

// Arabic translation of SEED_CONTENT, keyed by the same (French) chapter
// title used throughout the app as the canonical identifier — only the
// notions/exercises TEXT is translated; formulas, numbers, and symbols are
// left untouched, and `difficulty` stays an unchanged enum literal
// ("easy"/"medium"/"hard") since the UI matches on that exact string.
export const SEED_CONTENT_AR = {
  "Calcul numérique et algébrique": {
    notions: [
      { q: "عدد غير نسبي", a: "عدد لا يمكن كتابته على شكل كسر a/b. مثال: √2، π." },
      { q: "(a+b)²", a: "a² + 2ab + b²" },
      { q: "a² − b²", a: "(a−b)(a+b)" },
    ],
    exercises: [
      { prompt: "وسّع وبسّط: (2x − 3)² − (x + 1)(x − 1)", solution: "4x²−12x+9 − (x²−1) = 3x² − 12x + 10", difficulty: "medium" },
      { prompt: "بسّط: (√50 − √8) / √2", solution: "√50=5√2, √8=2√2 → (5√2−2√2)/√2 = 3", difficulty: "easy" },
    ],
  },
  "Ensembles de nombres": {
    notions: [{ q: "N, Z, Q, D, R", a: "أعداد طبيعية، صحيحة، نسبية، عشرية، حقيقية." }],
    exercises: [{ prompt: "هل العدد 0.333… (الدوري) عدد عشري؟ علّل إجابتك.", solution: "لا، العدد العشري له عدد منته من الأرقام العشرية. إنه عدد نسبي غير عشري.", difficulty: "medium" }],
  },
  "La droite dans le plan": {
    notions: [{ q: "المعادلة المختزلة", a: "y = ax + b (a = الميل، b = الترتيب عند المبدأ)" }],
    exercises: [{ prompt: "معادلة المستقيم المار بالنقطتين A(1,2) و B(3,6).", solution: "a=(6−2)/(3−1)=2 → y=2x", difficulty: "easy" }],
  },
  "La mesure en physique": {
    notions: [{ q: "الوحدات الدولية (SI)", a: "المتر (m)، الكيلوغرام (kg)، الثانية (s)." }],
    exercises: [{ prompt: "حوّل 250 mL إلى m³.", solution: "250×10⁻⁶ m³ = 2,5×10⁻⁴ m³", difficulty: "easy" }],
  },
  "Mouvement et repos": {
    notions: [{ q: "السرعة المتوسطة", a: "v = المسافة / الزمن (m/s)" }],
    exercises: [{ prompt: "120 km في 1h30 ← ما هي السرعة المتوسطة بـ m/s؟", solution: "120000/5400 ≈ 22,2 m/s", difficulty: "easy" }],
  },
  "Interactions et forces": {
    notions: [{ q: "قانون نيوتن الثالث", a: "التأثيرات المتبادلة: التأثير A→B يرافقه التأثير B→A، بنفس الشدة واتجاه معاكس." }],
    exercises: [{ prompt: "كتاب كتلته 1 kg موضوع على طاولة: مثّل القوى المؤثرة.", solution: "الوزن P (≈10N، نحو الأسفل) ورد فعل السند العمودي N (نحو الأعلى)، N=P عند التوازن.", difficulty: "medium" }],
  },
  "La cellule, unité du vivant": {
    notions: [{ q: "الخلية الحيوانية مقابل النباتية", a: "النباتية: جدار خلوي، بلاستيدات خضراء، فجوة عصارية. الحيوانية: لا تحتوي على أي منها." }],
    exercises: [{ prompt: "اذكر 3 عضيات مشتركة بين نوعي الخلايا.", solution: "النواة، الميتوكوندري، الريبوسومات.", difficulty: "easy" }],
  },
  "La reproduction chez les êtres vivants": {
    notions: [{ q: "التكاثر الجنسي مقابل اللاجنسي", a: "الجنسي: اندماج الأمشاج (تنوع). اللاجنسي: أصل واحد (نسخ متماثلة)." }],
    exercises: [{ prompt: "مثال عن التكاثر اللاجنسي عند النباتات.", solution: "التكاثر بالعقل (bouturage).", difficulty: "easy" }],
  },
  "Généralités sur les fonctions": {
    notions: [{ q: "الدالة الزوجية/الفردية", a: "زوجية: f(−x)=f(x). فردية: f(−x)=−f(x)." }],
    exercises: [{ prompt: "مجموعة تعريف الدالة f(x) = √(x−3)/(x+1)", solution: "x≥3 et x≠−1 → Df=[3;+∞[", difficulty: "medium" }],
  },
  "Le produit scalaire": {
    notions: [{ q: "الصيغة (بالإحداثيات)", a: "u·v = xx' + yy'" }],
    exercises: [{ prompt: "المتجهتان u(3,−2) و v(4,6): هل هما متعامدتان؟", solution: "u·v=12−12=0 ← نعم", difficulty: "easy" }],
  },
  "La dérivation": {
    notions: [
      { q: "(xⁿ)'", a: "n·xⁿ⁻¹" },
      { q: "f'(a)، التأويل الهندسي", a: "معامل توجيه المماس عند النقطة a." },
    ],
    exercises: [{ prompt: "اشتق الدالة f(x)=(2x+1)/(x−3)", solution: "f'(x) = −7/(x−3)²", difficulty: "hard" }],
  },
  "Les ondes mécaniques": {
    notions: [{ q: "سرعة الانتشار", a: "v = المسافة / الزمن" }],
    exercises: [{ prompt: "موجة تقطع 8 m في 0.4 s: ما سرعة انتشارها؟", solution: "v=20 m/s", difficulty: "easy" }],
  },
  "La mécanique newtonienne": {
    notions: [{ q: "قانون نيوتن الثاني", a: "ΣF = m·a" }],
    exercises: [{ prompt: "F=20N، m=4kg (بدون احتكاك): ما التسارع؟", solution: "a=5 m/s²", difficulty: "medium" }],
  },
  "Transformations chimiques": {
    notions: [{ q: "المتفاعل المحد", a: "يُستهلك أولًا؛ يحدد الكمية القصوى للناتج." }],
    exercises: [{ prompt: "كيف نحدد المتفاعل المحد؟", solution: "نقارن النسبة n/المعامل التناسبي لكل متفاعل: أصغر نسبة تكون هي المتفاعل المحد.", difficulty: "medium" }],
  },
  "Génétique et hérédité": {
    notions: [{ q: "الأليل السائد/المتنحي", a: "السائد: يظهر حتى في الحالة المتغايرة الزيجوت. المتنحي: يظهر فقط في الحالة المتماثلة الزيجوت." }],
    exercises: [{ prompt: "تزاوج Aa×Aa: ما هي النسب النمط وراثية الناتجة؟", solution: "1/4 AA, 1/2 Aa, 1/4 aa", difficulty: "medium" }],
  },
  "Reproduction humaine": {
    notions: [{ q: "FSH / LH", a: "FSH: ينشط نمو الجريبات. LH: يحفز الإباضة." }],
    exercises: [{ prompt: "متى تحدث ذروة إفراز LH وما نتيجتها؟", solution: "حوالي اليوم 14؛ تؤدي إلى حدوث الإباضة.", difficulty: "easy" }],
  },
  "Limites et continuité": {
    notions: [
      { q: "نهاية sin(x)/x عند 0", a: "= 1" },
      { q: "الاتصال عند النقطة a", a: "lim(x→a) f(x) = f(a)" },
    ],
    exercises: [{ prompt: "lim(x→+∞) (3x²−2x+1)/(x²+5)", solution: "= 3", difficulty: "medium" }],
  },
  "Suites numériques": {
    notions: [
      { q: "المتتالية الحسابية", a: "u(n)=u(0)+n·r" },
      { q: "المتتالية الهندسية", a: "u(n)=u(0)·qⁿ" },
    ],
    exercises: [{ prompt: "u0=3، q=2: احسب u5.", solution: "u5=3×32=96", difficulty: "easy" }],
  },
  "Fonction logarithme népérien": {
    notions: [
      { q: "ln(ab)", a: "= ln(a)+ln(b)" },
      { q: "(ln x)'", a: "= 1/x" },
    ],
    exercises: [{ prompt: "حل المعادلة ln(x+1)=2", solution: "x = e²−1", difficulty: "medium" }],
  },
  "Ondes et particules": {
    notions: [{ q: "Planck-Einstein", a: "E = h·ν" }],
    exercises: [{ prompt: "طاقة E لفوتون، ν=5×10¹⁴ Hz (h=6.63×10⁻³⁴)", solution: "E≈3,3×10⁻¹⁹ J", difficulty: "hard" }],
  },
  "Circuits électriques RC/RL": {
    notions: [{ q: "ثابت الزمن τ (RC)", a: "τ = R × C" }],
    exercises: [{ prompt: "R=1000Ω، C=2µF: ما قيمة τ؟", solution: "τ=2 ms", difficulty: "medium" }],
  },
  "Évolution des systèmes chimiques": {
    notions: [{ q: "خارج التفاعل Qr", a: "نسبة [النواتج]/[المتفاعلات] المرجحة، في لحظة معينة." }],
    exercises: [{ prompt: "توقّع اتجاه تطور التفاعل: مقارنة Qr و K.", solution: "Qr<K ← الاتجاه المباشر. Qr>K ← الاتجاه العكسي. Qr=K ← حالة التوازن.", difficulty: "medium" }],
  },
  "Immunologie": {
    notions: [{ q: "المناعة الفطرية مقابل المكتسبة", a: "الفطرية: سريعة وغير نوعية. المكتسبة: نوعية ولها ذاكرة مناعية." }],
    exercises: [{ prompt: "ما دور الخلايا الليمفاوية B؟", solution: "تتمايز إلى خلايا بلازمية تفرز أجساما مضادة نوعية.", difficulty: "medium" }],
  },
  "Plaque tectonique et phénomènes géologiques": {
    notions: [{ q: "منطقة الاندساس", a: "تنغرس صفيحة محيطية تحت صفيحة أخرى ← زلازل، نشاط بركاني." }],
    exercises: [{ prompt: "اذكر ظاهرتين جيولوجيتين في منطقة الاندساس.", solution: "زلازل عميقة ونشاط بركاني انفجاري.", difficulty: "easy" }],
  },
};
