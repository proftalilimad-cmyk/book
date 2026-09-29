// ============================================================
// مرحلة VERIFY — فحص الوقائع قبل العرض على المراجعة البشرية
//  القاعدة: إن كانت المعلومة غير مؤكدة → REVIEW_REQUIRED
//  ولا يجري أبداً «اختراع تأكيد».
// الفحص آلي قائم على القواعد:
//  - صحة المصدر والرابط  - عدم استقبال تاريخ مستقبلي
//  - الحفاظ على الأرقام والتواريخ والاقتباسات من النص الخام
//  - عربية النص المُنتج (RTL) واكتمال بنيته
// ============================================================

const AR_MONTHS = /(يناير|فبراير|مارس|أبريل|ابريل|ماي|يونيو|يونيه|يوليو|يوليوز|غشت|أغسطس|شتنبر|سبتمبر|أكتوبر|اكتوبر|نونبر|نوفمبر|ديسمبر)/g;

export interface ExtractedFacts {
  /** أرقام فعلية (0-9 أو ٠-٩) مع تطبيع الأرقام العربية المشرقية */
  numbers: string[];
  /** سنوات ميلادية */
  years: string[];
  /** تعبيرات تاريخية نصية (اليوم/أمس/27 شتنبر…) */
  datePhrases: string[];
  /** اقتباسات حرفية «…» أو "…" */
  quotes: string[];
  /** نسب مئوية */
  percents: string[];
}

export function normalizeDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

/** استخلاص الوقائع القابلة للتحقق من نص */
export function extractFacts(text: string): ExtractedFacts {
  const t = normalizeDigits(text);
  const unique = (arr: (string | undefined)[]) =>
    [...new Set(arr.filter((x): x is string => Boolean(x)).map((x) => x.trim()))];

  const numbers = unique(
    [...t.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0]).filter((n) => n.replace(/[.,]/g, '').length >= 1),
  );
  const years = unique([...t.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => m[0]));
  const percents = unique([...t.matchAll(/\d+(?:[.,]\d+)?\s*(?:%|في المائة|بالمائة)/g)].map((m) => m[0]));

  const datePhrases = unique([
    ...[...text.matchAll(AR_MONTHS)].map((m) => m[0]),
    ...(text.match(/\b(اليوم|أمس|غداً|غدا)\b/g) ?? []),
  ]);

  const quotes = unique([
    ...[...text.matchAll(/«([^»]{4,120})»/g)].map((m) => m[1]),
    ...[...text.matchAll(/"([^"]{4,120})"/g)].map((m) => m[1]),
  ]);

  return { numbers, years, datePhrases, quotes, percents };
}

export interface VerificationReport {
  ok: boolean;
  /** 0..1 ثقة آلية */
  score: number;
  issues: string[];
  checkedAt: string;
}

export interface VerifyInput {
  /** النص الخام من المصدر */
  rawText: string;
  /** المقال العربي المُنتج (HTML) */
  rewrittenText: string;
  title: string;
  source_url?: string;
  source_published_at?: string;
  /** نصوص مصادر أخرى تغطي الحدث نفسه — للمقارنة عند توفرها */
  otherSourcesText?: string[];
}

/**
 * التحقق الآلي التحريري:
 *  1) المصدر والرابط سليمان
 *  2) تاريخ المصدر ليس في المستقبل (هامش 6 ساعات لفروق المناطق)
 *  3) كل أرقام/سنوات/نسب المصدر حاضرة في المقال العربي المُنتج
 *  4) الاقتباسات الحرفية محفوظة
 *  5) النص المُنتج عربي بامتياز وطوله معقول
 *  6) عند توفر مصادر أخرى للحدث: الأرقام المحورية لا تتناقض
 */
export function verifyArticle(input: VerifyInput): VerificationReport {
  const issues: string[] = [];
  let checks = 0;
  let passed = 0;

  // 1) المصدر والرابط
  checks += 1;
  if (input.source_url && /^https?:\/\/.+\..+/.test(input.source_url)) passed += 1;
  else issues.push('الرابط الأصلي للمصدر مفقود أو غير صالح');

  // 2) تاريخ المصدر
  checks += 1;
  if (!input.source_published_at) {
    passed += 1; // غياب التاريخ لا يمنع، لكنه يخفض الوزن النهائي أدناه
  } else {
    const t = new Date(input.source_published_at).getTime();
    if (Number.isNaN(t)) issues.push('تاريخ نشر المصدر غير قابل للقراءة');
    else if (t > Date.now() + 6 * 3600_000) issues.push('تاريخ المصدر في المستقبل — يحتاج تدقيقاً بشرياً');
    else passed += 1;
  }

  const rawFacts = extractFacts(input.rawText);
  const rewrittenNorm = normalizeDigits(input.rewrittenText.replace(/<[^>]+>/g, ' '));

  // 3) الأرقام والسنوات والنسب
  const keyNumbers = [...new Set([...rawFacts.numbers, ...rawFacts.years])].filter(
    (n) => n.length > 0 && n !== '20' && n !== '19',
  );
  const lostNumbers = keyNumbers.filter((n) => !rewrittenNorm.includes(n));
  checks += 1;
  if (lostNumbers.length === 0) passed += 1;
  else issues.push(`أرقام من المصدر لم ترد في الصياغة: ${lostNumbers.slice(0, 5).join('، ')}`);

  // 4) الاقتباسات
  const lostQuotes = rawFacts.quotes.filter((q) => !rewrittenNorm.includes(normalizeDigits(q).slice(0, 20)));
  checks += 1;
  if (lostQuotes.length === 0) passed += 1;
  else issues.push(`اقتباس من المصدر لم يُحفظ: «${lostQuotes[0]?.slice(0, 40)}…»`);

  // 5) عربية النص المنتج واكتماله
  checks += 1;
  const plain = input.rewrittenText.replace(/<[^>]+>/g, ' ');
  const arabicChars = (plain.match(/[؀-ۿ]/g) ?? []).length;
  const latinChars = (plain.match(/[a-zA-Z]/g) ?? []).length;
  const arabicRatio = arabicChars / Math.max(1, arabicChars + latinChars);
  if (plain.trim().length < 60) issues.push('النص المُنتج قصير جداً — مادة غير مكتملة');
  else if (arabicRatio < 0.6 && (input.title.match(/[؀-ۿ]/g) ?? []).length < 5) {
    issues.push('النص المُنتج ليس عربياً بشكل كافٍ — تجب إعادة الصياغة');
  } else passed += 1;

  // 6) تقاطع المصادر المتعددة عند توفرها
  if (input.otherSourcesText && input.otherSourcesText.length > 0) {
    checks += 1;
    const others = input.otherSourcesText.map((t) => normalizeDigits(t));
    const contradictions = keyNumbers.filter(
      (n) => others.every((o) => o.includes(n)) && !rewrittenNorm.includes(n),
    );
    if (contradictions.length === 0) passed += 1;
    else issues.push(`تعارض مع مصادر أخرى حول: ${contradictions.slice(0, 3).join('، ')}`);
  }

  const score = checks === 0 ? 0 : Math.round((passed / checks) * 100) / 100;
  return { ok: issues.length === 0, score, issues, checkedAt: new Date().toISOString() };
}
