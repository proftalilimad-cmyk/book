// ============================================================
// كشف الأخبار المكررة
//  - تطابق URL
//  - تشابه العناوين (Jaccard على الكلمات بعد التطبيع)
//  - قرب تاريخ النشر
// ============================================================

export function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, '') // التشكيل والتطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'في', 'من', 'الى', 'إلى', 'على', 'عن', 'ان', 'أن', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي',
  'بعد', 'قبل', 'مع', 'كل', 'او', 'أو', 'ثم', 'قد', 'لا', 'لم', 'لن', 'ما', 'هو', 'هي',
  'بين', 'عند', 'حتى', 'اذا', 'إذا', 'لل', 'وب', 'فى', 'ب', 'و', 'ل', 'ك',
]);

/** جذع خفيف: إسقاط أدوات التعريف والجرّ الملتصقة (المغرب/للمغرب/والمغرب واحد) */
function stemLight(w: string): string {
  const s = w.replace(/^(وال|فال|بال|كال|لل|ال)/, '');
  return s.length >= 3 ? s : w;
}

export function tokenize(text: string): Set<string> {
  return new Set(
    normalizeArabic(text)
      .split(' ')
      .filter((w) => w.length > 2 && !STOPWORDS.has(w))
      .map(stemLight),
  );
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

export function titleSimilarity(t1: string, t2: string): number {
  return jaccardSimilarity(tokenize(t1), tokenize(t2));
}

/** هل العنوان أ يشتمل تقريباً على العنوان ب؟ */
export function containment(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  const smaller = ta.size < tb.size ? ta : tb;
  const larger = ta.size < tb.size ? tb : ta;
  let inter = 0;
  for (const w of smaller) if (larger.has(w)) inter++;
  return inter / smaller.size;
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = '';
    u.search = '';
    return u.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, '');
  }
}

// ------------------------------------------------------------
// منع التكرار v2 — رابط قانوني + عنوان مطبّع + بصمة محتوى + حدث واحد
// ------------------------------------------------------------

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|igshid$|ref$|ref_src$|ocid$|cmp$|source$)/i;

/** الرابط القانوني: يُزيل وسوم التتبع ويوحّد الصيغة */
export function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    u.hash = '';
    const kept: string[] = [];
    u.searchParams.forEach((v, k) => {
      if (!TRACKING_PARAMS.test(k)) kept.push(`${k}=${v}`);
    });
    u.search = kept.length > 0 ? `?${kept.join('&')}` : '';
    u.hostname = u.hostname.replace(/^www\./, '');
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, '');
    return u.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, '');
  }
}

const TITLE_FILLERS = /(عاجل|مباشر|حصري|بالفيديو|فيديو|صور|بالصور|شاهد|تفاصيل|هام|الآن)/g;

/** العنوان المطبّع للمقارنة — يُسقط كلمات الإثارة النمطية قبل التطبيع */
export function normalizeTitleText(title: string): string {
  return normalizeArabic(title.replace(TITLE_FILLERS, ' '));
}

/** بصمة FNV-1a (64 بِت) على المحتوى المطبّع — سريعة وكافية لكشف النسخ */
export function contentHash(text: string): string {
  const norm = normalizeArabic(text).replace(/\s+/g, '');
  let h1 = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < norm.length; i++) {
    h1 ^= BigInt(norm.charCodeAt(i));
    h1 = (h1 * prime) & mask;
  }
  return h1.toString(16).padStart(16, '0');
}

/** تشابه المحتوى: Jaccard على رموز النص الكامل */
export function contentSimilarity(a: string, b: string): number {
  return jaccardSimilarity(tokenize(a), tokenize(b));
}

export interface DupCandidate {
  title: string;
  normalized_title?: string;
  source_url?: string;
  canonical_url?: string;
  content_hash?: string;
  content?: string;
  published_at?: string;
}

export interface DupTarget extends DupCandidate {
  id?: string;
  /** عند ضبطه: معرّف الخبر الرئيسي لمجموعة التكرار */
  duplicate_group_id?: string;
}

export type DuplicateReason = 'url' | 'canonical' | 'title-similarity' | 'content' | 'event';

/**
 * الفحص الكامل وفق المعايير الخمسة بالترتيب:
 * 1) URL مطابق 2) URL قانوني مطابق 3) عنوان شبه مطابق
 * 4) محتوى شبه مطابق 5) الحدث نفسه من مصادر متعددة (نافذة زمنية ضيقة)
 */
