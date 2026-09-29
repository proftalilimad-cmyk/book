import { useState } from 'react';
import { CheckCircle2, MessageSquare, Link as LinkIcon, Trash2, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@/hooks/useQuery';
import { deleteComment, listAllComments, setCommentStatus } from '@/services/commentService';
import { getArticleById } from '@/services/articleService';
import type { CommentStatus } from '@/types';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EmptyState from '@/components/news/EmptyState';
import Seo from '@/components/Seo';
import { cx, relativeTime } from '@/lib/utils';
import { useEffect, useState as useState2 } from 'react';

const TABS: Array<{ key: CommentStatus | undefined; label: string }> = [
  { key: 'pending', label: 'بانتظار الموافقة' },
  { key: 'approved', label: 'معتمد' },
  { key: 'rejected', label: 'مرفوض' },
  { key: undefined, label: 'الكل' },
];

function CommentRow({
  c,
  onAction,
}: {
  c: import('@/types').Comment;
  onAction: (fn: () => Promise<void>) => void;
}) {
  const [articleTitle, setArticleTitle] = useState2('');
  useEffect(() => {
    getArticleById(c.article_id).then((a) => setArticleTitle(a?.title ?? ''));
  }, [c.article_id]);

  return (
    <div className="card flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-ink-400">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 font-black text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
          {c.name[0] ?? '؟'}
        </span>
        <span className="text-sm font-black text-ink-900 dark:text-white">{c.name}</span>
        <span>· {relativeTime(c.created_at)}</span>
        {articleTitle && (
          <span className="flex items-center gap-1 truncate">
            · على: <span className="max-w-56 truncate text-ink-600 dark:text-ink-300">{articleTitle}</span>
          </span>
        )}
      </div>
      <p className="text-sm leading-7 text-ink-700 dark:text-ink-200">{c.body}</p>
      <div className="flex flex-wrap items-center gap-2">
        {c.status !== 'approved' && (
          <button onClick={() => onAction(() => setCommentStatus(c.id, 'approved'))} className="btn !px-3.5 !py-1.5 bg-emerald-600 text-xs text-white hover:bg-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            موافقة
          </button>
        )}
        {c.status !== 'rejected' && (
          <button onClick={() => onAction(() => setCommentStatus(c.id, 'rejected'))} className="btn-ghost !px-3.5 !py-1.5 text-xs">
            <XCircle className="h-3.5 w-3.5" />
            رفض
          </button>
        )}
        <Link to={`/article/${c.article_id}`} className="btn-ghost !px-3.5 !py-1.5 text-xs">
          <LinkIcon className="h-3.5 w-3.5" />
          الخبر
        </Link>
      </div>
    </div>
  );
}

export default function CommentsPage() {
  const [tab, setTab] = useState<CommentStatus | undefined>('pending');
  const { data: comments, reload } = useQuery(() => listAllComments(tab), [tab]);
  const [toDelete, setToDelete] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Seo title="إدارة التعليقات" noindex />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black sm:text-3xl">إدارة التعليقات</h1>
        <span className="chip bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
          <MessageSquare className="h-3 w-3" />
          لا يُعرض أي تعليق قبل الموافقة
        </span>
      </div>

      <div className="flex w-fit rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
        {TABS.map((t) => (
          <button
            key={String(t.key)}
            onClick={() => setTab(t.key)}
            className={cx(
              'rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors',
              tab === t.key
                ? 'bg-white text-brand-700 shadow-sm dark:bg-ink-950 dark:text-brand-400'
                : 'text-ink-500 hover:text-ink-800 dark:text-ink-400',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {(comments ?? []).map((c) => (
          <div key={c.id} className="relative">
            <CommentRow
              c={c}
              onAction={async (fn) => {
                await fn();
                reload();
              }}
            />
            <button
              onClick={() => setToDelete(c.id)}
              className="absolute end-3 top-3 rounded-lg p-2 text-ink-300 hover:bg-red-50 hover:text-red-600 dark:text-ink-600 dark:hover:bg-red-500/10"
              title="حذف التعليق"
              aria-label="حذف التعليق"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {(comments?.length ?? 0) === 0 && <EmptyState title="لا توجد تعليقات في هذه القائمة" />}

      <ConfirmDialog
        open={toDelete !== null}
        title="حذف التعليق نهائياً؟"
        message="سيُحذف هذا التعليق ولن يمكن استرجاعه."
        onConfirm={async () => {
          if (toDelete) await deleteComment(toDelete);
          setToDelete(null);
          reload();
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
