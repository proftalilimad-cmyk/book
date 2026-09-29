// ============================================================
// مكوّن SEO — يضبط Meta + Open Graph + Twitter Card + JSON-LD
// ============================================================

import { useEffect } from 'react';
import { SITE_NAME, SITE_URL } from '@/lib/utils';

interface SeoProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  publishedAt?: string;
  modifiedAt?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  noindex?: boolean;
}

const DEFAULT_DESC =
  'NEWS MAROC — منصة إخبارية مغربية مستقلة: آخر أخبار المغرب والجهات والسياسة والاقتصاد والرياضة والعالم.';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

export default function Seo({
  title,
  description = DEFAULT_DESC,
  keywords,
  image,
  url,
  type = 'website',
  publishedAt,
  modifiedAt,
  jsonLd,
  noindex = false,
}: SeoProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | أخبار المغرب لحظة بلحظة`;
    const absUrl = url ? `${SITE_URL}${url}` : `${SITE_URL}${window.location.pathname}`;
    const absImage = image
      ? image.startsWith('http')
        ? image
        : `${SITE_URL}${image}`
      : `${SITE_URL}/og-cover.svg`;

    document.title = fullTitle;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    if (keywords?.length) upsertMeta('name', 'keywords', keywords.join(', '));
    upsertLink('canonical', absUrl);

    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', 'ar_MA');
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', absUrl);
    upsertMeta('property', 'og:image', absImage);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', absImage);

    if (type === 'article' && publishedAt) {
      upsertMeta('property', 'article:published_time', publishedAt);
      if (modifiedAt) upsertMeta('property', 'article:modified_time', modifiedAt);
    }

    // JSON-LD
    const scriptId = 'jsonld-main';
    document.getElementById(scriptId)?.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, keywords, image, url, type, publishedAt, modifiedAt, jsonLd, noindex]);

  return null;
}
