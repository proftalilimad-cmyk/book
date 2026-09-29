import { Megaphone } from 'lucide-react';
import { useQuery } from '@/hooks/useQuery';
import { getSettings } from '@/services/settingsService';
import type { SiteSettings } from '@/types';
import { cx } from '@/lib/utils';

interface Props {
  slot: keyof SiteSettings['ads'];
  label?: string;
  className?: string;
  compact?: boolean;
}

/**
 * مساحة إعلانية جاهزة للربط (Google AdSense أو شبكة الإعلانات).
 * تُفعَّل وتُعطَّل من لوحة التحكم → الإعدادات → الإعلانات.
 */
export default function AdSlot({ slot, label, className, compact = false }: Props) {
  const { data: settings } = useQuery(getSettings, []);
  if (!settings?.ads?.[slot]) return null;

  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-ink-900/10 bg-ink-50 text-ink-400 dark:border-white/10 dark:bg-ink-900/50 dark:text-ink-500',
        compact ? 'min-h-[90px] py-3' : 'min-h-[130px] py-6',
        className,
      )}
      aria-label="مساحة إعلانية"
    >
      <Megaphone className={cx(compact ? 'h-4 w-4' : 'h-5 w-5', 'text-ink-300 dark:text-ink-600')} />
      <p className="text-[10px] font-black uppercase tracking-widest">إعلان</p>
      {label && <p className="text-xs font-medium">{label}</p>}
    </div>
  );
}
