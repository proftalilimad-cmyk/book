import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, CheckCircle2, ChevronDown, Pencil, XCircle } from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import { listArticles } from '@/services/articleService';
import { approveArticle, rejectArticle } from '@/services/agentService';
import StatusBadge from '@/components/admin/StatusBadge';
import EmptyState from '@/components/news/EmptyState';
import Seo from '@/components/Seo';
import { getCategory } from '@/lib/demoData';
import { cx, formatTime, relativeTime, stripHtml } from '@/lib/utils';

export default function ReviewQueuePage() {
  const { data, loading, reload } = useQuery(
    () => listArticles({ status: ['pending_review', 'review_required'], pageSize: 30 }),
    [],
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, fn: (id: string) => Promise<void>) => {
    setBusy(id);
    try {
      await fn(id);
      reload();
    } finally {
      setBusy(null);
    }
  };

  const approveAll = async () => {
    if (!data?.items.length) return;
    setBusy('all');
    try {
      for (const a of data.items) {
        // eslint-disable-next-line no-await-in-loop
        await approveArticle(a.id);
      }
      reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Seo title="قائمة المراجعة" noindex />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">قائمة المراجعة</h1>
          <p className="mt-1 text-sm text-ink-400">
            مواد عالجها NEWS AI AGENT — لا تُنشر إلا بعد اعتماد المحرر.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-amber-100 text-sm !px-4 !py-1.5 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            {data?.total ?? 0} مادة بانتظار المراجعة
          </span>
          {(data?.items.length ?? 0) > 0 && (
            <button
              onClick={approveAll}
              disabled={busy === 'all'}
              className="btn bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {busy === 'all' ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              اعتماد ونشر الكل
            </button>
          )}
        </div>
      </div>

      {loading && <p className="py-16 text-center text-sm font-bold text-ink-400">جارٍ التحميل…</p>}

      {!loading && (data?.items.length ?? 0) === 0 && (
        <EmptyState
          title="قائمة المراجعة فارغة"
          hint="شغّل دورة مراقبة من صفحة «وكيل الأخبار AI» وسيملأ القائمة بالمواد المعالجة."
        />
      )}

      <div className="space-y-4">
        {(data?.items ?? []).map((a) => {
          const cat = getCategory(a.category);
          const isOpen = expanded === a.id;
          return (
            <article key={a.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                <img
                  src={a.featured_image}
                  alt=""
                  width={120}
                  height={75}
                  className="h-[75px] w-[120px] rounded-xl object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="chip" style={{ backgroundColor: `${cat?.color}14`, color: cat?.color }}>
                      {cat?.name}
                    </span>
                    <StatusBadge status={a.status} />
                    <span className="chip bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                      <Bot className="h-3 w-3" />
                      أعدّها الوكيل
                    </span>
                  </div>
                  <h2 className="line-clamp-2 text-base font-black leading-7">{a.title}</h2>
                  <p className="mt-1 text-xs text-ink-400">
                    المصدر: {a.source_name} · {relativeTime(a.created_at)} {formatTime(a.created_at)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    onClick={() => act(a.id, approveArticle)}
                    disabled={busy === a.id}
                    className="btn bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    اعتماد ونشر
                  </button>
                  <button
                    onClick={() => act(a.id, rejectArticle)}
                    disabled={busy === a.id}
                    className="btn-danger"
                  >
                    <XCircle className="h-4 w-4" />
                    رفض
                  </button>
                  <Link to={`/admin/articles/${a.id}/edit`} className="btn-ghost">
                    <Pencil className="h-4 w-4" />
                    تحرير
                  </Link>
                  <button
                    onClick={() => setExpanded(isOpen ? null : a.id)}
                    className="btn-ghost !px-2.5"
                    aria-label={isOpen ? 'طي' : 'عرض المعاينة'}
                  >
                    <ChevronDown className={cx('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-ink-900/5 bg-ink-50/60 p-4 dark:border-white/5 dark:bg-ink-900/40 sm:p-6">
                  <div className="grid gap-5 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <h3 className="mb-2 text-sm font-black">معاينة المادة</h3>
                      <div className="article-content rounded-xl bg-white p-4 text-sm dark:bg-ink-925">
                        <div dangerouslySetInnerHTML={{ __html: a.content }} />
                      </div>
                      <p className="mt-2 text-xs text-ink-400">{stripHtml(a.content).length} حرفاً</p>
                    </div>
                    <div>
                      <h3 className="mb-2 text-sm font-black">سجل المعالجة (Pipeline)</h3>
                      <ol className="relative space-y-3 border-s-2 border-ink-200 ps-4 dark:border-ink-700">
                        {(a.agent_log ?? []).map((l, i) => (
                          <li key={i} className="relative">
                            <span className="absolute -start-[22px] top-1 h-2.5 w-2.5 rounded-full bg-brand-600" />
                            <p className="text-xs font-black text-brand-700 dark:text-brand-400">{l.step}</p>
                            {l.note && <p className="text-[11px] leading-5 text-ink-500 dark:text-ink-400">{l.note}</p>}
                            <p className="text-[10px] text-ink-400">{formatTime(l.at)}</p>
                          </li>
                        ))}
                      </ol>
                      {a.source_url && (
                        <a
                          href={a.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-block text-xs font-bold text-brand-600 hover:underline"
                        >
                          الرابط الأصلي للمصدر ←
                        </a>
                      )}
                      {a.keywords && a.keywords.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {a.keywords.map((k) => (
                            <span key={k} className="chip bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
