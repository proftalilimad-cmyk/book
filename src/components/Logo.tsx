import { Link } from 'react-router-dom';
import { cx } from '@/lib/utils';

export function StarMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <rect width="100" height="100" rx="22" fill="#c1272d" />
      <path
        d="M50 18 L59.8 40.5 L84 41.6 L65.2 57 L71 80.5 L50 67 L29 80.5 L34.8 57 L16 41.6 L40.2 40.5 Z"
        fill="#ffffff"
      />
    </svg>
  );
}

export default function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link to="/" className={cx('group flex items-center gap-2.5', className)} aria-label="NEWS MAROC — الرئيسية">
      <StarMark className="h-9 w-9 shrink-0 drop-shadow-sm transition-transform group-hover:scale-105 sm:h-10 sm:w-10" />
      <span className="leading-none">
        <span className="block text-lg font-black tracking-tight text-ink-900 dark:text-white sm:text-[22px]">
          NEWS <span className="text-brand-600">MAROC</span>
        </span>
        {!compact && (
          <span className="mt-1 block text-[10px] font-bold text-ink-500 dark:text-ink-400 sm:text-[11px]">
            أخبار المغرب لحظة بلحظة
          </span>
        )}
      </span>
    </Link>
  );
}
