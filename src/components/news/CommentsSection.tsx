import { useState } from 'react';
import { MessageSquare, Send, UserRound } from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import { addComment, listApprovedComments } from '@/services/commentService';
import { getSettings } from '@/services/settingsService';
import { relativeTime } from '@/lib/utils';

export default function CommentsSection({ articleId }: { articleId: string }) {
  const { data: settings } = useQuery(getSettings, []);
  const { data: comments, reload } = useQuery(() => listApprovedComments(articleId), [articleId]);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (settings && !settings.comments_enabled) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    setSending(true);
    try {
      await addComment(articleId, name, body);
      setSent(true);
      setName('');
      setBody('');
      reload();
    } finally {
      setSending(false);
    }
  };

  return (
    <section aria-label="التعليقات" className="mt-10">
      <h2 className="mb-5 flex items-center gap-2 text-xl font-black">
        <MessageSquare className="h-5 w-5 text-brand-600" />
        التعليقات
        <span className="text-sm font-bold text-ink-400">({comments?.length ?? 0})</span>
      </h2>

      {/* نموذج إضافة تعليق */}
      <form onSubmit={submit} className="card mb-6 p-4 sm:p-5">
        {sent && (
          <p className="mb-3 rounded-xl bg-cedar-600/10 px-4 py-2.5 text-sm font-bold text-cedar-600">
            شكراً! تم استلام تعليقك وسيُنشر بعد مراجعة فريق التحرير.
          </p>
        )}
        <div className="grid gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="الاسم الكامل"
            className="input"
            maxLength={60}
            required
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="شاركنا رأيك باحترام…"
            className="input min-h-[100px] resize-y"
            maxLength={800}
            required
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-ink-400">تخضع التعليقات للمراجعة قبل النشر — PENDING → APPROVED</p>
            <button type="submit" disabled={sending} className="btn-primary">
              <Send className="h-4 w-4" />
              {sending ? 'جارٍ الإرسال…' : 'إرسال'}
            </button>
          </div>
        </div>
      </form>

      {/* قائمة التعليقات المعتمدة */}
      <div className="space-y-3">
        {(comments ?? []).map((c) => (
          <article key={c.id} className="card p-4">
            <header className="mb-2 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-ink-900 dark:text-white">{c.name}</p>
                <time className="text-[11px] text-ink-400">{relativeTime(c.created_at)}</time>
              </div>
            </header>
            <p className="text-sm leading-7 text-ink-700 dark:text-ink-200">{c.body}</p>
          </article>
        ))}
        {comments && comments.length === 0 && (
          <p className="rounded-2xl border border-dashed border-ink-900/10 py-8 text-center text-sm font-bold text-ink-400 dark:border-white/10">
            كن أول من يعلق على هذا الخبر.
          </p>
        )}
      </div>
    </section>
  );
}
