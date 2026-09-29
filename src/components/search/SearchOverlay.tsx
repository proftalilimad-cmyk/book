import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Search, TrendingUp, X } from 'lucide-react';
import { listArticles } from '@/services/articleService';
import type { Article } from '@/types';
import { getCategory } from '@/lib/demoData';
import { cx, relativeTime } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SUGGESTIONS = ['المغرب', 'اقتصاد', 'المنتخب الوطني', 'الطقس', 'الذكاء الاصطناعي', 'الجهات'];

export default function SearchOverlay({ open, onClose }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQ('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      listArticles({ status: 'published', search: q, pageSize: 6 })
        .then((res) => setResults(res.items))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    onClose();
    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-white/95 backdrop-blur-md dark:bg-ink-950/95 animate-fade-up" role="dialog" aria-label="البحث">
      <div className="container-x py-6 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <form onSubmit={submit} className="relative flex-1">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث عن خبر، تصنيف، مصدر، كلمات مفتاحية…"
              className="w-full rounded-2xl border-2 border-ink-900/10 bg-white py-4 ps-12 pe-4 text-lg font-bold text-ink-900 placeholder:font-medium placeholder:text-ink-400 focus:border-brand-500 focus:outline-none dark:border-white/10 dark:bg-ink-900 dark:text-white"
            />
          </form>
          <button
            onClick={onClose}
            className="rounded-xl p-2.5 text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"
            aria-label="إغلاق البحث"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-6">
          {!q.trim() && (
            <div>
              <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-ink-500 dark:text-ink-400">
                <TrendingUp className="h-4 w-4 text-brand-600" />
                عمليات بحث رائجة
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQ(s)}
                    className="rounded-full bg-ink-100 px-4 py-1.5 text-sm font-bold text-ink-700 transition-colors hover:bg-brand-100 hover:text-brand-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-brand-950 dark:hover:text-brand-300"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {q.trim() && (
            <div className="space-y-2">
              {loading && <p className="py-6 text-center text-sm font-bold text-ink-400">جارٍ البحث…</p>}
              {!loading && results.length === 0 && (
                <p className="py-6 text-center text-sm font-bold text-ink-400">
                  لا توجد نتائج مطابقة لـ «{q}». جرّب كلمات أخرى.
                </p>
              )}
              {results.map((a) => {
                const cat = getCategory(a.category);
                return (
                  <Link
                    key={a.id}
                    to={`/article/${a.slug}`}
                    onClick={onClose}
                    className={cx(
                      'flex items-center gap-4 rounded-2xl p-3 transition-colors',
                      'hover:bg-brand-50 dark:hover:bg-brand-950/30',
                    )}
                  >
                    <img
                      src={a.featured_image}
                      alt=""
                      loading="lazy"
                      width={72}
                      height={48}
                      className="h-12 w-[72px] shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <span className="chip mb-1" style={{ backgroundColor: `${cat?.color}18`, color: cat?.color }}>
                        {cat?.name}
                      </span>
                      <p className="truncate text-sm font-bold text-ink-900 dark:text-white">{a.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-400">
                        <Clock className="h-3 w-3" />
                        {relativeTime(a.published_at)}
                      </p>
                    </div>
                  </Link>
                );
              })}
              {results.length > 0 && (
                <button
                  onClick={() => {
                    onClose();
                    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
                  }}
                  className="mt-2 w-full rounded-xl bg-ink-900 py-3 text-sm font-bold text-white transition-colors hover:bg-ink-800 dark:bg-white dark:text-ink-900"
                >
                  عرض جميع النتائج
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
