import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '@/lib/utils';

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  for (let i = start; i <= Math.min(totalPages, start + 4); i++) pages.push(i);

  const Btn = ({
    children,
    disabled,
    active,
    onClick,
    label,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    active?: boolean;
    onClick: () => void;
    label?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cx(
        'flex h-10 min-w-10 items-center justify-center rounded-xl px-2 text-sm font-bold transition-colors',
        active
          ? 'bg-brand-600 text-white'
          : 'bg-white text-ink-700 ring-1 ring-ink-900/10 hover:bg-ink-50 dark:bg-ink-900 dark:text-ink-200 dark:ring-white/10 dark:hover:bg-ink-800',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      {children}
    </button>
  );

  return (
    <nav className="mt-8 flex items-center justify-center gap-2" aria-label="ترقيم الصفحات">
      <Btn onClick={() => onChange(page - 1)} disabled={page <= 1} label="الصفحة السابقة">
        <ChevronRight className="h-4 w-4" />
      </Btn>
      {start > 1 && (
        <>
          <Btn onClick={() => onChange(1)}>1</Btn>
          {start > 2 && <span className="px-1 text-ink-400">…</span>}
        </>
      )}
      {pages.map((p) => (
        <Btn key={p} active={p === page} onClick={() => onChange(p)}>
          {p}
        </Btn>
      ))}
      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-ink-400">…</span>}
          <Btn onClick={() => onChange(totalPages)}>{totalPages}</Btn>
        </>
      )}
      <Btn onClick={() => onChange(page + 1)} disabled={page >= totalPages} label="الصفحة التالية">
        <ChevronLeft className="h-4 w-4" />
      </Btn>
    </nav>
  );
}
