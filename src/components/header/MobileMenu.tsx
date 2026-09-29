import { Link, NavLink } from 'react-router-dom';
import { X, LayoutDashboard } from 'lucide-react';
import { NAV_LINKS } from '@/components/header/navLinks';
import { cx } from '@/lib/utils';
import Logo from '@/components/Logo';

interface Props {
  open: boolean;
  onClose: () => void;
}

const LEGAL_LINKS = [
  { to: '/about', label: 'من نحن' },
  { to: '/about/contact', label: 'اتصل بنا' },
  { to: '/privacy', label: 'سياسة الخصوصية' },
  { to: '/terms', label: 'شروط الاستخدام' },
  { to: '/disclaimer', label: 'إخلاء المسؤولية' },
  { to: '/advertising', label: 'إعلانات' },
];

export default function MobileMenu({ open, onClose }: Props) {
  return (
    <div
      className={cx('fixed inset-0 z-[70] lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')}
      aria-hidden={!open}
    >
      {/* خلفية معتمة */}
      <div
        className={cx(
          'absolute inset-0 bg-ink-950/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      {/* اللوحة الجانبية */}
      <aside
        className={cx(
          'absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 dark:bg-ink-925',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-label="القائمة"
      >
        <div className="flex items-center justify-between border-b border-ink-900/5 p-4 dark:border-white/5">
          <Logo compact />
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800"
            aria-label="إغلاق القائمة"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-0.5">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cx(
                      'block rounded-xl px-4 py-3 text-[15px] font-bold transition-colors',
                      isActive
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                        : 'text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="my-4 border-t border-ink-900/5 dark:border-white/5" />
          <ul className="space-y-0.5">
            {LEGAL_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  onClick={onClose}
                  className="block rounded-xl px-4 py-2.5 text-sm font-medium text-ink-500 hover:bg-ink-50 dark:text-ink-400 dark:hover:bg-ink-800"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-ink-900/5 p-4 dark:border-white/5">
          <Link to="/admin" onClick={onClose} className="btn-primary w-full">
            <LayoutDashboard className="h-4 w-4" />
            لوحة التحكم
          </Link>
        </div>
      </aside>
    </div>
  );
}
