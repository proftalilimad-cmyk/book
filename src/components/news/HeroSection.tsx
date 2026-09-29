import ArticleCard from '@/components/news/ArticleCard';
import type { Article } from '@/types';

interface Props {
  articles: Article[]; // الأول مميز + حتى 4 ثانوية
}

export default function HeroSection({ articles }: Props) {
  if (articles.length === 0) return null;
  const [featured, ...rest] = articles;
  const side = rest.slice(0, 4);

  return (
    <section aria-label="أخبار رئيسية" className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ArticleCard article={featured} variant="featured" priority className="h-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:grid-rows-2">
        {side.slice(0, 2).map((a) => (
          <ArticleCard key={a.id} article={a} variant="horizontal" className="flex-row" />
        ))}
      </div>
    </section>
  );
}
