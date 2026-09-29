import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import { getBreakingArticles } from '@/services/articleService';
import { getSettings } from '@/services/settingsService';

export default function BreakingTicker() {
  const { data: settings } = useQuery(getSettings, []);
  const { data: breaking } = useQuery(() => getBreakingArticles(10), []);

  if (!settings?.breaking_enabled || !breaking || breaking.length === 0) return null;

  const items = breaking.map((a) => ({ id: a.id, title: a.title, slug: a.slug }));

  const Row = () => (
    <div className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <Link
          key={`${item.id}-${i}`}
          to={`/article/${item.slug}`}
          className="group mx-6 flex items-center gap-2.5 whitespace-nowrap py-2"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600 animate-dot-pulse dark:bg-brand-400" />
          <span className="text-sm font-bold text-ink-800 transition-colors group-hover:text-brand-600 dark:text-ink-200 dark:group-hover:text-brand-400">
            {item.title}
          </span>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="border-b border-brand-600/10 bg-brand-50/70 dark:border-brand-500/10 dark:bg-brand-950/20">
      <div className="container-x flex items-center gap-3">
        <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1 text-xs font-black text-white animate-ticker-flash">
          <Zap className="h-3.5 w-3.5" />
          عاجل
        </span>
        <div className="ticker-mask relative flex-1 overflow-hidden">
          <div className="flex w-max animate-marquee-rtl hover:[animation-play-state:paused]">
            <Row />
            <Row />
          </div>
        </div>
      </div>
    </div>
  );
}
