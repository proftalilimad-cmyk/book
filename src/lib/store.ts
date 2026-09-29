// ============================================================
// مخزن محلي (DEMO MODE) — يحاكي قاعدة البيانات عند عدم ربط Supabase
// مع حفظ دائم في localStorage كي تبقى تعديلات لوحة التحكم محفوظة.
// ============================================================

import type { Article, Comment, NewsLog, SiteSettings, Source } from '@/types';
import { buildDemoArticles, buildDemoSources, DEFAULT_SETTINGS } from '@/lib/demoData';
import { buildRealNewsArticles } from '@/lib/realNewsSeed';

const KEY = 'newsmaroc.db.v1';

export interface LocalDB {
  articles: Article[];
  sources: Source[];
  comments: Comment[];
  logs: NewsLog[];
  settings: SiteSettings;
  views: { article_id: string; at: string }[];
  migrations?: string[];
}

/** هجرات غير هدّامة: تضيف الجديد من البيانات الافتراضية دون مساس بإضافات المستخدم */
function runMigrations(db: LocalDB): boolean {
  db.migrations = db.migrations ?? [];
  let changed = false;

  // دمج مصادر Google News المغربية المُضافة لاحقاً
  if (!db.migrations.includes('sources-gnews-2026-09')) {
    for (const s of buildDemoSources()) {
      const exists = db.sources.some(
        (x) => x.id === s.id || (s.rss_url && x.rss_url === s.rss_url),
      );
      if (!exists) db.sources.push(s);
    }
    db.migrations.push('sources-gnews-2026-09');
    changed = true;
  }

  // حذف نهائي لكل الأخبار التجريبية (DEMO) وإيقاف المصادر الوهمية — بطلب مالك الموقع.
  // المنصة بعد هذه الهجرة تعرض أخباراً حقيقية مجلوبة من المصادر فقط.
  if (!db.migrations.includes('purge-demo-2026-09')) {
    db.comments = db.comments ?? [];
    db.views = db.views ?? [];
    db.logs = db.logs ?? [];
    const purgedArticles = db.articles.filter((a) => a.is_demo).length;
    db.articles = db.articles.filter((a) => !a.is_demo);
    const keptIds = new Set(db.articles.map((a) => a.id));
    db.comments = db.comments.filter((c) => keptIds.has(c.article_id));
    db.views = db.views.filter((v) => keptIds.has(v.article_id));
    let pausedSources = 0;
    for (const s of db.sources) {
      if ((s.rss_url ?? '').includes('demo.example') && s.status === 'active') {
        s.status = 'paused';
        pausedSources += 1;
      }
    }
    db.logs.unshift({
      id: `log-purge-${Date.now()}`,
      at: new Date().toISOString(),
      level: 'info',
      action: 'PURGE_DEMO',
      message: `تنظيف تلقائي: حُذف ${purgedArticles} خبراً تجريبياً (DEMO) نهائياً وأُوقف ${pausedSources} مصدر وهمي — المنصة تعمل الآن بأخبار حقيقية من المصادر فقط.`,
    });
    db.migrations.push('purge-demo-2026-09');
    changed = true;
  }

  // تعبئة افتتاحية بأخبار حقيقية موثقة (بطلب مالك الموقع):
  // تُزرع فقط عندما تخلو القاعدة من أي مقال — لا تمس محتوى المستخدم أبداً.
  if (!db.migrations.includes('real-news-seed-2026-09-28')) {
    if (db.articles.length === 0) {
      const real = buildRealNewsArticles();
      db.articles = real;
      db.logs = db.logs ?? [];
      db.logs.unshift({
        id: `log-real-seed-${Date.now()}`,
        at: new Date().toISOString(),
        level: 'info',
        action: 'SEED_REAL_NEWS',
        message: `تمت تعبئة الموقع بـ${real.length} خبراً حقيقياً موثقاً من مصادر مغربية (25-28 شتنبر 2026) بصياغة تحريرية مستقلة — المحتوى الافتتاحي بطلب المالك.`,
      });
    }
    db.migrations.push('real-news-seed-2026-09-28');
    changed = true;
  }

  // ترقية وحدة التجميع إلى v2: حقول المصادر الاحترافية (لغة/بلد/أولوية/حالة جلب)
  // غير هدّامة — تكمل القيم الناقصة فقط. تُلتقط نسخة احتياطية قبل الترقية.
  if (!db.migrations.includes('aggregation-v2-2026-09')) {
    try {
      localStorage.setItem(
        'newsmaroc.backup.pre-aggregation-v2',
        JSON.stringify({ at: new Date().toISOString(), sources: db.sources }),
      );
    } catch {
      /* تجاهل امتلاء المساحة */
    }
    for (const s of db.sources) {
      s.language = s.language ?? (s.rss_url?.includes('hl=fr') ? 'fr' : 'ar');
      s.country = s.country ?? 'MA';
      s.priority = s.priority ?? (s.rss_url?.includes('demo.example') ? 1 : 3);
      s.fetch_status = s.fetch_status ?? (s.last_fetched_at ? 'ok' : 'never');
      s.items_fetched = s.items_fetched ?? 0;
    }
    db.logs.unshift({
      id: `log-agv2-${Date.now()}`,
      at: new Date().toISOString(),
      level: 'info',
      action: 'AGGREGATION_V2',
      message: 'رُقيّت وحدة المصادر إلى نظام التجميع الاحترافي v2 (لغة/بلد/أولوية/حالة جلب) — نُسخت الحالة السابقة احتياطاً.',
    });
    db.migrations.push('aggregation-v2-2026-09');
    changed = true;
  }
  return changed;
}

