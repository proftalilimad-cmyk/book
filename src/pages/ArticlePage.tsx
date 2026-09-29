import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CalendarDays,
  ChevronLeft,
  Clock,
  ExternalLink,
  Eye,
  Home,
  Tag as TagIcon,
  Timer,
  UserRound,
  Zap,
} from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import NewsImage from '@/components/news/NewsImage';
import {
  getArticleBySlug,
  getRelatedArticles,
  incrementView,
} from '@/services/articleService';
import Seo from '@/components/Seo';
import AdSlot from '@/components/AdSlot';
import DemoBadge from '@/components/DemoBadge';
import Sidebar from '@/components/news/Sidebar';
import ArticleCard from '@/components/news/ArticleCard';
import ShareButtons from '@/components/news/ShareButtons';
import CommentsSection from '@/components/news/CommentsSection';
import { getCategory, getRegion } from '@/lib/demoData';
import { excerpt, formatFullDate, formatNumber, formatTime, readingMinutes, relativeTime, SITE_URL } from '@/lib/utils';
import NotFoundPage from '@/pages/NotFoundPage';

export default function ArticlePage() {
  const { slug = '' } = useParams();
  const { data: article, loading } = useQuery(() => getArticleBySlug(slug), [slug]);
  const { data: related } = useQuery(
    () => (article ? getRelatedArticles(article, 4) : Promise.resolve([])),
    [article?.id],
  );
  const counted = useRef<string | null>(null);

  useEffect(() => {
    if (!article || counted.current === article.id) return;
    const key = `viewed:${article.id}`;
    if (sessionStorage.getItem(key)) return;
    counted.current = article.id;
    sessionStorage.setItem(key, '1');
    incrementView(article.id);
  }, [article]);

  if (!loading && !article) return <NotFoundPage />;

  if (loading || !article) {
    return (
      <div className="container-x mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="h-8 w-3/4 animate-pulse rounded-xl bg-ink-100 dark:bg-ink-900" />
          <div className="h-5 w-1/2 animate-pulse rounded-xl bg-ink-100 dark:bg-ink-900" />
          <div className="aspect-[16/9] animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-900" />
        </div>
      </div>
    );
  }

  const cat = getCategory(article.category);
  const region = getRegion(article.region);
  const description = article.meta_description || excerpt(article.summary, 155);
  const absImage = article.featured_image.startsWith('http')
    ? article.featured_image
    : `${SITE_URL}${article.featured_image}`;

  return (
    <>
      <Seo
        title={article.meta_title || article.title}
        description={description}
        keywords={article.keywords ?? article.tags}
        image={absImage}
        url={`/article/${article.slug}`}
        type="article"
        publishedAt={article.published_at}
        modifiedAt={article.updated_at}
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: article.title,
            description,
            image: [absImage],
            datePublished: article.published_at,
            dateModified: article.updated_at,
            inLanguage: 'ar',
            author: article.author_name
              ? { '@type': 'Person', name: article.author_name }
              : { '@type': 'Organization', name: 'NEWS MAROC' },
            publisher: {
              '@type': 'NewsMediaOrganization',
              name: 'NEWS MAROC',
              logo: {
                '@type': 'ImageObject',
                url: `${SITE_URL}/favicon.svg`,
              },
            },
            mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/article/${article.slug}` },
            ...(article.source_url ? { isBasedOn: article.source_url } : {}),
            keywords: (article.keywords ?? article.tags).join(', '),
            articleSection: cat?.name,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: SITE_URL },
              {
                '@type': 'ListItem',
                position: 2,
                name: cat?.name ?? 'أخبار',
                item: `${SITE_URL}/category/${article.category}`,
              },
              { '@type': 'ListItem', position: 3, name: article.title },
            ],
          },
        ]}
      />

      <div className="container-x mt-6">
        {/* مسار التنقل */}
        <nav aria-label="مسار التنقل" className="mb-5 flex items-center gap-1.5 overflow-x-auto text-xs font-bold text-ink-400 no-scrollbar">
          <Link to="/" className="flex items-center gap-1 hover:text-brand-600">
            <Home className="h-3.5 w-3.5" />
            الرئيسية
          </Link>
          <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
          <Link to={`/category/${article.category}`} className="hover:text-brand-600">
            {cat?.name}
          </Link>
          <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate text-ink-600 dark:text-ink-300">{article.title}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-3">
          {/* المحتوى الرئيسي */}
          <article className="lg:col-span-2">
            <header>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {cat && (
                  <Link
                    to={`/category/${cat.slug}`}
                    className="chip"
                    style={{ backgroundColor: `${cat.color}14`, color: cat.color }}
                  >
                    {cat.name}
                  </Link>
                )}
                {region && (
                  <Link to={`/regions/${region.slug}`} className="chip bg-ink-900/5 text-ink-700 dark:bg-white/10 dark:text-ink-200">
                    {region.name}
                  </Link>
                )}
                {article.is_breaking && (
                  <span className="chip bg-brand-600 text-white animate-ticker-flash">
                    <Zap className="h-3 w-3" /> عاجل
                  </span>
                )}
                {article.is_demo && <DemoBadge />}
              </div>

              <h1 className="text-balance text-2xl font-black leading-[1.6] text-ink-900 dark:text-white sm:text-[32px] sm:leading-[1.65]">
                {article.title}
              </h1>
              {article.subtitle && (
                <p className="mt-3 text-balance text-lg font-medium leading-8 text-ink-500 dark:text-ink-300">
                  {article.subtitle}
                </p>
              )}

              {/* معلومات النشر */}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-ink-900/5 py-3.5 text-xs font-bold text-ink-500 dark:border-white/5 dark:text-ink-400">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-brand-600" />
                  {formatFullDate(article.published_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-brand-600" />
                  {formatTime(article.published_at)} ({relativeTime(article.published_at)})
                </span>
                {article.author_name && (
                  <span className="flex items-center gap-1.5">
                    <UserRound className="h-4 w-4 text-brand-600" />
                    {article.author_name}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Timer className="h-4 w-4 text-brand-600" />
                  {readingMinutes(article.content)} د قراءة
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-brand-600" />
                  {formatNumber(article.views)}
                </span>
              </div>
            </header>

            {/* مشاركة (سطح المكتب — عائم) */}
            <div className="relative mt-6">
              <div className="absolute -start-[52px] top-0 hidden xl:block">
                <div className="sticky top-28">
                  <ShareButtons url={`/article/${article.slug}`} title={article.title} vertical />
                </div>
              </div>

              {/* الصورة الرئيسية */}
              <figure>
                <NewsImage
                  src={article.featured_image}
                  alt={article.image_alt ?? article.title}
                  category={article.category}
                  width={1200}
                  height={675}
                  eager
                  className="aspect-[16/9] w-full rounded-2xl object-cover shadow-card"
                />
                <figcaption className="mt-2 flex items-center justify-between text-[11px] text-ink-400">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{article.image_attribution ?? `الصورة: ${article.is_demo ? 'صورة تعبيرية — بيانات تجريبية' : article.source_name || 'NEWS MAROC'}`}</span>
                    {article.image_source_url && (
                      <a
                        href={article.image_source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-brand-600 hover:underline dark:text-brand-400"
                      >
                        الأصل <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </span>
                  {article.is_demo && <DemoBadge />}
                </figcaption>
              </figure>

              <AdSlot slot="article" label="إعلان داخل المقال — Article Banner" className="mt-6" compact />

              {/* متن الخبر */}
              <div
                className="article-content mt-8"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              {/* المعرض */}
              {article.gallery && article.gallery.length > 0 && (
                <section className="mt-8" aria-label="معرض الصور">
                  <h2 className="mb-4 text-lg font-black">معرض الصور</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {article.gallery.map((img, i) => (
                      <NewsImage
                        key={i}
                        src={img}
                        alt={`${article.title} — صورة ${i + 1}`}
                        category={article.category}
                        width={600}
                        height={338}
                        className="aspect-[16/9] w-full rounded-xl object-cover"
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* المصدر */}
              {(article.source_name || article.source_url) && (
                <div className="mt-8 rounded-2xl bg-ink-50 p-4 text-sm dark:bg-ink-900">
                  <p className="font-extrabold text-ink-800 dark:text-ink-100">المصدر</p>
                  <p className="mt-1 leading-7 text-ink-600 dark:text-ink-300">
                    هذه المادة صيغت تحريرياً انطلاقاً من معطيات:{' '}
                    <span className="font-bold">{article.source_name ?? 'مصدر صحفي'}</span>
                    {article.source_published_at && (
                      <> — تاريخ المصدر: {formatFullDate(article.source_published_at)}</>
                    )}
                  </p>
                  {article.source_url && (
                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="mt-2 inline-flex items-center gap-1.5 font-bold text-brand-600 hover:text-brand-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                      الرابط الأصلي
                    </a>
                  )}
                </div>
              )}

              {/* الكلمات المفتاحية */}
              {article.tags.length > 0 && (
                <div className="mt-8 flex flex-wrap items-center gap-2">
                  <TagIcon className="h-4 w-4 text-ink-400" />
                  {article.tags.map((t) => (
                    <Link
                      key={t}
                      to={`/tag/${encodeURIComponent(t)}`}
                      className="chip bg-ink-100 text-ink-600 transition-colors hover:bg-brand-100 hover:text-brand-700 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-brand-950 dark:hover:text-brand-300"
                    >
                      #{t}
                    </Link>
                  ))}
                </div>
              )}

              {/* مشاركة (الجوال) */}
              <div className="mt-8 border-t border-ink-900/5 pt-5 dark:border-white/5 xl:hidden">
                <ShareButtons url={`/article/${article.slug}`} title={article.title} />
              </div>

              <CommentsSection articleId={article.id} />
            </div>
          </article>

          {/* الشريط الجانبي */}
          <div className="space-y-6">
            <AdSlot slot="article" label="300 × 250 — Article Sidebar" className="lg:hidden" />
            <Sidebar />
          </div>
        </div>

        {/* أخبار ذات صلة */}
        {related && related.length > 0 && (
          <section className="mt-14" aria-label="أخبار ذات صلة">
            <h2 className="section-title mb-6">
              <span className="h-7 w-1.5 rounded-full bg-brand-600" />
              أخبار ذات صلة
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
