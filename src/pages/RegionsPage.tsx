import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { REGIONS } from '@/lib/demoData';
import { useQuery } from '@/hooks/useQuery';
import { listArticles } from '@/services/articleService';
import Seo from '@/components/Seo';

export default function RegionsPage() {
  const { data } = useQuery(() => listArticles({ status: 'published', pageSize: 200 }), []);
  const items = data?.items ?? [];

  const counts = new Map<string, number>();
  for (const a of items) {
    if (a.region) counts.set(a.region, (counts.get(a.region) ?? 0) + 1);
  }

  return (
    <>
      <Seo
        title="أخبار الجهات"
        description="أخبار جهات المغرب الاثنتي عشرة: تغطية محلية مستمرة لكل جهة من طنجة إلى الداخلة."
        url="/regions"
      />
      <div className="container-x mt-6">
        <header className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-bl from-cedar-600 to-ink-950 p-6 text-white sm:p-8">
          <p className="text-xs font-black uppercase tracking-widest text-white/70">تغطية محلية</p>
          <h1 className="mt-1 flex items-center gap-2.5 text-3xl font-black sm:text-4xl">
            <MapPin className="h-8 w-8 opacity-80" />
            أخبار الجهات
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/85">
            اختر جهتك لمتابعة آخر الأخبار المحلية — 12 جهة تغطي كامل التراب الوطني.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {REGIONS.map((r, i) => {
            const count = counts.get(r.slug) ?? 0;
            return (
              <Link
                key={r.slug}
                to={`/regions/${r.slug}`}
                className="group card relative block overflow-hidden transition-shadow hover:shadow-card-hover"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img
                    src={`/demo-images/region-${r.slug}.svg`}
                    alt={r.name}
                    loading="lazy"
                    decoding="async"
                    width={480}
                    height={270}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-transparent" />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                      جهة {String(i + 1).padStart(2, '0')}
                    </p>
                    <h2 className="mt-0.5 text-base font-black leading-7 text-white">{r.name}</h2>
                  </div>
                  <span className="chip shrink-0 bg-white/15 text-white backdrop-blur-sm">
                    {count} خبر
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
