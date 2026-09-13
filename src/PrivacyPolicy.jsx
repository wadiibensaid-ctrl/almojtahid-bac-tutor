import React from "react";

/** Content lives here (not i18n.js) since it's long-form legal text, not a
 *  short UI label — keeping it out of the flat key/value i18n map. Update
 *  CONTACT_EMAIL and the CNDP line once the actual declaration is filed;
 *  nothing here should claim a registration that doesn't exist yet. */
const CONTACT_EMAIL = "wadii.bensaid@gmail.com";

const fr = {
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

const ar = {
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

export default function PrivacyPolicy({ lang, onClose }) {
  const content = lang === "ar" ? ar : fr;
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(30,26,20,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFDF7", border: "1.5px solid #D8C9A8", borderRadius: 16,
          padding: 32, maxWidth: 560, maxHeight: "80vh", overflowY: "auto",
          direction: lang === "ar" ? "rtl" : "ltr",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 24, marginBottom: 4 }}>{content.title}</h1>
        <div style={{ fontSize: 12, color: "#9c9184", marginBottom: 20 }}>{content.updated}</div>
        {content.sections.map((s) => (
          <div key={s.h} style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.h}</div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "#4a453d" }}>{s.p}</div>
          </div>
        ))}
        <button className="btn solid" onClick={onClose} style={{ marginTop: 8 }}>
          {lang === "ar" ? "إغلاق" : "Fermer"}
        </button>
      </div>
    </div>
  );
}
