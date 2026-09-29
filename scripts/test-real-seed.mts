// ============================================================
// التحقق من التعبئة الافتتاحية بالأخبار الحقيقية:
//  - قاعدة فارغة تماماً → تُزرع أخبار حقيقية (is_demo=false، published)
//  - كل خبر له مصدر ورابط أصلي وتصنيف وصورة محلية مرخّصة
//  - خبر عاجل واحد على الأقل للشريط العاجل
// التشغيل: npx tsx scripts/test-real-seed.mts
// ============================================================
import { GlobalWindow } from 'happy-dom';
const window = new GlobalWindow({ url: 'http://localhost/' }) as unknown as Window & typeof globalThis;
const g = globalThis as unknown as Record<string, unknown>;
for (const [k, v] of Object.entries({ window, document: window.document, localStorage: window.localStorage })) {
  try { Object.defineProperty(g, k, { value: v, configurable: true, writable: true }); } catch { /* skip */ }
}

const { loadDB } = await import('../src/lib/store');

// قاعدة مستخدم تم تنظيفها للتو من DEMO — فارغة تماماً
window.localStorage.setItem(
  'newsmaroc.db.v1',
  JSON.stringify({
    articles: [],
    sources: [],
    comments: [],
    logs: [],
    settings: {
      site_name: 'NEWS MAROC', tagline: '', breaking_enabled: true, comments_enabled: true,
      ads: { header: false, homepage: false, article: true, sidebar: true, between: false },
      social: { facebook: '', instagram: '', youtube: '', x: '', tiktok: '' },
    },
    views: [],
  }),
);

const db = loadDB();

let ok = true;
const expect = (name: string, cond: boolean) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) ok = false;
};

expect(`الموقع امتلأ بأخبار حقيقية (${db.articles.length} خبراً)`, db.articles.length >= 12);
expect('لا يوجد أي خبر DEMO', db.articles.every((a) => a.is_demo === false));
expect('كل الأخبار منشورة', db.articles.every((a) => a.status === 'published'));
expect(
  'كل خبر مسند لمصدر حقيقي (اسم + رابط)',
  db.articles.every((a) => Boolean(a.source_name) && /^https?:\/\//.test(a.source_url ?? '')),
);
expect(
  'تواريخ المصادر محفوظة حيثما توفرت',
  db.articles.filter((a) => a.source_published_at).length >= db.articles.length - 1,
);
expect('كل خبر له صورة محلية مرخّصة', db.articles.every((a) => a.featured_image.startsWith('/demo-images/')));
expect('حقول SEO مكتملة', db.articles.every((a) => a.meta_title && a.meta_description && (a.keywords ?? []).length > 0));
expect('يوجد خبر عاجل للشريط', db.articles.some((a) => a.is_breaking));
expect('روابط فريدة', new Set(db.articles.map((a) => a.slug)).size === db.articles.length);
const cats = new Set(db.articles.map((a) => a.category));
expect(`تغطية أقسام متنوعة (${[...cats].join(', ')})`, cats.size >= 8);
expect('أخبار جهات موجودة', db.articles.filter((a) => a.region).length >= 2);
expect('الهجرة موسومة', (db.migrations ?? []).includes('real-news-seed-2026-09-28'));
expect('السجل وثّق الزرع', db.logs.some((l) => l.action === 'SEED_REAL_NEWS'));

console.log(ok ? '\n✅ التعبئة تعمل — الموقع يمتلئ بأخبار حقيقية موثقة فور التنظيف.' : '\n❌ فشل أحد الفحوص');
process.exit(ok ? 0 : 1);
