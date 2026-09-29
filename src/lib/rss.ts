// ============================================================
// قارئ RSS/Atom داخل المتصفح (DOMParser)
// يستخرج: العنوان، الرابط، تاريخ النشر، الوصف (نظيف من HTML)،
// واسم الناشر/رابطه من عنصر <source> عند توفره (مثل Google News)،
// والصورة الرئيسية (media:content / media:thumbnail / enclosure / وصف).
// ============================================================

import { normalizeImageUrl, pickBestImage, type ImageCandidate } from '@/lib/images';

export interface ParsedRssItem {
  title: string;
  link: string;
  pubDateIso: string;
  description: string;
  publisherName?: string;
  publisherUrl?: string;
  /** رابط المقال الأصلي لمواد المجمعات (Google News: الرابط تحويلي والأصل داخل الوصف) */
  articleUrl?: string;
  /** الصورة الرئيسية المرتبطة بالخبر كما صرّحت التغذية */
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
}

function stripTags(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.textContent || '').replace(/\s+/g, ' ').trim();
}

function pickText(el: Element, tag: string): string {
  const node = el.getElementsByTagName(tag)[0];
  return (node?.textContent ?? '').trim();
}

export function parseRss(xmlText: string): ParsedRssItem[] {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  if (doc.querySelector('parsererror')) return [];

  const out: ParsedRssItem[] = [];

  /** استخراج الصورة بالترتيب: media:content → media:thumbnail → enclosure → وصف */
  const pickItemImage = (el: Element, htmlDesc: string, base: string) => {
    const candidates: ImageCandidate[] = [];
    for (const mc of Array.from(el.getElementsByTagName('media:content'))) {
      const type = mc.getAttribute('type') ?? '';
      if (type && !type.startsWith('image/')) continue;
      const url = normalizeImageUrl(mc.getAttribute('url') ?? '', base);
      if (url) {
        candidates.push({
          url,
          width: Number(mc.getAttribute('width')) || undefined,
          height: Number(mc.getAttribute('height')) || undefined,
          via: 'media:content',
        });
      }
    }
    for (const mt of Array.from(el.getElementsByTagName('media:thumbnail'))) {
      const url = normalizeImageUrl(mt.getAttribute('url') ?? '', base);
      if (url) {
        candidates.push({
          url,
          width: Number(mt.getAttribute('width')) || undefined,
          height: Number(mt.getAttribute('height')) || undefined,
          via: 'media:thumbnail',
        });
      }
    }
    for (const enc of Array.from(el.getElementsByTagName('enclosure'))) {
      const type = enc.getAttribute('type') ?? '';
      if (!type.startsWith('image/')) continue;
      const url = normalizeImageUrl(enc.getAttribute('url') ?? '', base);
      if (url) candidates.push({ url, via: 'enclosure' });
    }
    // <img> داخل وصف HTML (بعض التغذيات تضمنها هناك)
    for (const m of htmlDesc.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi)) {
      const url = normalizeImageUrl(m[1], base);
      if (url) candidates.push({ url, via: 'rss-description' });
    }
    return pickBestImage(candidates);
  };

  // RSS 2.0 → <item>
  for (const el of Array.from(doc.getElementsByTagName('item'))) {
    const title = stripTags(pickText(el, 'title'));
    const link = pickText(el, 'link') || pickText(el, 'guid');
    const rawDesc = pickText(el, 'description') || pickText(el, 'content:encoded');
    const pub = pickText(el, 'pubDate') || pickText(el, 'dc:date');
    const src = el.getElementsByTagName('source')[0];
    if (!title || !link) continue;
    const image = pickItemImage(el, rawDesc, link);
    out.push({
      title,
      link,
      pubDateIso: pub ? safeIso(pub) : new Date().toISOString(),
      description: stripTags(rawDesc).slice(0, 900) || title,
      publisherName: src ? stripTags(src.textContent ?? '') || undefined : undefined,
      publisherUrl: src?.getAttribute('url') || undefined,
      articleUrl: resolvePublisherArticleUrl(link, rawDesc),
      imageUrl: image?.url,
      imageWidth: image?.width,
      imageHeight: image?.height,
    });
  }

  // Atom → <entry>
  if (out.length === 0) {
    for (const el of Array.from(doc.getElementsByTagName('entry'))) {
      const title = stripTags(pickText(el, 'title'));
      const linkEl =
        el.querySelector('link[rel="alternate"]') ?? el.getElementsByTagName('link')[0];
      const link = linkEl?.getAttribute('href') ?? '';
      const rawDesc = pickText(el, 'summary') || pickText(el, 'content');
      const pub = pickText(el, 'published') || pickText(el, 'updated');
      if (!title || !link) continue;
      // Atom: link[rel=enclosure][type^=image] أو media:* داخل entry
      const candidates: ImageCandidate[] = [];
      for (const l of Array.from(el.querySelectorAll('link[rel="enclosure"]'))) {
        const type = l.getAttribute('type') ?? '';
        if (!type.startsWith('image/')) continue;
        const url = normalizeImageUrl(l.getAttribute('href') ?? '', link);
        if (url) candidates.push({ url, via: 'enclosure' });
      }
      for (const mt of Array.from(el.getElementsByTagName('media:thumbnail'))) {
        const url = normalizeImageUrl(mt.getAttribute('url') ?? '', link);
        if (url) candidates.push({ url, via: 'media:thumbnail' });
      }
      const image = pickBestImage(candidates);
      out.push({
        title,
        link,
        pubDateIso: pub ? safeIso(pub) : new Date().toISOString(),
        description: stripTags(rawDesc).slice(0, 900) || title,
        imageUrl: image?.url,
        imageWidth: image?.width,
        imageHeight: image?.height,
      });
    }
  }

  return out;
}