function seed(): LocalDB {
  return {
    articles: buildDemoArticles(),
    sources: buildDemoSources(),
    comments: [
      {
        id: 'cmt-demo-1',
        article_id: 'demo-article-0',
        name: 'قارئ متابِع',
        body: 'تعليق تجريبي بانتظار المراجعة — يظهر هنا فقط لعرض آلية الإشراف على التعليقات.',
        status: 'pending',
        created_at: new Date(Date.now() - 3600_000).toISOString(),
      },
      {
        id: 'cmt-demo-2',
        article_id: 'demo-article-0',
        name: 'زائر المنصة',
        body: 'شكراً على هذه التغطية. محتوى تجريبي موافَق عليه لعرض شكل التعليقات المنشورة.',
        status: 'approved',
        created_at: new Date(Date.now() - 7200_000).toISOString(),
      },
    ],
    logs: [
      {
        id: 'log-seed',
        at: new Date().toISOString(),
        level: 'info',
        action: 'BOOT',
        message: 'تم تهيئة قاعدة البيانات المحلية بوضع العرض التجريبي (DEMO DATA).',
      },
    ],
    settings: structuredClone(DEFAULT_SETTINGS),
    views: [],
  };
}

let cache: LocalDB | null = null;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((l) => l());
}

export function loadDB(): LocalDB {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      cache = JSON.parse(raw) as LocalDB;
      if (runMigrations(cache)) persist();
      return cache;
    }
  } catch {
    // تجاهل وإعادة البذر
  }
  cache = seed();
  // تُطبَّق الهجرات (ومنها حذف DEMO) حتى في الزيارة الأولى
  runMigrations(cache);
  persist();
  return cache;
}

export function persist(): void {
  if (!cache) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // مساحة ممتلئة — نتجاهل بهدوء
  }
  notify();
}

export function mutate(fn: (db: LocalDB) => void): LocalDB {
  const db = loadDB();
  fn(db);
  persist();
  return db;
}

export function resetDemoDB(): void {
  cache = seed();
  persist();
}

/** نسخة react-friendly من الاشتراك */
export function getVersionSnapshot(): number {
  return versionCounter;
}

let versionCounter = 0;
subscribe(() => {
  versionCounter += 1;
});
