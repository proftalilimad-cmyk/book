import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { CATEGORIES } from '@/lib/demoData';
import { useQuery } from '@/hooks/useQuery';
import { listArticles } from '@/services/articleService';
import Seo from '@/components/Seo';
import ArticleCard from '@/components/news/ArticleCard';
import EmptyState from '@/components/news/EmptyState';
import Pagination from '@/components/news/Pagination';
import { cx } from '@/lib/utils';

const PAGE_SIZE = 12;

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const cat = params.get('cat') ?? '';
  const page = Number(params.get('page') ?? '1') || 1;
  const [input, setInput] = useState(q);
  const [startedAt] = useState(() => performance.now());

  useEffect(() => setInput(q), [q]);

  const { data, loading } = useQuery(
    () =>
      listArticles({
        status: 'published',
        search: q || undefined,
        category: cat || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [q, cat, page],
  );

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
  };

  const elapsed = data ? ((performance.now() - startedAt) / 1000).toFixed(2) : null;

  return (
    <>
      <Seo title={q ? `نتائج البحث: ${q}` : 'البحث'} url="/search" noindex={!q} />
      <div className="container-x mt-6 max-w-5xl">
        <h1 className="mb-6 flex items-center gap-2.5 text-2xl font-black sm:text-3xl">
          <Search className="h-7 w-7 text-brand-600" />
          البحث في NEWS MAROC
        </h1>

        <form
          className="relative mb-5"
          onSubmit={(e) => {
            e.preventDefault();
            setParam('q', input.trim());
          }}
        >
          <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ابحث بالعنوان أو الكلمات المفتاحية أو المصدر…"
            className="input !rounded-2xl !py-4 ps-12 text-base font-bold"
          />
        </form>

        {/* فلتر التصنيفات */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-ink-400" />
          <button
            onClick={() => setParam('cat', '')}
            className={cx(
              'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors',
              !cat ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300',
            )}
          >
            الكل
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => setParam('cat', c.slug === cat ? '' : c.slug)}
              className={cx(
                'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors',
                cat === c.slug
                  ? 'text-white'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300',
              )}
              style={cat === c.slug ? { backgroundColor: c.color } : undefined}
            >
              {c.name}
            </button>
          ))}
        </div>

        {q && (
          <p className="mb-5 text-sm font-bold text-ink-500">
            {loading
              ? 'جارٍ البحث…'
              : data
                ? `${data.total} نتيجة لـ «${q}»${elapsed ? ` — في ${elapsed} ثانية` : ''}`
                : ''}
          </p>
        )}

        {!loading && data && data.items.length === 0 && (
          <EmptyState
            title="لا توجد نتائج مطابقة"
            hint="جرّب كلمات أبسط أو أقل، أو تصفح الأقسام من القائمة الرئيسية."
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.items ?? []).map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>

        {data && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onChange={(p) => {
              const next = new URLSearchParams(params);
              next.set('page', String(p));
              setParams(next);
            }}
          />
        )}
      </div>
    </>
  );
}