export function findDuplicateFull(
  candidate: DupCandidate,
  existing: DupTarget[],
  opts: { titleThreshold?: number; contentThreshold?: number; eventTitleThreshold?: number; eventWindowH?: number } = {},
): { match: boolean; reason?: DuplicateReason; target?: DupTarget } {
  const tThr = opts.titleThreshold ?? 0.55;
  const cThr = opts.contentThreshold ?? 0.8;
  const eThr = opts.eventTitleThreshold ?? 0.5;
  const eWin = opts.eventWindowH ?? 48;

  const candUrl = candidate.source_url ? normalizeUrl(candidate.source_url) : null;
  const candCanon = candidate.canonical_url ?? (candidate.source_url ? canonicalizeUrl(candidate.source_url) : null);
  const candTitle = candidate.normalized_title ?? normalizeTitleText(candidate.title);
  const candTime = candidate.published_at ? new Date(candidate.published_at).getTime() : null;

  for (const item of existing) {
    // 1) الرابط المطبع المطابق
    if (candUrl && item.source_url && normalizeUrl(item.source_url) === candUrl) {
      return { match: true, reason: 'url', target: item };
    }
    // 2) الرابط القانوني المطابق
    const itemCanon = item.canonical_url ?? (item.source_url ? canonicalizeUrl(item.source_url) : null);
    if (candCanon && itemCanon && candCanon === itemCanon) {
      return { match: true, reason: 'canonical', target: item };
    }

    const itemTitle = item.normalized_title ?? normalizeTitleText(item.title);
    // تشابه على العنوانين الأصليين وعلى المطبّعين (الأعلى يُعتمد)
    const sim = Math.max(
      titleSimilarity(candidate.title, item.title),
      jaccardSimilarity(tokenize(candTitle), tokenize(itemTitle)),
    );
    const cont = containment(candidate.title, item.title);
    const itemTime = item.published_at ? new Date(item.published_at).getTime() : null;
    const diffH = candTime !== null && itemTime !== null ? Math.abs(candTime - itemTime) / 36e5 : 0;
    const dateClose = diffH <= 72;

    // 3) عنوان شبه مطابق
    if (dateClose && (sim >= tThr || cont >= 0.85)) {
      return { match: true, reason: 'title-similarity', target: item };
    }
    // 4) بصمة محتوى مطابقة أو محتوى شبه مطابق
    if (candidate.content_hash && item.content_hash && candidate.content_hash === item.content_hash) {
      return { match: true, reason: 'content', target: item };
    }
    if (dateClose && candidate.content && item.content && contentSimilarity(candidate.content, item.content) >= cThr) {
      return { match: true, reason: 'content', target: item };
    }
    // 5) الحدث نفسه من مصدر آخر — نافذة زمنية ضيقة + تشابه ملموس
    if (diffH <= eWin && sim >= eThr) {
      return { match: true, reason: 'event', target: item };
    }
  }
  return { match: false };
}

export interface DuplicateCheckInput {
  title: string;
  source_url?: string;
  published_at?: string;
}

/**
 * فحص تكرار خبر مقابل قائمة أخبار موجودة.
 * يُرجع سبب التطابق إن وُجد.
 */
export function findDuplicate(
  candidate: DuplicateCheckInput,
  existing: DuplicateCheckInput[],
  titleThreshold = 0.55,
): { match: boolean; reason?: string } {
  const candUrl = candidate.source_url ? normalizeUrl(candidate.source_url) : null;

  for (const item of existing) {
    // 1) تطابق الرابط
    if (candUrl && item.source_url && normalizeUrl(item.source_url) === candUrl) {
      return { match: true, reason: 'url' };
    }
    // 2) تشابه العنوان (+ قرب التاريخ إن توفر)
    const sim = titleSimilarity(candidate.title, item.title);
    const cont = containment(candidate.title, item.title);
    let dateClose = true;
    if (candidate.published_at && item.published_at) {
      const diffH =
        Math.abs(new Date(candidate.published_at).getTime() - new Date(item.published_at).getTime()) /
        36e5;
      dateClose = diffH <= 72; // نافذة 72 ساعة
    }
    if (dateClose && (sim >= titleThreshold || cont >= 0.85)) {
      return { match: true, reason: 'title-similarity' };
    }
  }
  return { match: false };
}
