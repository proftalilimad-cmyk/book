-- ============================================================
-- NEWS MAROC — بيانات البذر (تصنيفات + إعدادات افتراضية)
-- نفّذها بعد migrations عبر: supabase db push / SQL Editor
-- ============================================================

insert into public.categories (name, slug, color, description, sort) values
  ('المغرب', 'maroc', '#c1272d', 'آخر المستجدات الوطنية', 1),
  ('سياسة', 'politics', '#6d28d9', 'الشأن السياسي الوطني', 2),
  ('اقتصاد', 'economy', '#047857', 'الاقتصاد والاستثمار والمالية', 3),
  ('مجتمع', 'society', '#d97706', 'قضايا المجتمع', 4),
  ('تعليم', 'education', '#2563eb', 'التعليم والبحث العلمي', 5),
  ('صحة', 'health', '#db2777', 'الصحة العمومية', 6),
  ('رياضة', 'sports', '#16a34a', 'الرياضة الوطنية والدولية', 7),
  ('ثقافة', 'culture', '#9333ea', 'الثقافة والتراث والكتاب', 8),
  ('تكنولوجيا', 'technology', '#0891b2', 'التكنولوجيا والتحول الرقمي', 9),
  ('حوادث', 'incidents', '#ea580c', 'تغطية الحوادث', 10),
  ('فن', 'art', '#e11d48', 'الفن والمسرح والموسيقى', 11),
  ('طقس', 'weather', '#0284c7', 'التوقعات الجوية', 12),
  ('العالم', 'world', '#334155', 'الأخبار الدولية', 13)
on conflict (slug) do nothing;

insert into public.tags (name, slug) values
  ('المغرب', 'morocco'),
  ('أخبار عاجلة', 'breaking'),
  ('الجهات', 'regions')
on conflict (slug) do nothing;

insert into public.settings (key, value) values
  ('site', '{
    "site_name": "NEWS MAROC",
    "tagline": "أخبار المغرب لحظة بلحظة",
    "breaking_enabled": true,
    "comments_enabled": true,
    "ads": { "header": false, "homepage": false, "article": false, "sidebar": false, "between": false },
    "social": {
      "facebook": "https://facebook.com/newsmaroc",
      "instagram": "https://instagram.com/newsmaroc",
      "youtube": "https://youtube.com/@newsmaroc",
      "x": "https://x.com/newsmaroc",
      "tiktok": "https://tiktok.com/@newsmaroc"
    }
  }'::jsonb)
on conflict (key) do nothing;

