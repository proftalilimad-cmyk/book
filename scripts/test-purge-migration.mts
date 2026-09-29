// ============================================================
// التحقق من هجرة حذف أخبار DEMO نهائياً:
//  - قاعدة قديمة مليئة بأخبار is_demo → تُحذف كلها عند التحميل
//  - المصادر الوهمية demo.example → تُوقف (paused)
//  - الأخبار الحقيقية والمصادر الحقيقية → لا تُمسّ
// التشغيل: npx tsx scripts/test-purge-migration.mts
// ============================================================
import { GlobalWindow } from 'happy-dom';
const window = new GlobalWindow({ url: 'http://localhost/' }) as unknown as Window & typeof globalThis;
const g = globalThis as unknown as Record<string, unknown>;
for (const [k, v] of Object.entries({ window, document: window.document, localStorage: window.localStorage })) {
  try { Object.defineProperty(g, k, { value: v, configurable: true, writable: true }); } catch { /* skip */ }
}

const { loadDB } = await import('../src/lib/store');
const { buildDemoArticles, buildDemoSources } = await import('../src/lib/demoData');

const demoArticles = buildDemoArticles();
const sources = buildDemoSources();
const realArticle = {
  ...demoArticles[0],
  id: 'real-1',
  title: 'خبر حقيقي من مصدر موثوق',
  slug: 'real-news-1',
  is_demo: false,
};

// محاكاة قاعدة المستخدم الحالية: أخبار DEMO + خبر حقيقي + تعليق مرتبط بخبر DEMO
window.localStorage.setItem(
  'newsmaroc.db.v1',
  JSON.stringify({
    articles: [...demoArticles, realArticle],
    sources,
    comments: [
      { id: 'c1', article_id: demoArticles[0].id, name: 'زائر', body: 'تعليق على خبر تجريبي', status: 'approved', created_at: new Date().toISOString() },
      { id: 'c2', article_id: 'real-1', name: 'قارئ', body: 'تعليق على خبر حقيقي', status: 'approved', created_at: new Date().toISOString() },
    ],
    logs: [],
    settings: {
      site_name: 'NEWS MAROC', tagline: '', breaking_enabled: true, comments_enabled: true,
      ads: { header: false, homepage: false, article: true, sidebar: true, between: false },
      social: { facebook: '', instagram: '', youtube: '', x: '', tiktok: '' },
    },
    views: [{ article_id: demoArticles[0].id, at: new Date().toISOString() }],
  }),
);

const db = loadDB();

let ok = true;
const expect = (name: string, cond: boolean) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) ok = false;
};

const demos = db.articles.filter((a) => a.is_demo);
expect(`كل أخبار DEMO حُذفت (بقي ${demos.length})`, demos.length === 0);
expect('الخبر الحقيقي بقي سليماً', db.articles.some((a) => a.id === 'real-1'));
expect(`إجمالي المقالات = 1 (وجد ${db.articles.length})`, db.articles.length === 1);
expect('تعليق الخبر التجريبي حُذف معه', !db.comments.some((c) => c.id === 'c1'));
expect('تعليق الخبر الحقيقي بقي', db.comments.some((c) => c.id === 'c2'));
expect('مشاهدات الخبر التجريبي حُذفت', db.views.every((v) => v.article_id === 'real-1'));
expect(
  'المصادر الوهمية demo.example متوقفة',
  db.sources.filter((s) => (s.rss_url ?? '').includes('demo.example')).every((s) => s.status === 'paused'),
);
expect(
  'مصادر Google News الحقيقية بقيت نشطة',
  db.sources.filter((s) => s.id.startsWith('src-gnews-')).every((s) => s.status === 'active'),
);
expect('الهجرة موسومة', (db.migrations ?? []).includes('purge-demo-2026-09'));
expect('سجلّ العمليات وثّق الحذف', db.logs.some((l) => l.action === 'PURGE_DEMO'));

console.log(ok ? '\n✅ هجرة الحذف تعمل — أخبار DEMO تُمحى نهائياً عند أول تحميل.' : '\n❌ فشل أحد الفحوص');
process.exit(ok ? 0 : 1);
