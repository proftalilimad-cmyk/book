import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Newspaper } from 'lucide-react';
import { getCategory } from '@/lib/demoData';
import { useQuery } from '@/hooks/useQuery';
import { listArticles } from '@/services/articleService';
import Seo from '@/components/Seo';
import ArticleCard from '@/components/news/ArticleCard';
import Pagination from '@/components/news/Pagination';
import Sidebar from '@/components/news/Sidebar';
import EmptyState from '@/components/news/EmptyState';
import NotFoundPage from '@/pages/NotFoundPage';

const PAGE_SIZE = 10;

export default function CategoryPage() {
  const { slug = '' } = useParams();
  const category = getCategory(slug);
  const [page, setPage] = useState(1);

  const { data, loading } = useQuery(
    () =>
      category
        ? listArticles({ category: slug, status: 'published', page, pageSize: PAGE_SIZE })
        : Promise.resolve(null),
    [slug, page],
  );

  if (!category) return <NotFoundPage />;

  const items = data?.items ?? [];
  const featured = page === 1 ? items[0] : undefined;
  const rest = featured ? items.slice(1) : items;

  return (
    <>
      <Seo
        title={category.name}
        description={category.description}
        url={`/category/${category.slug}`}
      />
      <div className="container-x mt-6">
        {/* ترويسة التصنيف */}
        <header
          className="mb-8 overflow-hidden rounded-3xl p-6 text-white sm:p-8"
          style={{ background: `linear-gradient(135deg, ${category.color}, ${category.color}cc 60%, #0b0f14)` }}
        >
          <p className="text-xs font-black uppercase tracking-widest text-white/70">قسم</p>
          <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-black sm:text-4xl">
            <Newspaper className="h-8 w-8 opacity-80" />
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/85">{category.description}</p>
          )}
          <p className="mt-3 text-xs font-bold text-white/70">
            {data ? `${data.total} خبراً` : '…'}
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {loading && <p className="py-16 text-center text-sm font-bold text-ink-400">جارٍ التحميل…</p>}

            {!loading && items.length === 0 && (
              <EmptyState
                title={`لا توجد أخبار منشورة في قسم «${category.name}» بعد`}
                hint="ستظهر هنا الأخبار فور نشرها من لوحة التحكم."
              />
            )}

            {!loading && featured && <ArticleCard article={featured} variant="featured" className="mb-6" />}

            {!loading && rest.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {rest.map((a) => (
                  <ArticleCard key={a.id} article={a} variant="vertical" />
                ))}
              </div>
            )}

            {data && (
              <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => setPage(p)} />
            )}
          </div>
          <Sidebar />
        </div>
      </div>
    </>
  );
}
