import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import { listArticles } from '@/services/articleService';
import ArticleCard from '@/components/news/ArticleCard';
import type { Category } from '@/types';

interface Props {
  category: Category;
  count?: number;
}

/** قسم تصنيفي رئيسي: خبر مميز + أخبار ثانوية + زر «المزيد» */
export default function SectionBlock({ category, count = 5 }: Props) {
  const { data } = useQuery(
    () => listArticles({ category: category.slug, status: 'published', pageSize: count }),
    [category.slug, count],
  );
  const items = data?.items ?? [];
  if (items.length === 0) return null;

  const [featured, ...rest] = items;

  return (
    <section aria-label={`أخبار ${category.name}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="section-title">
          <span className="h-7 w-1.5 rounded-full" style={{ backgroundColor: category.color }} />
          {category.name}
        </h2>
        <Link
          to={`/category/${category.slug}`}
          className="group flex items-center gap-1.5 text-sm font-bold text-ink-500 transition-colors hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-400"
        >
          المزيد
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ArticleCard article={featured} className="lg:row-span-2" />
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {rest.slice(0, 4).map((a) => (
            <ArticleCard key={a.id} article={a} variant="horizontal" />
          ))}
        </div>
      </div>
    </section>
  );
}
