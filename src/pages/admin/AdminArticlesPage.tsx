import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye,
  FilePlus2,
  Globe,
  Pencil,
  Search,
  Send,
  Trash2,
  Undo2,
  Zap,
} from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import {
  deleteArticle,
  listArticles,
  setArticleStatus,
  setBreaking,
} from '@/services/articleService';
import type { ArticleStatus, ImageRights, ImageStatus } from '@/types';

const IMAGE_STATUS_LABEL: Record<ImageStatus, string> = {
  found: 'وُجدت',
  not_found: 'غير موجودة',
  invalid: 'غير صالحة',
  unknown_rights: 'حقوق غير معروفة',
  requires_review: 'تتطلب مراجعة',
};
const IMAGE_STATUS_COLOR: Record<ImageStatus, string> = {
  found: 'text-emerald-600',
  not_found: 'text-ink-400',
  invalid: 'text-red-500',
  unknown_rights: 'text-amber-600',
  requires_review: 'text-blue-600',
};
const IMAGE_STATUS_DOT: Record<ImageStatus, string> = {
  found: 'bg-emerald-500',
  not_found: 'bg-ink-300',
  invalid: 'bg-red-500',
  unknown_rights: 'bg-amber-500',
  requires_review: 'bg-blue-500',
};
const IMAGE_RIGHTS_LABEL: Record<ImageRights, string> = {
  licensed: 'مرخّصة',
  publisher: 'حقوق الناشر',
  unknown: 'حقوق غير معروفة',
};
import StatusBadge from '@/components/admin/StatusBadge';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import Seo from '@/components/Seo';
import Pagination from '@/components/news/Pagination';
import EmptyState from '@/components/news/EmptyState';
import { CATEGORIES, getCategory } from '@/lib/demoData';
import { cx, formatNumber, relativeTime } from '@/lib/utils';

const STATUS_TABS: Array<{ key: string; label: string; status?: ArticleStatus[] }> = [
  { key: 'all', label: 'الكل' },
  { key: 'published', label: 'منشور', status: ['published'] },
  { key: 'pending', label: 'بانتظار المراجعة', status: ['pending_review', 'new', 'processing', 'ai_edited'] },
  { key: 'draft', label: 'مسودات', status: ['draft'] },
  { key: 'archived', label: 'الأرشيف', status: ['archived'] },
];