function safeIso(dateStr: string): string {
  const t = Date.parse(dateStr);
  return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}

/** هل الرابط من مجمّع أخبار (تحويلي — ليس رابط الناشر الأصلي) */
export function isAggregatorLink(link: string): boolean {
  try {
    return new URL(link).hostname.toLowerCase().includes('google.');
  } catch {
    return false;
  }
}

/**
 * لمواد المجمّعات (Google News): استخراج رابط المقال الأصلي من مرساة الوصف.
 * يُقصر التعويض على روابط المجمّع حتى لا تُقتنص روابط دخيلة من تغذيات الناشرين.
 */
export function resolvePublisherArticleUrl(link: string, rawDescHtml: string): string | undefined {
  if (!isAggregatorLink(link)) return undefined;
  for (const m of rawDescHtml.matchAll(/<a[^>]+href=["'](https?:\/\/[^"']+)["']/gi)) {
    const href = m[1];
    if (!isAggregatorLink(href)) return href;
  }
  return undefined;
}

/** الرابط الذي يمثل المادة فعلياً — الأصل إن تعرفنا عليه وإلا رابط المادة نفسه */
export function resolveItemUrl(it: { link: string; articleUrl?: string }): string {
  return it.articleUrl ?? it.link;
}

/** بناء رابط الجلب عبر وسيط RSS الداخلي (يتجاوز CORS) */
export function proxiedRssUrl(targetUrl: string): string {
  return `${window.location.origin}/api/rss?url=${encodeURIComponent(targetUrl)}`;
}

/**
 * سلسلة قنوات الجلب (بالترتيب):
 *  1) الوسيط الداخلي /api/rss — الأفضل في الإنتاج (Netlify Function)
 *  2) مرحّلات CORS عامة — تعمل مباشرة من متصفح المستخدم
 */
const FETCH_CHAIN: Array<(target: string) => string> = [
  (u) => proxiedRssUrl(u),
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
];

export interface RssFetchResult {
  xml: string;
  via: string;
}

/** جلب نص بتعاقب القنوات (يُستخدم للتغذيات ولصفحات المقالات لاستخراج og:image) */
export async function fetchTextSmart(
  targetUrl: string,
  opts: { contentPattern: RegExp; timeoutMs?: number; minLen?: number },
): Promise<{ text: string; via: string }> {
  let lastErr: unknown = null;
  for (const buildUrl of FETCH_CHAIN) {
    const url = buildUrl(targetUrl);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(opts.timeoutMs ?? 14000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (!text || text.trim().length < (opts.minLen ?? 120) || !opts.contentPattern.test(text)) {
        throw new Error('استجابة غير صالحة');
      }
      return { text, via: url };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(lastErr instanceof Error ? lastErr.message : 'تعذر الجلب');
}

/** جلب التغذية بتعاقب القنوات حتى النجاح */
export async function fetchRssSmart(targetUrl: string): Promise<RssFetchResult> {
  const { text, via } = await fetchTextSmart(targetUrl, {
    contentPattern: /<(rss|feed|rdf|item|entry)\b/i,
  });
  return { xml: text, via };
}
