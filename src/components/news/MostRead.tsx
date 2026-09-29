import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import { getMostRead, type MostReadPeriod } from '@/services/articleService';
import { cx, formatNumber } from '@/lib/utils';

const TABS: Array<{ key: MostReadPeriod; label: string }> = [
  { key: 'today', label: 'اليوم' },
  { key: 'week', label: 'الأسبوع' },
  { key: 'month', label: 'الشهر' },
];

export default function MostRead() {
  const [period, setPeriod] = useState<MostReadPeriod>('today');
  const { data, loading } = useQuery(() => getMostRead(period, 5), [period]);

  return (
    <section className="card overflow-hidden" aria-label="الأكثر قراءة">
      <div className="flex items-center justify-between px-4 pt-4">
        <h3 className="flex items-center gap-2 text-base font-black">
          <Flame className="h-5 w-5 text-brand-600" />
          الأكثر قراءة
        </h3>
        <div className="flex rounded-lg bg-ink-100 p-0.5 dark:bg-ink-800">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setPeriod(t.key)}
              className={cx(
                'rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors',
                period === t.key
                  ? 'bg-white text-brand-700 shadow-sm dark:bg-ink-950 dark:text-brand-400'
                  : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <ol className="p-2">
        {loading && <li className="p-6 text-center text-sm font-bold text-ink-400">جارٍ التحميل…</li>}
        {!loading &&
          (data ?? []).map((a, i) => (
            <li key={a.id}>
              <Link
                to={`/article/${a.slug}`}
                className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-ink-50 dark:hover:bg-ink-900"
              >
                <span
                  className={cx(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-black',
                    i === 0
                      ? 'bg-brand-600 text-white'
                      : 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300',
                  )}
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="line-clamp-2 text-[13px] font-bold leading-6 text-ink-800 transition-colors group-hover:text-brand-700 dark:text-ink-100 dark:group-hover:text-brand-400">
                    {a.title}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-ink-400">
                    {formatNumber(a.period_views)} مشاهدة
                  </p>
                </div>
              </Link>
            </li>
          ))}
      </ol>
    </section>
  );
}
