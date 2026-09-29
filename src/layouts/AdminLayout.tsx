import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  Bot,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Newspaper,
  Rss,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ThemeToggle from '@/components/header/ThemeToggle';
import { cx } from '@/lib/utils';
import { StarMark } from '@/components/Logo';

const NAV = [
  { to: '/admin', label: 'لوحة القيادة', icon: LayoutDashboard, end: true },
  { to: '/admin/articles', label: 'إدارة الأخبار', icon: FileText },
  { to: '/admin/review', label: 'قائمة المراجعة', icon: ClipboardCheck },
  { to: '/admin/agent', label: 'وكيل الأخبار AI', icon: Bot },
  { to: '/admin/sources', label: 'المصادر', icon: Rss },
  { to: '/admin/comments', label: 'التعليقات', icon: MessageSquare },
  { to: '/admin/settings', label: 'الإعدادات', icon: Settings },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'مدير النظام',
  EDITOR: 'محرر',
  AUTHOR: 'كاتب',
  USER: 'مستخدم',
};

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const items = NAV.map((n) => (
    <NavLink
      key={n.to}
      to={n.to}
      end={n.end}
      className={({ isActive }) =>
        cx(
          'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors',
          isActive
            ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25'
            : 'text-ink-300 hover:bg-white/5 hover:text-white',
        )
      }
    >
      <n.icon className="h-4.5 w-4.5 h-5 w-5" />
      {n.label}
    </NavLink>
  ));

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950 lg:flex">
      {/* الشريط الجانبي — سطح المكتب */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-ink-950 p-4 lg:flex">
        <Link to="/admin" className="mb-6 flex items-center gap-2.5 px-2 pt-2">
          <StarMark className="h-9 w-9" />
          <span className="text-base font-black text-white">
            NEWS <span className="text-brand-500">MAROC</span>
            <span className="mt-0.5 block text-[10px] font-bold text-ink-400">لوحة التحكم</span>
          </span>
        </Link>
        <nav className="flex-1 space-y-1">{items}</nav>
        <div className="border-t border-white/10 pt-4">
          <Link
            to="/"
            className="mb-1 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-ink-300 hover:bg-white/5 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" />
            معاينة الموقع
          </Link>
          <button
            onClick={async () => {
              await signOut();
              navigate('/admin/login');
            }}
            className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* المحتوى */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* الترويسة */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-ink-900/5 bg-white/90 px-4 backdrop-blur-md dark:border-white/5 dark:bg-ink-950/90 sm:px-6">
          <Link to="/admin" className="flex items-center gap-2 lg:hidden">
            <StarMark className="h-8 w-8" />
            <span className="text-sm font-black">لوحة التحكم</span>
          </Link>
          <div className="hidden items-center gap-2 text-sm font-bold text-ink-500 lg:flex">
            <Newspaper className="h-4 w-4 text-brand-600" />
            غرفة الأخبار الرقمية
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden items-center gap-2.5 rounded-xl bg-ink-100 px-3 py-1.5 dark:bg-ink-800 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-black text-white">
                {user?.name?.[0] ?? 'م'}
              </span>
              <div className="leading-tight">
                <p className="text-xs font-extrabold text-ink-900 dark:text-white">{user?.name}</p>
                <p className="text-[10px] font-bold text-brand-600">{user ? ROLE_LABEL[user.role] : ''}</p>
              </div>
            </div>
            <button
              onClick={async () => {
                await signOut();
                navigate('/admin/login');
              }}
              className="rounded-xl p-2 text-ink-500 hover:bg-ink-100 hover:text-red-600 dark:text-ink-400 dark:hover:bg-ink-800 lg:hidden"
              aria-label="تسجيل الخروج"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* تنقل الجوال */}
        <nav className="sticky top-16 z-30 flex gap-1 overflow-x-auto border-b border-ink-900/5 bg-white/90 px-3 py-2 backdrop-blur-md no-scrollbar dark:border-white/5 dark:bg-ink-950/90 lg:hidden">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cx(
                  'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold',
                  isActive ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800',
                )
              }
            >
              <n.icon className="h-3.5 w-3.5" />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
