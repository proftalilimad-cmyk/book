#!/usr/bin/env node
// ============================================================
// توليد public/sitemap.xml
// - الصفحات الثابتة + التصنيفات + الجهات دائماً
// - الأخبار تُجلب من Supabase عند توفر بيانات الربط (VITE_SUPABASE_URL/ANON_KEY)
// ============================================================

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = process.env.VITE_SITE_URL || 'https://newsmaroc.ma';

const CATEGORY_SLUGS = [
  'maroc', 'politics', 'economy', 'society', 'education', 'health',
  'sports', 'culture', 'technology', 'incidents', 'art', 'weather', 'world',
];
const REGION_SLUGS = [
  'tanger-tetouan-alhoceima', 'oriental', 'fes-meknes', 'rabat-sale-kenitra',
  'beni-mellal-khenifra', 'casablanca-settat', 'marrakech-safi', 'draa-tafilalet',
  'souss-massa', 'guelmim-oued-noun', 'laayoune-sakia-elhamra', 'dakhla-oued-eddahab',
];
const STATIC_PAGES = ['/about', '/about/contact', '/privacy', '/terms', '/disclaimer', '/advertising', '/regions', '/search'];

const today = new Date().toISOString().slice(0, 10);

function url(loc, { priority = '0.6', changefreq = 'weekly', lastmod } = {}) {
  return `  <url>\n    <loc>${SITE}${loc}</loc>\n    ${lastmod ? `<lastmod>${lastmod}</lastmod>\n    ` : ''}<changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function fetchArticles() {
  const base = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!base || !key) {
    console.log('ℹ Supabase غير مضبوط — sitemap سيشمل الصفحات الثابتة فقط.');
    return [];
  }
  try {
    const res = await fetch(
      `${base}/rest/v1/articles?status=eq.published&select=slug,updated_at&order=updated_at.desc&limit=5000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn('⚠ تعذر جلب الأخبار للـ sitemap:', e.message);
    return [];
  }
}

const articles = await fetchArticles();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${url('/', { priority: '1.0', changefreq: 'always', lastmod: today })}
${CATEGORY_SLUGS.map((s) => url(`/category/${s}`, { priority: '0.8', changefreq: 'hourly' })).join('\n')}
${REGION_SLUGS.map((s) => url(`/regions/${s}`, { priority: '0.7', changefreq: 'hourly' })).join('\n')}
${STATIC_PAGES.map((p) => url(p, { priority: p === '/regions' ? '0.7' : '0.3' })).join('\n')}
${articles
  .map((a) => url(`/article/${a.slug}`, { priority: '0.6', changefreq: 'daily', lastmod: a.updated_at?.slice(0, 10) }))
  .join('\n')}
</urlset>
`;

writeFileSync(join(root, 'public', 'sitemap.xml'), xml, 'utf8');
console.log(`✓ sitemap.xml جاهز — ${articles.length} خبراً + ${CATEGORY_SLUGS.length} تصنيفاً + ${REGION_SLUGS.length} جهة`);
