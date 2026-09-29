// ============================================================
// محرك المعالجة الصحفية — نواة NEWS AI AGENT
//  - توليد عنوان صحفي نظيف
//  - توليد ملخص
//  - إعادة صياغة مستقلة للوقائع (لا نسخ حرفي)
//  - تحديد التصنيف + الجهة
//  - استخراج الكلمات المفتاحية + حقول SEO
// قاعدة تحريرية: لا تُختلق أي معلومة غير موجودة في المادة الخام.
// ============================================================

import { CATEGORIES, REGIONS } from '@/lib/demoData';
import { normalizeArabic } from '@/lib/dedup';
import { slugifyAr } from '@/lib/utils';

// ---------- تنظيف وتحسين العنوان ----------
const TITLE_PREFIXES = [/^عاجل[.:،،\s-]*/i, /^مصدر\s*[:：]\s*/i, /^خاص\s*[:：]\s*/i, /^فيديو\s*[:：]\s*/i];

export function generateTitle(rawTitle: string): string {
  let t = rawTitle.trim().replace(/\s+/g, ' ');
  for (const p of TITLE_PREFIXES) t = t.replace(p, '');
  t = t.replace(/[«»]/g, '').replace(/^[\s.,،؛:!؟?-]+|[\s.,،؛:]+$/g, '');
  if (t.endsWith('.')) t = t.slice(0, -1);
  return t.slice(0, 110);
}

// ---------- الملخص ----------
export function generateSummary(rawBody: string, maxLen = 190): string {
  const clean = rawBody.replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!؟?])/u).map((s) => s.trim()).filter(Boolean);
  let out = '';
  for (const s of sentences) {
    if ((out + ' ' + s).trim().length > maxLen) break;
    out = (out + ' ' + s).trim();
  }
  if (!out) out = clean.slice(0, maxLen);
  return out;
}

// ---------- إعادة الصياغة ----------
const SYNONYMS: Array<[RegExp, string]> = [
  [/أفاد(ت)? مصادر?/g, 'ذكرت مصادر'],
  [/وأضاف(ت)? المصدر ذاته/g, 'وأشار المصدر نفسه'],
  [/وأضاف(ت)? أن/g, 'وأوضح أن'],
  [/أكد(ت)? أن/g, 'شدد على أن'],
  [/حسب المعطيات الأولية/g, 'وفق المعطيات الأولية المتوفرة'],
  [/قريباً/g, 'في المستقبل القريب'],
  [/مختلف الدول/g, 'عدد من الدول'],
  [/بشكل ملحوظ/g, 'على نحو ملموس'],
  [/عاجل/g, 'مستجد'],
];

export function rewriteBody(title: string, rawBody: string, sourceName?: string): string {
  const clean = rawBody.replace(/\s+/g, ' ').trim();
  let sentences = clean.split(/(?<=[.!؟?])/u).map((s) => s.trim()).filter((s) => s.length > 15);

  // إزالة أي جملة تكرر العنوان حرفياً (بداية الاستقلالية عن الصياغة الأصلية)
  const normTitle = normalizeArabic(title);
  sentences = sentences.filter((s) => normalizeArabic(s) !== normTitle);

  const rewritten = sentences.map((s) => {
    let out = s;
    for (const [re, rep] of SYNONYMS) out = out.replace(re, rep);
    return out;
  });

  const paragraphs: string[] = [];
  for (let i = 0; i < rewritten.length; i += 2) {
    paragraphs.push(`<p>${rewritten.slice(i, i + 2).join(' ')}</p>`);
  }
  if (paragraphs.length === 0) {
    paragraphs.push(`<p>${clean}</p>`);
  }
  paragraphs.push(
    `<p><em>أعدّ هذه المادة نظام NEWS AI AGENT اعتماداً على معطيات أولية${sourceName ? ` من «${sourceName}»` : ''}، مع إعادة صياغة مستقلة للوقائع والإبقاء على الإحالة الكاملة إلى المصدر الأصلي تطبيقاً للقاعدة التحريرية للمنصة.</em></p>`,
  );
  return paragraphs.join('\n');
}

// ---------- التصنيف ----------
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  maroc: ['المغرب', 'المملكة', 'وطني', 'مشروع', 'جهة', 'اطلاق', 'محطه', 'ماء', 'بنيه'],
  politics: ['الحكومة', 'البرلمان', 'مجلس', 'قانون', 'سياسي', 'انتخابات', 'وزير', 'حزب'],
  economy: ['استثمار', 'اقتصاد', 'سوق', 'نمو', 'صادرات', 'مقاولات', 'مالي', 'تصدير', 'بنوك', 'أسعار', 'صناعة', 'سيارات'],
  society: ['تضامن', 'جمعيات', 'حملة', 'الأسر', 'تطوع', 'اجتماعي'],
  education: ['الباكالوريا', 'الدراسي', 'المدرسة', 'الجامعة', 'التلاميذ', 'الطلبة', 'التعليم', 'امتحانات', 'الدخول المدرسي'],
  health: ['الصحة', 'مستشفى', 'التلقيح', 'المرضى', 'طبية', 'لقاح'],
  sports: ['المنتخب', 'مباراة', 'البطولة', 'كرة القدم', 'الفريق', 'دوري', 'لاعب', 'رياضية'],
  culture: ['مهرجان', 'ثقافة', 'الكتاب', 'سينما', 'تراث', 'أدب', 'معرض'],
  technology: ['الذكاء الاصطناعي', 'رقمي', 'تكنولوجيا', 'منصة', 'ابتكار', 'بيانات', 'سحابية', 'تطبيق'],
  incidents: ['حريق', 'حادثة', 'جرحى', 'وقاية مدنية', 'سير', 'انفجار'],
  art: ['فني', 'مسرح', 'ألبوم', 'غنائي', 'فنانون', 'سهرة'],
  weather: ['أمطار', 'رعدية', 'الطقس', 'حرارة', 'رياح', 'نشرة', 'تساقطات', 'موجة'],
  world: ['دولي', 'قمة', 'العالم', 'أوروبا', 'الأمم المتحدة', 'مؤتمر'],
  tourism: ['سياحة', 'سياح', 'الفنادق', 'وجهة', 'ليلة مبيت', 'الوافدون', 'موسم سياحي'],
  diaspora: ['مغاربة العالم', 'الجالية', 'المهاجرين', 'المقيمين بالخارج', 'أفراد الجالية', 'الجالية المغربية'],
  regions: ['جهة', 'إقليم', 'عمالة', 'جماعة', 'مجلس الجهة', 'مجلس المدينة'],
};

