import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Search, LayoutDashboard } from 'lucide-react';
import Logo from '@/components/Logo';
import MainNav from '@/components/header/MainNav';
import ThemeToggle from '@/components/header/ThemeToggle';
import MobileMenu from '@/components/header/MobileMenu';
import SearchOverlay from '@/components/search/SearchOverlay';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-900/5 bg-white/90 backdrop-blur-md dark:border-white/5 dark:bg-ink-950/90">
      <div className="container-x flex h-16 items-center justify-between gap-3 sm:h-[72px]">
        <div className="flex items-center gap-2">
          <button
            className="rounded-xl p-2 text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Logo className="hidden min-[380px]:flex" />
          <Logo compact className="flex min-[380px]:hidden" />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            className="flex items-center gap-2 rounded-xl border border-ink-900/10 bg-ink-50 px-3 py-2 text-sm text-ink-500 transition-colors hover:border-brand-300 hover:text-brand-600 dark:border-white/10 dark:bg-ink-900 dark:text-ink-400 dark:hover:text-brand-400"
            onClick={() => setSearchOpen(true)}
            aria-label="البحث"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">ابحث في الأخبار…</span>
          </button>
          <ThemeToggle />
          <Link
            to="/admin"
            className="hidden items-center gap-1.5 rounded-xl bg-ink-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-ink-800 dark:bg-white dark:text-ink-900 dark:hover:bg-ink-100 sm:flex"
          >
            <LayoutDashboard className="h-4 w-4" />
            لوحة التحكم
          </Link>
        </div>
      </div>

      <MainNav />

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
