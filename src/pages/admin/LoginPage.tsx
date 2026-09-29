import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, Loader2, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { DEMO_ACCOUNTS } from '@/services/authService';
import { dataMode } from '@/lib/supabaseClient';
import Seo from '@/components/Seo';
import { StarMark } from '@/components/Logo';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      navigate(location.state?.from || '/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-ink-950 via-ink-925 to-ink-950 p-4">
      <Seo title="تسجيل الدخول — لوحة التحكم" noindex />
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <StarMark className="h-14 w-14 drop-shadow-lg" />
          </div>
          <h1 className="text-2xl font-black text-white">
            NEWS <span className="text-brand-500">MAROC</span>
          </h1>
          <p className="mt-1 text-sm font-bold text-ink-400">لوحة تحكم غرفة الأخبار</p>
        </div>

        <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-2xl dark:bg-ink-925 sm:p-8">
          <label className="label" htmlFor="email">البريد الإلكتروني</label>
          <div className="relative mb-4">
            <Mail className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input ps-10"
              placeholder="admin@newsmaroc.ma"
              autoComplete="username"
            />
          </div>

          <label className="label" htmlFor="password">كلمة المرور</label>
          <div className="relative mb-4">
            <Lock className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input ps-10"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full !py-3">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {loading ? 'جارٍ التحقق…' : 'دخول لوحة التحكم'}
          </button>

          {dataMode === 'demo' && (
            <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs leading-6 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              <p className="mb-2 font-black">وضع العرض التجريبي (DEMO) — حسابات جاهزة:</p>
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(a.password);
                  }}
                  className="me-2 mb-1 rounded-lg bg-white px-3 py-1.5 font-bold text-amber-900 ring-1 ring-amber-200 transition-colors hover:bg-amber-100 dark:bg-ink-900 dark:text-amber-200 dark:ring-amber-500/20"
                >
                  {a.role === 'ADMIN' ? 'مدير النظام' : 'محرر'} · {a.email}
                </button>
              ))}
              <p className="mt-2 text-[11px] text-amber-700/80 dark:text-amber-300/70">
                في الإنتاج تُدار الهويات عبر Supabase Auth مع الصلاحيات ADMIN / EDITOR / AUTHOR / USER.
              </p>
            </div>
          )}
        </form>

        <Link to="/" className="mt-6 block text-center text-sm font-bold text-ink-400 hover:text-white">
          ← العودة إلى الموقع
        </Link>
      </div>
    </div>
  );
}
