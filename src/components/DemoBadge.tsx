import { FlaskConical } from 'lucide-react';
import { cx } from '@/lib/utils';

/** شارة توضح أن المحتوى بيانات تجريبية (DEMO DATA) وليس أخباراً حقيقية */
export default function DemoBadge({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span
      className={cx(
        'chip',
        light
          ? 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/30'
          : 'bg-amber-100 text-amber-800 ring-1 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/20',
        className,
      )}
      title="هذه المادة جزء من بيانات العرض التجريبي وليست خبراً حقيقياً"
    >
      <FlaskConical className="h-3 w-3" />
      DEMO
    </span>
  );
}
