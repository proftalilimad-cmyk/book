import { Link } from 'react-router-dom';
import { formatFullDate } from '@/lib/utils';
import { dataMode } from '@/lib/supabaseClient';
import { MapPin, FlaskConical } from 'lucide-react';

export default function TopBar() {
  return (
    <div className="bg-ink-950 text-ink-100 dark:bg-black/40">
      <div className="container-x flex h-9 items-center justify-between gap-3 text-[11px] sm:text-xs">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="hidden items-center gap-1 font-medium text-ink-300 sm:flex">
            <MapPin className="h-3 w-3 text-brand-500" />
            المغرب
          </span>
          <time className="truncate font-medium text-ink-300">{formatFullDate(new Date())}</time>
        </div>

        <div className="flex items-center gap-4">
          {dataMode === 'demo' && (
            <span className="hidden items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-bold text-amber-400 md:flex">
              <FlaskConical className="h-3 w-3" />
              وضع العرض التجريبي — بيانات DEMO
            </span>
          )}
          <Link to="/about" className="font-bold text-ink-200 transition-colors hover:text-white">
            من نحن
          </Link>
          <Link to="/about/contact" className="font-bold text-ink-200 transition-colors hover:text-white">
            اتصل بنا
          </Link>
        </div>
      </div>
    </div>
  );
}
