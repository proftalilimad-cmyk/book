import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { REGIONS } from '@/lib/demoData';
import { useQuery } from '@/hooks/useQuery';
import { listArticles } from '@/services/articleService';
import ArticleCard from '@/components/news/ArticleCard';
import { cx } from '@/lib/utils';

export default function RegionsSection() {
  const [active, setActive] = useState(REGIONS[0].slug);
  const region = REGIONS.find((r) => r.slug === active)!;
  const { data, loading } = useQuery(
    () => listArticles({ region: active, status: 'published', pageSize: 4 }),
    [active],
  );
  const items = data?.items ?? [];

  return (
    <section aria-label="أخبار الجهات" className="rounded-3xl bg-ink-900 p-5 text-white dark:bg-ink-925 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title !text-white">
          <span className="h-7 w-1.5 rounded-full bg-cedar-500" />
          أخبار الجهات
        </h2>
        <Link
          to="/regions"
          className="group flex items-center gap-1.5 text-sm font-bold text-ink-300 transition-colors hover:text-white"
        >
          كل الجهات
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        </Link>
      </div>

      {/* اختيار الجهة */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {REGIONS.map((r) => (
          <button
            key={r.slug}
            onClick={() => setActive(r.slug)}
            className={cx(
              'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-all',
              active === r.slug
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                : 'bg-white/10 text-ink-300 hover:bg-white/15 hover:text-white',
            )}
          >
            <MapPin className="h-3.5 w-3.5" />
            {r.name}
          </button>
        ))}
      </div>

      {loading && <p className="py-8 text-center text-sm font-bold text-ink-400">جارٍ التحميل…</p>}
      {!loading && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 py-10 text-center">
          <p className="text-sm font-bold text-ink-400">لا توجد أخبار منشورة حالياً في جهة {region.name}.</p>
        </div>
      )}
      {!loading && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((a) => (
            <ArticleCard key={a.id} article={a} className="!bg-white/[0.06] !ring-white/10" />
          ))}
        </div>
      )}
    </section>
  );
}
