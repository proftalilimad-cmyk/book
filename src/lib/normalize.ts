// ============================================================
// مرحلة NORMALIZE في خط التجميع
//  SOURCE → FETCH → PARSE → NORMALIZE → EXTRACT → DEDUPLICATE …
// توحّد المادة الخام القادمة من أي مصدر (RSS مباشر، Google News،
// مصدر رسمي أو موقع موثّق) إلى بنية ثابتة قابلة للمقارنة.
// ============================================================

import { canonicalizeUrl, contentHash, normalizeTitleText } from '@/lib/dedup';

export interface NormalizedItem {
  /** العنوان كما ورد (يبقى للعرض) */
  title: string;
  /** العنوان المطبّع للمقارنة */
  normalized_title: string;
  /** النص الخام النظيف (وقائع المادة) */
  body: string;
  /** الرابط الأصلي كما ورد */
  source_url: string;
  /** الرابط القانوني (بدون وسوم تتبع) */
  canonical_url: string;
  /** بصمة المحتوى */
  content_hash: string;
  /** تاريخ النشر لدى المصدر ISO */
  source_published_at?: string;
  /** اسم الناشر الأصلي كما ورد في التغذية */
  publisher_name?: string;
  /** لغة النص الخام المكتشفة */
  language: 'ar' | 'fr' | 'en';
}

/** كشف اللغة من الحرف — العربية أولاً ثم الفرنسية/اللاتينية */
export function detectLanguage(text: string): 'ar' | 'fr' | 'en' {
  const arabic = (text.match(/[؀-ۿ]/g) ?? []).length;
  const latin = (text.match(/[a-zA-Zàâäéèêëîïôöùûüç]/gi) ?? []).length;
  if (arabic === 0 && latin === 0) return 'ar';
  if (arabic >= latin) return 'ar';
  return /[àâäéèêëîïôöùûüç]/i.test(text) ? 'fr' : 'en';
}

/** تنظيف النص الخام: إسقاط الوسوم والأسطر الدعائية الشائعة */
export function cleanRawText(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface RawIngestInput {
  raw_title: string;
  raw_body: string;
  source_url: string;
  source_published_at?: string;
  source_name?: string;
}

/** توحيد مادة خام واحدة إلى البنية القياسية */
export function normalizeRawItem(raw: RawIngestInput): NormalizedItem {
  const title = cleanRawText(raw.raw_title);
  const body = cleanRawText(raw.raw_body);
  const canonical_url = canonicalizeUrl(raw.source_url);
  return {
    title,
    normalized_title: normalizeTitleText(title),
    body,
    source_url: raw.source_url,
    canonical_url,
    content_hash: contentHash(`${title} ${body}`),
    source_published_at: raw.source_published_at,
    publisher_name: raw.source_name,
    language: detectLanguage(`${title} ${body}`),
  };
}
