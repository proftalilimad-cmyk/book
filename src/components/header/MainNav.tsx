import { NavLink } from 'react-router-dom';
import { NAV_LINKS } from '@/components/header/navLinks';
import { cx } from '@/lib/utils';

export default function MainNav() {
  return (
    <nav aria-label="التصنيفات الرئيسية" className="hidden border-t border-ink-900/5 dark:border-white/5 lg:block">
      <div className="container-x flex items-center gap-1 overflow-x-auto no-scrollbar">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              cx(
                'relative whitespace-nowrap px-3 py-3 text-[15px] font-bold transition-colors',
                isActive
                  ? 'text-brand-600 dark:text-brand-400'
                  : 'text-ink-600 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white',
              )
            }
          >
            {({ isActive }) => (
              <>
                {link.label}
                <span
                  className={cx(
                    'absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-brand-600 transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
