import { Newspaper } from 'lucide-react';

export default function EmptyState({ title = 'لا توجد أخبار بعد', hint }: { title?: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ink-900/10 py-16 text-center dark:border-white/10">
      <Newspaper className="h-10 w-10 text-ink-300 dark:text-ink-600" />
      <p className="text-base font-extrabold text-ink-600 dark:text-ink-300">{title}</p>
      {hint && <p className="max-w-sm text-sm text-ink-400">{hint}</p>}
    </div>
  );
}
