import type { LucideIcon } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface Props {
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
  color: string; // hex
}

export default function StatCard({ icon: Icon, label, value, hint, color }: Props) {
  return (
    <div className="card flex items-center gap-4 p-4 sm:p-5">
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${color}16`, color }}
      >
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-ink-400">{label}</p>
        <p className="mt-0.5 text-2xl font-black text-ink-900 dark:text-white">{formatNumber(value)}</p>
        {hint && <p className="truncate text-[11px] font-medium text-ink-400">{hint}</p>}
      </div>
    </div>
  );
}
