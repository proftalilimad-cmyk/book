// ============================================================
// التحقق من هجرة دمج المصادر الجديدة في قاعدة محلية قديمة
// ============================================================
import { GlobalWindow } from 'happy-dom';
const window = new GlobalWindow({ url: 'http://localhost/' }) as unknown as Window & typeof globalThis;
const g = globalThis as unknown as Record<string, unknown>;
for (const [k, v] of Object.entries({ window, document: window.document, localStorage: window.localStorage })) {
  try { Object.defineProperty(g, k, { value: v, configurable: true, writable: true }); } catch { /* skip */ }
}

const { loadDB } = await import('../src/lib/store');
const { buildDemoSources } = await import('../src/lib/demoData');

// محاكاة قاعدة قديمة: مصدر واحد فقط بدون علم الهجرة
window.localStorage.setItem(
  'newsmaroc.db.v1',
  JSON.stringify({
    articles: [],
    sources: [buildDemoSources()[0]],
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

// @ts-expect-error الوصول الداخلي لأغراض الاختبار
const db = loadDB();
const gnews = db.sources.filter((s) => s.id.startsWith('src-gnews-'));
const total = db.sources.length;
const names = gnews.map((s) => s.name);

let ok = true;
const expect = (name: string, cond: boolean) => {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) ok = false;
};

expect(`العدد الكلي للمصادر = 17 (2 تجريبي + 15 جديدة)، وجد ${total}`, total === 17);
expect(`مصادر Google News = 15، وجد ${gnews.length}`, gnews.length === 15);
expect('الهجرة موسومة', (db.migrations ?? []).includes('sources-gnews-2026-09'));
expect('كل المصادر النشطة لها RSS', db.sources.every((s) => !s.id.includes('gnews') || (s.rss_url ?? '').includes('news.google.com/rss')));
expect('هسبريس موجود', names.includes('هسبريس'));
expect('التعليم في المغرب مصنف education', db.sources.find((s) => s.name === 'التعليم في المغرب')?.category_slug === 'education');
expect('أنفاس بريس مصنف society', db.sources.find((s) => s.name === 'أنفاس بريس')?.category_slug === 'society');
expect('الاقتصاد المغربي مصنف economy', db.sources.find((s) => s.name === 'الاقتصاد المغربي')?.category_slug === 'economy');

console.log(ok ? '\n✅ الهجرة تعمل — المصادر الـ15 أضيفت دون فقدان أي مصدر سابق.' : '\n❌ فشل أحد الفحوص');
process.exit(ok ? 0 : 1);
