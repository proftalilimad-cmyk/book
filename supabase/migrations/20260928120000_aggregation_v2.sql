-- ============================================================
-- NEWS AGGREGATOR v2 — ترقية وحدة التجميع فقط (غير هدّامة)
--  - حقول المصادر: language / country / priority / fetch_status
--  - حقول منع التكرار على المقالات: canonical_url / normalized_title
--    / content_hash / duplicate_group_id / source_references
--  - توسيع حالات المقال: FETCHED, DUPLICATE, VERIFIED, REWRITTEN,
--    REVIEW_REQUIRED, REJECTED
--  نصيحة: انسخي احتياطياً قبل التطبيق (النسخة تلقائية أيضاً من
--  لوحة المصادر — زر «نسخة احتياطية»).
-- ============================================================

-- ---------- حالات جديدة على enum المقالات ----------
alter type public.article_status add value if not exists 'fetched';
alter type public.article_status add value if not exists 'duplicate';
alter type public.article_status add value if not exists 'verified';
alter type public.article_status add value if not exists 'rewritten';
alter type public.article_status add value if not exists 'review_required';
alter type public.article_status add value if not exists 'rejected';

-- ---------- sources: الحقول الاحترافية ----------
alter table public.sources
  add column if not exists language text not null default 'ar'
    check (language in ('ar', 'fr', 'en')),
  add column if not exists country text not null default 'MA',
  add column if not exists priority smallint not null default 3
    check (priority between 1 and 5),
  add column if not exists fetch_status text not null default 'never'
    check (fetch_status in ('ok', 'error', 'never')),
  add column if not exists fetch_error text,
  add column if not exists items_fetched integer not null default 0;

-- ---------- articles: منع التكرار وجمع المصادر ----------
alter table public.articles
  add column if not exists canonical_url text,
  add column if not exists normalized_title text,
  add column if not exists content_hash text,
  add column if not exists duplicate_group_id uuid,
  add column if not exists source_references jsonb not null default '[]'::jsonb;

create index if not exists articles_canonical_url_idx on public.articles (canonical_url);
create index if not exists articles_content_hash_idx on public.articles (content_hash);
create index if not exists articles_duplicate_group_idx on public.articles (duplicate_group_id)
  where duplicate_group_id is not null;

-- ملاحظة: جدول article_sources الحالي يبقى صالحاً كربط تفصيلي؛
-- حقل source_references jsonb هو المصدر السريع لقراءة كل مصادر الحدث
-- مع الخبر الرئيسي دون joins في مسار القراءة العام.
