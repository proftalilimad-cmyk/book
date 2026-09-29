import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Hash } from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import { listArticles } from '@/services/articleService';
import Seo from '@/components/Seo';
import ArticleCard from '@/components/news/ArticleCard';
import EmptyState from '@/components/news/EmptyState';
import Pagination from '@/components/news/Pagination';

export default function TagPage() {
  const { slug = '' } = useParams();
  const tag = decodeURIComponent(slug);
  const [page, setPage] = useState(1);
  const { data, loading } = useQuery(
    () => listArticles({ status: 'published', tag, page, pageSize: 12 }),
    [tag, page],
  );

  return (
    <>
      <Seo title={`وسم: ${tag}`} url={`/tag/${slug}`} noindex />
      <div className="container-x mt-6">
        <header className="mb-8 flex items-center gap-3 rounded-3xl bg-ink-900 p-6 text-white dark:bg-ink-925 sm:p-8">
          <span className="rounded-2xl bg-brand-600 p-3">
            <Hash className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-white/60">وسم</p>
            <h1 className="text-2xl font-black sm:text-3xl">{tag}</h1>
          </div>
        </header>

        {loading && <p className="py-16 text-center text-sm font-bold text-ink-400">جارٍ التحميل…</p>}
        {!loading && (data?.items.length ?? 0) === 0 && (
          <EmptyState title={`لا توجد أخبار موسومة بـ «${tag}»`} />
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(data?.items ?? []).map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
        {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
      </div>
    </>
  );
}