-- المصادر المضافة بطلب من المالك (Google News RSS — المغرب/العربية)
insert into public.sources (id, name, url, rss_url, category_slug, status) values
  ('a1a1a1a1-0000-4000-8000-000000000011', 'أخبار المغرب', 'https://news.google.com/rss/search?q=المغرب&hl=ar&gl=MA&ceid=MA:ar', 'https://news.google.com/rss/search?q=المغرب&hl=ar&gl=MA&ceid=MA:ar', 'maroc', 'active'),
  ('a1a1a1a1-0000-4000-8000-000000000012', 'هسبريس', 'https://news.google.com/rss/search?q=هسبريس&hl=ar&gl=MA&ceid=MA:ar', 'https://news.google.com/rss/search?q=هسبريس&hl=ar&gl=MA&ceid=MA:ar', 'maroc', 'active'),
  ('a1a1a1a1-0000-4000-8000-000000000013', 'اليوم 24', 'https://news.google.com/rss/search?q=اليوم+24+المغرب&hl=ar&gl=MA&ceid=MA:ar', 'https://news.google.com/rss/search?q=اليوم+24+المغرب&hl=ar&gl=MA&ceid=MA:ar', 'maroc', 'active'),
  ('a1a1a1a1-0000-4000-8000-000000000014', 'أخبارنا المغربية', 'https://news.google.com/rss/search?q=أخبارنا+المغربية&hl=ar&gl=MA&ceid=MA:ar', 'https://news.google.com/rss/search?q=أخبارنا+المغربية&hl=ar&gl=MA&ceid=MA:ar', 'maroc', 'active'),
  ('a1a1a1a1-0000-4000-8000-000000000015', 'هبة بريس', 'https://news.google.com/rss/search?q=هبة+بريس&hl=ar&gl=MA&ceid=MA:ar', 'https://news.google.com/rss/search?q=هبة+بريس&hl=ar&gl=MA&ceid=MA:ar', 'maroc', 'active'),
  ('a1a1a1a1-0000-4000-8000-000000000016', 'أنفاس بريس', 'https://news.google.com/rss/search?q=أنفاس+بريس&hl=ar&gl=MA&ceid=MA:ar', 'https://news.google.com/rss/search?q=أنفاس+بريس&hl=ar&gl=MA&ceid=MA:ar', 'society', 'active'),
  ('a1a1a1a1-0000-4000-8000-000000000017', 'الصباح المغربي', 'https://news.google.com/rss/search?q=الصباح+المغربي&hl=ar&gl=MA&ceid=MA:ar', 'https://news.google.com/rss/search?q=الصباح+المغربي&hl=ar&gl=MA&ceid=MA:ar', 'maroc', 'active'),
  ('a1a1a1a1-0000-4000-8000-000000000018', 'المساء المغربي', 'https://news.google.com/rss/search?q=المساء+المغربي&hl=ar&gl=MA&ceid=MA:ar', 'https://news.google.com/rss/search?q=المساء+المغربي&hl=ar&gl=MA&ceid=MA:ar', 'maroc', 'active'),
  ('a1a1a1a1-0000-4000-8000-000000000019', 'كواليس اليوم', 'https://news.google.com/rss/search?q=كواليس+اليوم+المغرب&hl=ar&gl=MA&ceid=MA:ar', 'https://news.google.com/rss/search?q=كواليس+اليوم+المغرب&hl=ar&gl=MA&ceid=MA:ar', 'politics', 'active'),
  ('a1a1a1a1-0000-4000-8000-000000000020', 'كود المغرب', 'https://news.google.com/rss/search?q=گود+المغرب&hl=ar&gl=MA&ceid=MA:ar', 'https://news.google.com/rss/search?q=گود+المغرب&hl=ar&gl=MA&ceid=MA:ar', 'maroc', 'active'),
  ('a1a1a1a1-0000-4000-8000-000000000021', 'LeSiteInfo المغرب', 'https://news.google.com/rss/search?q=LeSiteInfo+المغرب&hl=ar&gl=MA&ceid=MA:ar', 'https://news.google.com/rss/search?q=LeSiteInfo+المغرب&hl=ar&gl=MA&ceid=MA:ar', 'maroc', 'active'),
  ('a1a1a1a1-0000-4000-8000-000000000022', 'أخبار الرياضة المغربية', 'https://news.google.com/rss/search?q=الرياضة+المغربية&hl=ar&gl=MA&ceid=MA:ar', 'https://news.google.com/rss/search?q=الرياضة+المغربية&hl=ar&gl=MA&ceid=MA:ar', 'sports', 'active'),
  ('a1a1a1a1-0000-4000-8000-000000000023', 'الاقتصاد المغربي', 'https://news.google.com/rss/search?q=الاقتصاد+المغربي&hl=ar&gl=MA&ceid=MA:ar', 'https://news.google.com/rss/search?q=الاقتصاد+المغربي&hl=ar&gl=MA&ceid=MA:ar', 'economy', 'active'),
  ('a1a1a1a1-0000-4000-8000-000000000024', 'السياحة في المغرب', 'https://news.google.com/rss/search?q=السياحة+في+المغرب&hl=ar&gl=MA&ceid=MA:ar', 'https://news.google.com/rss/search?q=السياحة+في+المغرب&hl=ar&gl=MA&ceid=MA:ar', 'maroc', 'active'),
  ('a1a1a1a1-0000-4000-8000-000000000025', 'التعليم في المغرب', 'https://news.google.com/rss/search?q=التعليم+في+المغرب&hl=ar&gl=MA&ceid=MA:ar', 'https://news.google.com/rss/search?q=التعليم+في+المغرب&hl=ar&gl=MA&ceid=MA:ar', 'education', 'active')
on conflict (id) do nothing;