export default function AdminArticlesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const statusFilter = STATUS_TABS.find((t) => t.key === tab)?.status;
  const { data, loading, reload } = useQuery(
    () =>
      listArticles({
        status: statusFilter,
        search: q || undefined,
        category: cat || undefined,
        page,
        pageSize: 12,
      }),
    [tab, q, cat, page],
  );

  const doDelete = async () => {
    if (!toDelete) return;
    await deleteArticle(toDelete);
    setToDelete(null);
    reload();
  };

  return (
    <div className="space-y-6">
      <Seo title="إدارة الأخبار" noindex />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black sm:text-3xl">إدارة الأخبار</h1>
        <Link to="/admin/articles/new" className="btn-primary">
          <FilePlus2 className="h-4 w-4" />
          إضافة خبر
        </Link>
      </div>

      {/* فلاتر */}
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <div className="flex rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setPage(1);
              }}
              className={cx(
                'rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                tab === t.key
                  ? 'bg-white text-brand-700 shadow-sm dark:bg-ink-950 dark:text-brand-400'
                  : 'text-ink-500 hover:text-ink-800 dark:text-ink-400',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="بحث بالعنوان أو المصدر…"
            className="input !py-2 ps-9 text-xs"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => {
            setCat(e.target.value);
            setPage(1);
          }}
          className="input w-auto !py-2 text-xs font-bold"
          aria-label="فلتر التصنيف"
        >
          <option value="">كل التصنيفات</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* الجدول */}
      {loading && <p className="py-16 text-center text-sm font-bold text-ink-400">جارٍ التحميل…</p>}

      {!loading && (data?.items.length ?? 0) === 0 && (
        <EmptyState title="لا توجد أخبار مطابقة للفلاتر" hint="أضف خبراً جديداً أو عدّل الفلاتر." />
      )}

      {!loading && (data?.items.length ?? 0) > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-start text-sm">
            <thead>
              <tr className="border-b border-ink-900/5 text-start text-xs text-ink-400 dark:border-white/5">
                <th className="p-3 text-start font-black">الخبر</th>
                <th className="p-3 text-start font-black">التصنيف</th>
                <th className="p-3 text-start font-black">الحالة</th>
                <th className="p-3 text-start font-black">عاجل</th>
                <th className="p-3 text-start font-black">المشاهدات</th>
                <th className="p-3 text-start font-black">التاريخ</th>
                <th className="p-3 text-start font-black">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((a) => {
                const c = getCategory(a.category);
                return (
                  <tr
                    key={a.id}
                    className="border-b border-ink-900/5 last:border-0 hover:bg-ink-50/60 dark:border-white/5 dark:hover:bg-ink-900/60"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <img src={a.featured_image} alt="" width={72} height={48} className="h-12 w-[72px] rounded-lg object-cover" loading="lazy" referrerPolicy="no-referrer" />
                          {a.image_status && (
                            <span
                              title={`حالة الصورة: ${IMAGE_STATUS_LABEL[a.image_status] ?? a.image_status}`}
                              className={cx('absolute -top-1.5 -start-1.5 h-3 w-3 rounded-full ring-2 ring-white dark:ring-ink-900', IMAGE_STATUS_DOT[a.image_status] ?? 'bg-ink-300')}
                            />
                          )}
                        </div>
                        <div className="min-w-0 max-w-72">
                          <p className="truncate text-sm font-bold">{a.title}</p>
                          <p className="mt-0.5 text-[11px] text-ink-400">
                            {a.source_name ?? 'تحرير داخلي'} {a.is_demo && <span className="text-amber-500">· DEMO</span>}
                          </p>
                          {a.image_status && (
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
                              <span className={IMAGE_STATUS_COLOR[a.image_status] ?? 'text-ink-400'}>📷 {IMAGE_STATUS_LABEL[a.image_status] ?? a.image_status}</span>
                              {a.image_source_name && <span className="text-ink-400">من: {a.image_source_name}</span>}
                              {a.image_rights && <span className="text-ink-400">({IMAGE_RIGHTS_LABEL[a.image_rights] ?? a.image_rights})</span>}
                              {a.image_url && /^https?:/.test(a.image_url) && (
                                <a href={a.image_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline dark:text-brand-400">
                                  الأصل ↗
                                </a>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="chip" style={{ backgroundColor: `${c?.color}14`, color: c?.color }}>
                        {c?.name}
                      </span>
                    </td>
                    <td className="p-3">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => setBreaking(a.id, !a.is_breaking)}
                        title={a.is_breaking ? 'إلغاء العاجل' : 'تعيين كعاجل'}
                        aria-label={a.is_breaking ? 'إلغاء العاجل' : 'تعيين كعاجل'}
                        className={cx(
                          'rounded-lg p-2 transition-colors',
                          a.is_breaking
                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-400'
                            : 'text-ink-300 hover:bg-ink-100 hover:text-brand-600 dark:text-ink-600 dark:hover:bg-ink-800',
                        )}
                      >
                        <Zap className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="p-3 text-xs font-bold text-ink-500">{formatNumber(a.views)}</td>
                    <td className="p-3 text-xs font-medium text-ink-400">{relativeTime(a.updated_at)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-0.5">
                        <Link
                          to={`/article/${a.slug}`}
                          title="معاينة على الموقع"
                          className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-800 dark:hover:bg-ink-800 dark:hover:text-white"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => navigate(`/admin/articles/${a.id}/edit`)}
                          title="تعديل"
                          className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {a.status === 'published' ? (
                          <button
                            onClick={() => setArticleStatus(a.id, 'draft')}
                            title="إلغاء النشر"
                            className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-amber-600 dark:hover:bg-ink-800"
                          >
                            <Undo2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setArticleStatus(a.id, 'published')}
                            title="نشر الآن"
                            className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-emerald-600 dark:hover:bg-ink-800"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setToDelete(a.id)}
                          title="حذف"
                          className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}

      <ConfirmDialog
        open={toDelete !== null}
        title="حذف الخبر نهائياً؟"
        message="سيتم حذف هذا الخبر مع تعليقاته وسجل مشاهداته. لا يمكن التراجع عن هذا الإجراء."
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />

      <div className="flex items-center gap-2 text-[11px] text-ink-400">
        <Globe className="h-3.5 w-3.5" />
        النشر الفوري يضبط الحالة إلى PUBLISHED ويحدّث تاريخ النشر.
      </div>
    </div>
  );
}
