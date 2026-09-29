import { Link } from 'react-router-dom';
import {
  Bot,
  ClipboardCheck,
  Eye,
  FileText,
  Flame,
  MessageSquare,
  Newspaper,
  Rss,
  Send,
  Sunrise,
} from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import { getAdminStats } from '@/services/statsService';
import { listArticles } from '@/services/articleService';
import StatCard from '@/components/admin/StatCard';
import StatusBadge from '@/components/admin/StatusBadge';
import Seo from '@/components/Seo';
import { dataMode } from '@/lib/supabaseClient';
import { getCategory } from '@/lib/demoData';
import { cx, formatNumber, relativeTime } from '@/lib/utils';

const PIPELINE: Array<{ key: string; label: string; color: string }> = [
  { key: 'new', label: 'NEW', color: '#0ea5e9' },
  { key: 'processing', label: 'PROCESSING', color: '#8b5cf6' },
  { key: 'ai_edited', label: 'AI EDITED', color: '#6366f1' },
  { key: 'pending_review', label: 'PENDING REVIEW', color: '#f59e0b' },
  { key: 'published', label: 'PUBLISHED', color: '#10b981' },
];

export default function DashboardPage() {
  const { data: stats } = useQuery(getAdminStats, []);
  const { data: reviewQueue } = useQuery(
    () => listArticles({ status: 'pending_review', pageSize: 4 }),
    [],
  );
  const { data: latest } = useQuery(() => listArticles({ pageSize: 5 }), []);
  const { data: pipeline } = useQuery(
    () =>
      listArticles({
        status: ['new', 'fetched', 'processing', 'ai_edited', 'verified', 'rewritten', 'pending_review', 'review_required', 'published'],
        pageSize: 500,
      }),
    [],
  );

  const counts: Record<string, number> = {};
  for (const a of pipeline?.items ?? []) counts[a.status] = (counts[a.status] ?? 0) + 1;
  const pipelineMax = Math.max(1, ...Object.values(counts));

  return (
    <div className="space-y-8">
      <Seo title="لوحة القيادة" noindex />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black sm:text-3xl">لوحة القيادة</h1>
          <p className="mt-1 text-sm font-medium text-ink-400">
            نظرة شاملة على غرفة الأخبار {dataMode === 'demo' && <span className="text-amber-500">— وضع DEMO</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/articles/new" className="btn-primary">
            <FileText className="h-4 w-4" />
            خبر جديد
          </Link>
          <Link to="/admin/agent" className="btn-ghost">
            <Bot className="h-4 w-4" />
            وكيل الأخبار
          </Link>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={Newspaper} label="إجمالي الأخبار" value={stats?.totalArticles ?? 0} color="#0ea5e9" />
        <StatCard icon={Sunrise} label="أخبار اليوم" value={stats?.todayArticles ?? 0} color="#8b5cf6" />
        <StatCard icon={Send} label="الأخبار المنشورة" value={stats?.publishedArticles ?? 0} color="#10b981" />
        <StatCard icon={ClipboardCheck} label="قيد المراجعة" value={stats?.pendingReview ?? 0} color="#f59e0b" hint="بانتظار اعتماد المحرر" />
        <StatCard icon={Flame} label="أخبار عاجلة" value={stats?.breakingArticles ?? 0} color="#c1272d" />
        <StatCard icon={Rss} label="عدد المصادر" value={stats?.totalSources ?? 0} hint={`النشطة: ${stats?.activeSources ?? 0}`} color="#0d9488" />
        <StatCard icon={Eye} label="عدد الزيارات" value={stats?.totalViews ?? 0} hint="مجموع مشاهدات الأخبار" color="#6366f1" />
        <StatCard icon={MessageSquare} label="تعليقات بالانتظار" value={stats?.pendingComments ?? 0} color="#db2777" />
      </div>

      {/* خط معالجة الوكيل */}
      <section className="card p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <Bot className="h-5 w-5 text-brand-600" />
            خط معالجة NEWS AI AGENT
          </h2>
          <Link to="/admin/agent" className="text-xs font-bold text-brand-600 hover:underline">
            إدارة الوكيل ←
          </Link>
        </div>
        <div className="space-y-3">
          {PIPELINE.map((p) => {
            const count = counts[p.key] ?? 0;
            return (
              <div key={p.key} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-xs font-black text-ink-500 dark:text-ink-400">{p.label}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.round((count / pipelineMax) * 100)}%`, backgroundColor: p.color }}
                  />
                </div>
                <span className="w-8 shrink-0 text-end text-sm font-black">{count}</span>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] leading-5 text-ink-400">
          قاعدة المنصة: لا يُنشر أي محتوى آلي إلا بعد مروره بمراجعة بشرية (PENDING REVIEW → اعتماد المحرر → PUBLISHED).
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* قائمة المراجعة */}
        <section className="card p-5">
          <h2 className="mb-4 flex items-center justify-between text-base font-black">
            <span className="flex items-center gap-2">
              <ClipboardCheck className="h-4.5 w-4.5 h-5 w-5 text-amber-500" />
              أحدث ما في قائمة المراجعة
            </span>
            <Link to="/admin/review" className="text-xs font-bold text-brand-600 hover:underline">الكل ←</Link>
          </h2>
          <div className="space-y-2">
            {(reviewQueue?.items ?? []).map((a) => (
              <Link
                key={a.id}
                to="/admin/review"
                className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-ink-50 dark:hover:bg-ink-900"
              >
                <img src={a.featured_image} alt="" width={64} height={40} className="h-10 w-16 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{a.title}</p>
                  <p className="text-[11px] text-ink-400">{relativeTime(a.created_at)}</p>
                </div>
                <StatusBadge status={a.status} />
              </Link>
            ))}
            {(reviewQueue?.items.length ?? 0) === 0 && (
              <p className="py-6 text-center text-sm font-bold text-ink-400">قائمة المراجعة فارغة — شغّل وكيل الأخبار.</p>
            )}
          </div>
        </section>

        {/* أحدث الأخبار */}
        <section className="card p-5">
          <h2 className="mb-4 flex items-center justify-between text-base font-black">
            <span className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-brand-600" />
              أحدث الأخبار
            </span>
            <Link to="/admin/articles" className="text-xs font-bold text-brand-600 hover:underline">الكل ←</Link>
          </h2>
          <div className="space-y-2">
            {(latest?.items ?? []).map((a) => (
              <Link
                key={a.id}
                to={`/admin/articles/${a.id}/edit`}
                className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-ink-50 dark:hover:bg-ink-900"
              >
                <img src={a.featured_image} alt="" width={64} height={40} className="h-10 w-16 rounded-lg object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{a.title}</p>
                  <p className="flex items-center gap-2 text-[11px] text-ink-400">
                    <span style={{ color: getCategory(a.category)?.color }}>{getCategory(a.category)?.name}</span>
                    · {formatNumber(a.views)} مشاهدة · {relativeTime(a.published_at)}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
