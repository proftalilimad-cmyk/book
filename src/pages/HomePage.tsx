import Seo from '@/components/Seo';
import AdSlot from '@/components/AdSlot';
import Sidebar from '@/components/news/Sidebar';
import HeroSection from '@/components/news/HeroSection';
import ArticleCard from '@/components/news/ArticleCard';
import SectionBlock from '@/components/news/SectionBlock';
import RegionsSection from '@/components/news/RegionsSection';
import EmptyState from '@/components/news/EmptyState';
import { useQuery } from '@/hooks/useQuery';
import { listArticles } from '@/services/articleService';
import { CATEGORIES } from '@/lib/demoData';
import { SITE_URL } from '@/lib/utils';
import { Rss } from 'lucide-react';

const SECTION_SLUGS = ['maroc', 'politics', 'economy', 'sports', 'technology', 'world'];

export default function HomePage() {
  const { data: latest, loading } = useQuery(() => listArticles({ status: 'published', pageSize: 24 }), []);

  const items = latest?.items ?? [];
  const hero = items.slice(0, 3);
  const latestGrid = items.slice(3, 11);

  return (
    <>
      <Seo
        url="/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'NEWS MAROC',
            url: SITE_URL,
            inLanguage: 'ar',
            potentialAction: {
              '@type': 'SearchAction',
              target: `${SITE_URL}/search?q={search_term_string}`,
              'query-input': 'required name=search_term_string',
            },
          },
        ]}
      />

      <div className="container-x mt-5 space-y-12">
        {loading && (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-72 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-900 lg:col-span-2" />
            <div className="hidden h-72 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-900 lg:block" />
          </div>
        )}

        {!loading && items.length === 0 && (
          <EmptyState
            title="لا توجد أخبار منشورة بعد"
            hint="ابدأ بإضافة أخبار من لوحة التحكم أو شغّل وكيل الأخبار NEWS AI AGENT لرصد المواد من المصادر."
          />
        )}

        {!loading && items.length > 0 && (
          <>
            <HeroSection articles={hero} />
            <AdSlot slot="header" label="728 × 90 — Header Banner" compact />

            {/* آخر الأخبار + الشريط الجانبي */}
            <div className="grid gap-8 lg:grid-cols-3">
              <section aria-label="آخر الأخبار" className="lg:col-span-2">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="section-title">
                    <span className="h-7 w-1.5 rounded-full bg-brand-600" />
                    آخر الأخبار
                  </h2>
                  <span className="flex items-center gap-1 text-xs font-bold text-ink-400">
                    <Rss className="h-3.5 w-3.5 text-brand-600" />
                    تغطية مستمرة
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {latestGrid.map((a) => (
                    <ArticleCard key={a.id} article={a} />
                  ))}
                </div>
              </section>
              <Sidebar />
            </div>

            <AdSlot slot="homepage" label="970 × 250 — Homepage Banner" />
          </>
        )}

        <RegionsSection />

        {/* الأقسام */}
        {SECTION_SLUGS.map((slug, i) => {
          const cat = CATEGORIES.find((c) => c.slug === slug);
          if (!cat) return null;
          return (
            <div key={slug} className="space-y-8">
              <SectionBlock category={cat} />
              {i === 2 && <AdSlot slot="between" label="إعلان بين الأقسام — Between Articles" compact />}
            </div>
          );
        })}
      </div>
    </>
  );
}
