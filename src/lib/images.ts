// ============================================================
// محرك صور الأخبار — استخراج الصورة الرئيسية المرتبطة بالخبر
//  ترتيب البحث: media:content → media:thumbnail → enclosure
//    → og:image → twitter:image → صورة المقال الرئيسية
//    → صورة القسم الافتراضية (مرخّصة محلياً)
//  القواعد:
//   - لا صور عشوائية أو من خبر آخر — الصورة من مادة الخبر نفسه فقط
//   - تجاهل الشعارات/الإعلانات/الصور الصغيرة/العدادات
//   - HTTPS عند التوفر — الإبقاء على الرابط الأصلي وحقوق الناشر
//   - لا نسخ إلى الخادم ولا تعديل للصورة ولا حذف للحقوق/العلامة المائية
// ============================================================

import type { Article, ImageRights, ImageStatus } from '@/types';

const BAD_IMAGE =
  /(logo|icon[-_]?\d*|sprite|blank|placeholder|avatar|pixel|counter|tracker|beacon|feedburner|doubleclick|googlesyndication|adservice|banner|\/ads?\/|adserver|stats?\.|emoji|smiley|loading|spinner|transparent|1x1|gravatar|favicon)/i;

const IMG_EXT = /\.(jpe?g|png|webp|avif)(\?|#|$)/i;
const GIF_EXT = /\.gif(\?|#|$)/i;
const CDN_HINT = /(image|images|img|media|photo|thumb|cdn|static)/i;

export interface ImageCandidate {
  url: string;
  width?: number;
  height?: number;
  via: string; // media:content | media:thumbnail | enclosure | og:image | twitter:image | article-img | rss-description
}

/** ترقية HTTP أو بروتوكول نسبي إلى HTTPS (نفس النطاق) */
export function toHttps(url: string): string {
  if (url.startsWith('//')) return `https:${url}`;
  return url.replace(/^http:\/\//i, 'https://');
}

/** تنقية رابط مرشح: إسقاط النسبي غير المكتمل وترقية HTTPS */
export function normalizeImageUrl(url: string, baseUrl?: string): string | null {
  let abs = url.trim();
  if (!abs) return null;
  if (abs.startsWith('//')) abs = `https:${abs}`;
  if (baseUrl && !/^https?:\/\//i.test(abs)) {
    try {
      abs = new URL(abs, baseUrl).toString();
    } catch {
      return null;
    }
  }
  if (!/^https?:\/\/.+\..+/.test(abs)) return null;
  return toHttps(abs);
}

/**
 * تقييم مرشح: -1 = مرفوض (شعار/إعلان/صغير جداً/غير صالح)،
 * وإلا درجة تفضيل (الأبعاد الأكبر والامتداد الواضح يتقدمان).
 */
export function scoreImageCandidate(c: ImageCandidate): number {
  if (!c.url) return -1;
  if (BAD_IMAGE.test(c.url)) return -1;
  if (c.width !== undefined && c.width > 0 && c.width < 200) return -1;
  if (c.height !== undefined && c.height > 0 && c.height < 120) return -1;
  let score = 0;
  if (IMG_EXT.test(c.url)) score += 4;
  else if (GIF_EXT.test(c.url)) score += 0; // gif يُقبل لكن بلا أفضلية
  else if (CDN_HINT.test(c.url)) score += 2;
  else return -1; // لا امتداد ولا مؤشر CDN — مشبوه
  if (c.width && c.height) score += Math.min(c.width * c.height, 400_000) / 100_000;
  else if (c.width) score += Math.min(c.width, 1200) / 400;
  return score;
}

/** اختيار أفضل مرشح صالح من قائمة مرتبة حسب ترتيب البحث */
export function pickBestImage(candidates: (ImageCandidate | null | undefined)[]): ImageCandidate | null {
  let best: ImageCandidate | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    if (!c) continue;
    const s = scoreImageCandidate(c);
    if (s > bestScore || (best === null && s >= 0)) {
      best = c;
      bestScore = Math.max(bestScore, s);
    }
  }
  return best && bestScore >= 0 ? best : null;
}

/**
 * التحقق من صورة مصرّح بها في التغذية قبل اعتمادها:
 * إمّا مرشح صالح، أو رفض موثّق (INVALID) يُسجَّل في حالة الصورة
 * بدل أن يُسقط بصمت إلى «غير موجودة». لا يتحقق شبكياً من الوصول —
 * النسخة غير القابلة للوصول تُلتقط عند العرض بتراجع NewsImage.
 */
export function validateDeclaredImage(
  url: string,
  width?: number,
  height?: number,
): { candidate: ImageCandidate | null; invalid: boolean } {
  const normalized = normalizeImageUrl(url);
  if (!normalized) return { candidate: null, invalid: true };
  const cand: ImageCandidate = { url: normalized, width, height, via: 'rss-declared' };
  if (scoreImageCandidate(cand) < 0) return { candidate: null, invalid: true };
  return { candidate: cand, invalid: false };
}

// ------------------------------------------------------------
// استخراج من صفحة HTML الأصلية (og/twitter أو صورة المقال)
// ------------------------------------------------------------
export interface PageImageExtraction extends ImageCandidate {
  via: 'og:image' | 'twitter:image' | 'article-img';
}

export function extractImageFromHtml(html: string, pageUrl: string): PageImageExtraction | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const meta = (sel: string, attr = 'content') => {
    const el = doc.querySelector(sel);
    const v = el?.getAttribute(attr) ?? '';
    return v.trim() || null;
  };

  const num = (v: string | null) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  // ترتيب البحث الصارم: og:image → twitter:image → صورة المقال الرئيسية
  const ogUrl = meta('meta[property="og:image:secure_url"]') ?? meta('meta[property="og:image"]');
  if (ogUrl) {
    const url = normalizeImageUrl(ogUrl, pageUrl);
    if (url) {
      const cand: PageImageExtraction = {
        url,
        width: num(meta('meta[property="og:image:width"]')),
        height: num(meta('meta[property="og:image:height"]')),
        via: 'og:image',
      };
      if (scoreImageCandidate(cand) >= 0) return cand;
    }
  }

  const twUrl =
    meta('meta[name="twitter:image"]') ?? meta('meta[name="twitter:image:src"]') ?? meta('meta[property="twitter:image"]');
  if (twUrl) {
    const url = normalizeImageUrl(twUrl, pageUrl);
    if (url) {
      const cand: PageImageExtraction = { url, via: 'twitter:image' };
      if (scoreImageCandidate(cand) >= 0) return cand;
    }
  }

  // الصورة الرئيسية داخل بنية المقال — الأكبر مساحة والخالية من الشعارات —
  // مع توسيع النطاق: article → main → body (أول نطاق يعطي صورة صالحة)
  const scopes = [doc.querySelector('article'), doc.querySelector('main'), doc.body].filter(
    (x): x is HTMLElement => Boolean(x),
  );
  let bestImg: PageImageExtraction | null = null;
  for (const scope of scopes) {
    const imgs = Array.from(scope.querySelectorAll('img'));
    let bestArea = 0;
    for (const img of imgs) {
      const raw =
        img.getAttribute('src') ??
        img.getAttribute('data-src') ??
        img.getAttribute('data-lazy-src') ??
        '';
      const url = normalizeImageUrl(raw, pageUrl);
      if (!url) continue;
      const w = (num(img.getAttribute('width')) ?? (img as HTMLImageElement).naturalWidth) || undefined;
      const h = (num(img.getAttribute('height')) ?? (img as HTMLImageElement).naturalHeight) || undefined;
      const cand: PageImageExtraction = { url, width: w, height: h, via: 'article-img' };
      if (scoreImageCandidate(cand) < 0) continue;
      const area = (w ?? 400) * (h ?? 250);
      if (area > bestArea) {
        bestArea = area;
        bestImg = cand;
      }
    }
    if (bestImg) break;
  }
  return bestImg;
}

// ------------------------------------------------------------
// الصورة الافتراضية للقسم (مرخّصة — مولّدة محلياً ضمن أصول الموقع)
// ------------------------------------------------------------
export function categoryDefaultImage(category: string, variant: 1 | 2 | 3 = 1): string {
  const known = /^[a-z-]+$/.test(category) ? category : 'maroc';
  return `/demo-images/${known}-${variant - 1}.svg`;
}

// ------------------------------------------------------------
// بناء بيانات الصورة الوصفية لمقال وفق قواعد الحقوق
// ------------------------------------------------------------
export interface ImageMetaPatch {
  featured_image: string;
  image_url?: string;
  image_source_url?: string;
  image_alt?: string;
  image_width?: number;
  image_height?: number;
  image_source_name?: string;
  image_license?: string;
  image_attribution?: string;
  image_rights: ImageRights;
  image_status: ImageStatus;
}

export function buildImageMeta(opts: {
  extracted?: ImageCandidate | null;
  publisherName?: string;
  sourcePageUrl?: string;
  title: string;
  category: string;
  /** الترخيص إن صرّحت به التغذية (media:license / dc:rights) */
  declaredLicense?: string;
  /** رابط مصرّح به لكنه مرفوض (إعلاني/شعار/معطوب) — يسجّل كـ INVALID */
  invalidUrl?: string;
}): ImageMetaPatch {
  const { extracted, publisherName, sourcePageUrl, title, category, declaredLicense, invalidUrl } = opts;

  if (!extracted) {
    // صورة مصرّح بها لكنها غير صالحة → توثيق الحالة بدل إسقاطها بصمت
    if (invalidUrl) {
      return {
        featured_image: categoryDefaultImage(category),
        image_url: invalidUrl,
        image_source_url: sourcePageUrl,
        image_source_name: publisherName,
        image_alt: title,
        image_status: 'invalid',
        image_license: 'unknown',
        image_attribution: 'رُفضت صورة المادة المصرّح بها (إعلانية/شعار/معطوبة) — عُرضت صورة القسم الافتراضية.',
        image_rights: 'unknown',
      };
    }
    return {
      featured_image: categoryDefaultImage(category),
      image_status: 'not_found',
      image_license: 'licensed-local',
      image_attribution: 'صورة تعبيرية مولّدة داخل المنصة — مرخّصة للاستخدام.',
      image_rights: 'licensed',
      image_source_name: publisherName,
      image_source_url: sourcePageUrl,
      image_alt: title,
    };
  }

  const clearLicense = Boolean(declaredLicense);
  const hasExt = IMG_EXT.test(extracted.url);
  const status: ImageStatus = clearLicense
    ? 'found'
    : hasExt || CDN_HINT.test(extracted.url)
      ? 'unknown_rights'
      : 'requires_review';

  return {
    featured_image: extracted.url, // يُعرض من رابط الناشر الأصلي (لا نسخ للخادم)
    image_url: extracted.url,
    image_source_url: sourcePageUrl,
    image_alt: title,
    image_width: extracted.width,
    image_height: extracted.height,
    image_source_name: publisherName,
    image_license: declaredLicense ?? 'unknown',
    image_attribution: publisherName
      ? `الصورة: ${publisherName} — الحقوق محفوظة لناشرها.`
      : 'الصورة من ناشر المادة الأصلية — الحقوق محفوظة لناشرها.',
    image_rights: clearLicense ? 'publisher' : 'unknown',
    image_status: status,
  };
}

/** تحديث featured_image في واجهات العرض: يُستعمل فقط عند فشل التحميل */
export function displayImage(article: Pick<Article, 'image_url' | 'featured_image' | 'category'>): string {
  return article.image_url || article.featured_image || categoryDefaultImage(article.category);
}
