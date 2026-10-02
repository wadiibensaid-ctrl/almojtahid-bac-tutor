/** Long-form legal text for the privacy policy, in FR and AR.
 *  Kept out of i18n.js (which holds short UI labels) and out of the React
 *  component so that scripts/prerender-privacy.mjs can emit the static
 *  /confidentialite page from this same source. Edit it here only.
 *  Update CONTACT_EMAIL and the CNDP line once the declaration is filed;
 *  nothing here should claim a registration that doesn't exist yet. */
export const CONTACT_EMAIL = "wadii.bensaid@gmail.com";

export const fr = {
  title: "Politique de confidentialité",
  updated: "Dernière mise à jour : septembre 2026",
  sections: [
    {
      h: "Données collectées",
      p: "Nous collectons : ton adresse email (pour la connexion), ton rôle (élève, enseignant ou parent), ta progression scolaire (matières, chapitres, exercices, réponses, notes), les classes auxquelles tu appartiens, et le contenu des sessions de cours en direct auxquelles tu participes.",
    },
    {
      h: "Pourquoi",
      p: "Ces données servent uniquement à faire fonctionner Almojtahid : générer des exercices adaptés à ton niveau, suivre ta progression, permettre à ton enseignant de t'assigner du travail et de le corriger, et permettre à un parent de suivre ta progression générale (jamais le détail de tes réponses).",
    },
    {
      h: "Qui traite ces données",
      p: `Tes données sont hébergées via Supabase (base de données et stockage de fichiers) et certaines informations (les exercices générés, tes réponses lors de la correction automatique) sont transmises à Anthropic (IA Claude) pour produire ce contenu. Ces prestataires peuvent traiter des données en dehors du Maroc.`,
    },
    {
      h: "Mineurs",
      p: "La majorité des utilisateurs d'Almojtahid sont mineurs. La création d'un compte par une personne de moins de 18 ans doit se faire avec l'autorisation d'un parent ou tuteur légal.",
    },
    {
      h: "Durée de conservation",
      p: "Tes données sont conservées tant que ton compte est actif. Tu peux demander la suppression de ton compte et de toutes les données associées à tout moment, depuis l'onglet Compte.",
    },
    {
      h: "Tes droits",
      p: `Conformément à la loi 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel, tu disposes d'un droit d'accès, de rectification, d'opposition et de suppression de tes données. Pour exercer ces droits, ou pour toute question, contacte-nous à ${CONTACT_EMAIL}.`,
    },
  ],
};

export const ar = {
  title: "سياسة الخصوصية",
  updated: "آخر تحديث: شتنبر 2026",
  sections: [
    {
      h: "البيانات التي نجمعها",
      p: "نجمع: بريدك الإلكتروني (لتسجيل الدخول)، صفتك (تلميذ(ة)، أستاذ(ة) أو ولي أمر)، تقدمك الدراسي (المواد، الدروس، التمارين، الإجابات، النقط)، الأقسام التي تنتمي إليها، ومحتوى حصص الدعم المباشر التي تشارك فيها.",
    },
    {
      h: "لماذا نجمعها",
      p: "تُستعمل هذه البيانات فقط لتشغيل منصة المجتهد: توليد تمارين مناسبة لمستواك، تتبع تقدمك، تمكين أستاذك من تكليفك بعمل وتصحيحه، وتمكين ولي الأمر من متابعة تقدمك العام (وليس أبدًا تفاصيل إجاباتك).",
    },
    {
      h: "من يعالج هذه البيانات",
      p: "بياناتك مستضافة عبر Supabase (قاعدة البيانات وتخزين الملفات)، وبعض المعلومات (التمارين المولّدة، إجاباتك عند التصحيح الآلي) تُرسل إلى Anthropic (الذكاء الاصطناعي Claude) لإنتاج هذا المحتوى. قد يعالج هؤلاء المزودون البيانات خارج المغرب.",
    },
    {
      h: "القاصرون",
      p: "أغلب مستخدمي منصة المجتهد قاصرون. يجب أن يتم إنشاء حساب من طرف شخص يقل عمره عن 18 سنة بإذن من أحد الوالدين أو الوصي القانوني.",
    },
    {
      h: "مدة الاحتفاظ بالبيانات",
      p: "يتم الاحتفاظ ببياناتك طالما كان حسابك نشطًا. يمكنك طلب حذف حسابك وجميع البيانات المرتبطة به في أي وقت، من علامة تبويب الحساب.",
    },
    {
      h: "حقوقك",
      p: `وفقًا للقانون 09-08 المتعلق بحماية الأشخاص الذاتيين تجاه معالجة المعطيات ذات الطابع الشخصي، لك الحق في الوصول إلى بياناتك وتصحيحها والاعتراض عليها وحذفها. لممارسة هذه الحقوق أو لأي سؤال، راسلنا على ${CONTACT_EMAIL}.`,
    },
  ],
};