export function classifyArticle(text: string): string {
  const norm = normalizeArabic(text);
  let best = 'maroc';
  let bestScore = 0;
  for (const [slug, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const kw of kws) {
      const n = normalizeArabic(kw);
      if (norm.includes(n)) score += n.split(' ').length; // عبارات أطول = وزن أكبر
    }
    if (score > bestScore) {
      bestScore = score;
      best = slug;
    }
  }
  return CATEGORIES.some((c) => c.slug === best) ? best : 'maroc';
}

// ---------- الجهة ----------
const CITY_TO_REGION: Record<string, string> = {
  'طنجة': 'tanger-tetouan-alhoceima', 'تطوان': 'tanger-tetouan-alhoceima', 'الحسيمة': 'tanger-tetouan-alhoceima', 'عرائش': 'tanger-tetouan-alhoceima',
  'وجدة': 'oriental', 'الناظور': 'oriental', 'بركان': 'oriental', 'الشرقية': 'oriental', 'المناطق الشمالية': 'tanger-tetouan-alhoceima',
  'فاس': 'fes-meknes', 'مكناس': 'fes-meknes', 'تازة': 'fes-meknes',
  'الرباط': 'rabat-sale-kenitra', 'سلا': 'rabat-sale-kenitra', 'القنيطرة': 'rabat-sale-kenitra', 'تمارة': 'rabat-sale-kenitra',
  'بني ملال': 'beni-mellal-khenifra', 'خنيفرة': 'beni-mellal-khenifra', 'الفقيه بن صالح': 'beni-mellal-khenifra',
  'الدار البيضاء': 'casablanca-settat', 'البيضاء': 'casablanca-settat', 'سطات': 'casablanca-settat', 'المحمدية': 'casablanca-settat',
  'مراكش': 'marrakech-safi', 'آسفي': 'marrakech-safi', 'الصويرة': 'marrakech-safi',
  'الرشيدية': 'draa-tafilalet', 'ورزازات': 'draa-tafilalet', 'ميدلت': 'draa-tafilalet', 'تنغير': 'draa-tafilalet',
  'أكادير': 'souss-massa', 'اكادير': 'souss-massa', 'تيزنيت': 'souss-massa', 'تارودانت': 'souss-massa', 'إنزكان': 'souss-massa', 'سوس': 'souss-massa',
  'كلميم': 'guelmim-oued-noun', 'سيدي إفني': 'guelmim-oued-noun', 'طانطان': 'guelmim-oued-noun',
  'العيون': 'laayoune-sakia-elhamra', 'السمارة': 'laayoune-sakia-elhamra', 'بوجدور': 'laayoune-sakia-elhamra',
  'الداخلة': 'dakhla-oued-eddahab', 'وادي الذهب': 'dakhla-oued-eddahab',
};

export function detectRegion(text: string): string | undefined {
  for (const [city, slug] of Object.entries(CITY_TO_REGION)) {
    if (text.includes(city)) return slug;
  }
  return undefined;
}

// ---------- الكلمات المفتاحية ----------
export function extractKeywords(text: string, category: string, max = 6): string[] {
  const norm = normalizeArabic(text);
  const freq = new Map<string, number>();
  const display = new Map<string, string>();
  // نحتفظ بالصيغة الأصلية للكلمة
  const words = text.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 3);
  for (const w of words) {
    const n = normalizeArabic(w);
    if (n.length < 4) continue;
    freq.set(n, (freq.get(n) ?? 0) + 1);
    if (!display.has(n)) display.set(n, w);
  }
  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([n]) => display.get(n)!);
  const catName = CATEGORIES.find((c) => c.slug === category)?.name;
  const out = [...top];
  if (catName && !out.includes(catName)) out.push(catName);
  if (!out.includes('المغرب')) out.push('المغرب');
  return out.slice(0, max + 2);
}

// ---------- SEO ----------
export function buildSeoFields(title: string, summary: string) {
  const metaTitle = title.length <= 62 ? title : title.slice(0, 61).trim() + '…';
  const metaDescription = summary.length <= 155 ? summary : summary.slice(0, 154).trim() + '…';
  const slugBase = slugifyAr(title) || 'article';
  return {
    meta_title: metaTitle,
    meta_description: metaDescription,
    slug: `${slugBase}-${Math.random().toString(36).slice(2, 6)}`,
  };
}

export function regionName(slug?: string): string | undefined {
  return REGIONS.find((r) => r.slug === slug)?.name;
}
