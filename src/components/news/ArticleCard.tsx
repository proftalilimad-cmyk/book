import { Link } from 'react-router-dom';
import { Clock, Eye, Zap } from 'lucide-react';
import type { Article } from '@/types';
import { getCategory, getRegion } from '@/lib/demoData';
import DemoBadge from '@/components/DemoBadge';
import NewsImage from '@/components/news/NewsImage';
import { cx, formatNumber, relativeTime } from '@/lib/utils';

function CategoryChip({ slug, light = false }: { slug: string; light?: boolean }) {
  const cat = getCategory(slug);
  if (!cat) return null;
  return (
    <span
      className={cx('chip', light && 'bg-black/40 text-white backdrop-blur-sm')}
      style={
        light
          ? { backgroundColor: `${cat.color}d9` }
          : { backgroundColor: `${cat.color}14`, color: cat.color }
      }
    >
      {cat.name}
    </span>
  );
}

function Meta({ article, className }: { article: Article; className?: string }) {
  return (
    <div className={cx('flex items-center gap-3 text-[11px] font-medium text-ink-400', className)}>
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {relativeTime(article.published_at)}
      </span>
      {article.source_name && (
        <span className="max-w-[140px] truncate">{article.source_name}</span>
      )}
      <span className="flex items-center gap-1">
        <Eye className="h-3 w-3" />
        {formatNumber(article.views)}
      </span>
    </div>
  );
}

interface CardProps {
  article: Article;
  className?: string;
  priority?: boolean;
}

/** بطاقة عمودية قياسية */
export function CardVertical({ article, className, priority = false }: CardProps) {
  return (
    <Link
      to={`/article/${article.slug}`}
      className={cx(
        'group card block overflow-hidden transition-shadow hover:shadow-card-hover',
        className,
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <NewsImage
          src={article.featured_image}
          alt={article.image_alt ?? article.title}
          category={article.category}
          eager={priority}
          width={640}
          height={360}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {article.is_breaking && (
          <span className="chip absolute bottom-2 start-2 bg-brand-600 text-white">
            <Zap className="h-3 w-3" /> عاجل
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <CategoryChip slug={article.category} />
          {article.is_demo && <DemoBadge />}
        </div>
        <h3 className="line-clamp-2 text-[15px] font-extrabold leading-6 text-ink-900 transition-colors group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-400">
          {article.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-6 text-ink-500 dark:text-ink-400">
          {article.summary}
        </p>
        <Meta article={article} className="mt-3" />
      </div>
    </Link>
  );
}

/** بطاقة أفقية (الصورة جانبية) */
export function CardHorizontal({ article, className }: CardProps) {
  return (
    <Link
      to={`/article/${article.slug}`}
      className={cx('group card flex gap-4 overflow-hidden p-3 transition-shadow hover:shadow-card-hover', className)}
    >
      <div className="relative w-36 shrink-0 overflow-hidden rounded-xl sm:w-44">
        <NewsImage
          src={article.featured_image}
          alt={article.image_alt ?? article.title}
          category={article.category}
          width={352}
          height={198}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="min-w-0 flex-1 py-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          <CategoryChip slug={article.category} />
          {article.is_demo && <DemoBadge />}
        </div>
        <h3 className="line-clamp-2 text-sm font-extrabold leading-6 text-ink-900 transition-colors group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-400 sm:text-[15px]">
          {article.title}
        </h3>
        <Meta article={article} className="mt-2" />
      </div>
    </Link>
  );
}

/** بطاقة بارزة كبيرة بتراكب لوني */
export function CardFeatured({ article, className, priority = false }: CardProps) {
  return (
    <Link
      to={`/article/${article.slug}`}
      className={cx(
        'group relative block overflow-hidden rounded-2xl shadow-card transition-shadow hover:shadow-card-hover',
        className,
      )}
    >
      <NewsImage
        src={article.featured_image}
        alt={article.image_alt ?? article.title}
        category={article.category}
        eager={priority}
        width={1200}
        height={675}
        className="aspect-[16/9] w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/95 via-ink-950/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <CategoryChip slug={article.category} light />
          {article.region && (
            <span className="chip bg-white/15 text-white backdrop-blur-sm">
              {getRegion(article.region)?.name}
            </span>
          )}
          {article.is_breaking && (
            <span className="chip bg-brand-600 text-white animate-ticker-flash">
              <Zap className="h-3 w-3" /> عاجل
            </span>
          )}
          {article.is_demo && <DemoBadge light />}
        </div>
        <h2 className="text-balance text-xl font-black leading-9 text-white sm:text-3xl sm:leading-[1.7]">
          {article.title}
        </h2>
        <p className="mt-2 hidden max-w-3xl text-sm leading-7 text-ink-200 sm:line-clamp-2">
          {article.summary}
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs font-medium text-ink-300">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {relativeTime(article.published_at)}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {formatNumber(article.views)} مشاهدة
          </span>
        </div>
      </div>
    </Link>
  );
}

/** بطاقة ثانوية صغيرة فوق صورة */
export function CardOverlaySmall({ article, className }: CardProps) {
  return (
    <Link
      to={`/article/${article.slug}`}
      className={cx('group relative block overflow-hidden rounded-2xl', className)}
    >
      <NewsImage
        src={article.featured_image}
        alt={article.image_alt ?? article.title}
        category={article.category}
        width={600}
        height={338}
        className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="mb-2 flex items-center gap-1.5">
          <CategoryChip slug={article.category} light />
          {article.is_demo && <DemoBadge light />}
        </div>
        <h3 className="line-clamp-2 text-sm font-extrabold leading-6 text-white">{article.title}</h3>
      </div>
    </Link>
  );
}

/** عنصر قائمة مضغوط بدون صورة */
export function CardCompact({ article, className, showImage = true }: CardProps & { showImage?: boolean }) {
  const cat = getCategory(article.category);
  return (
    <Link
      to={`/article/${article.slug}`}
      className={cx(
        'group flex items-start gap-3 border-b border-ink-900/5 py-4 last:border-0 dark:border-white/5',
        className,
      )}
    >
      <span
        className="mt-2 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: cat?.color ?? '#c1272d' }}
      />
      <div className="min-w-0">
        <h4 className="line-clamp-2 text-[15px] font-bold leading-7 text-ink-800 transition-colors group-hover:text-brand-700 dark:text-ink-100 dark:group-hover:text-brand-400">
          {article.title}
        </h4>
        <Meta article={article} className="mt-1" />
      </div>
    </Link>
  );
}

export default function ArticleCard(props: CardProps & { variant?: 'vertical' | 'horizontal' | 'featured' | 'compact' }) {
  const { variant = 'vertical', ...rest } = props;
  if (variant === 'horizontal') return <CardHorizontal {...rest} />;
  if (variant === 'featured') return <CardFeatured {...rest} />;
  if (variant === 'compact') return <CardCompact {...rest} />;
  return <CardVertical {...rest} />;
}
