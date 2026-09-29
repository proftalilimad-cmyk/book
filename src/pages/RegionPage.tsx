import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { getRegion } from '@/lib/demoData';
import { useQuery } from '@/hooks/useQuery';
import { listArticles } from '@/services/articleService';
import Seo from '@/components/Seo';
import ArticleCard from '@/components/news/ArticleCard';
import EmptyState from '@/components/news/EmptyState';
import Pagination from '@/components/news/Pagination';
import Sidebar from '@/components/news/Sidebar';
import NotFoundPage from '@/pages/NotFoundPage';

const PAGE_SIZE = 8;

export default function RegionPage() {
  const { slug = '' } = useParams();
  const region = getRegion(slug);
  const [page, setPage] = useState(1);

  const { data, loading } = useQuery(
    () =>
      region
        ? listArticles({ region: slug, status: 'published', page, pageSize: PAGE_SIZE })
        : Promise.resolve(null),
    [slug, page],
  );

  if (!region) return <NotFoundPage />;
  const items = data?.items ?? [];

  return (
    <>
      <Seo
        title={`أخبار جهة ${region.name}`}
        description={`آخر أخبار جهة ${region.name}: تغطية محلية مستمرة للأحداث والتنمية والخدمات.`}
        url={`/regions/${region.slug}`}
      />
      <div className="container-x mt-6">
        <header className="mb-8 flex items-center gap-5 rounded-3xl bg-ink-900 p-6 text-white dark:bg-ink-925 sm:p-8">
          <img
            src={`/demo-images/region-${region.slug}.svg`}
            alt=""
            width={140}
            height={79}
            className="hidden h-20 w-36 rounded-2xl object-cover sm:block"
          />
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-white/60">الجهات</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-black sm:text-3xl">
              <MapPin className="h-6 w-6 text-brand-500" />
              جهة {region.name}
            </h1>
            <p className="mt-2 text-sm text-white/75">{data ? `${data.total} خبراً منشوراً` : '…'}</p>
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {loading && <p className="py-16 text-center text-sm font-bold text-ink-400">جارٍ التحميل…</p>}
            {!loading && items.length === 0 && (
              <EmptyState
                title={`لا توجد أخبار منشورة لجهة ${region.name} بعد`}
                hint="ستُعرض هنا الأخبار المرتبطة بهذه الجهة فور نشرها."
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
            {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
          </div>
          <Sidebar />
        </div>
      </div>
    </>
  );
}
