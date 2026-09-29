import type { ArticleStatus } from '@/types';
import { cx } from '@/lib/utils';

const MAP: Record<ArticleStatus, { label: string; cls: string }> = {
  draft: { label: 'مسودة', cls: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300' },
  new: { label: 'NEW — جديدة', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400' },
  fetched: { label: 'FETCHED — مُجلوبة', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400' },
  duplicate: { label: 'DUPLICATE — مكررة', cls: 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400' },
  processing: { label: 'PROCESSING', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400' },
  ai_edited: { label: 'AI EDITED', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400' },
  verified: { label: 'VERIFIED — موثّقة', cls: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400' },
  rewritten: { label: 'REWRITTEN — مُحررة', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400' },
  pending_review: { label: 'بانتظار المراجعة', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400' },
  review_required: { label: 'REVIEW REQUIRED — تحقق لازم', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400' },
  published: { label: 'منشور', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' },
  rejected: { label: 'مرفوضة', cls: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400' },
  archived: { label: 'محفوظ/مرفوض', cls: 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400' },
};

export default function StatusBadge({ status }: { status: ArticleStatus }) {
  const s = MAP[status] ?? MAP.draft;
  return <span className={cx('chip', s.cls)}>{s.label}</span>;
}
