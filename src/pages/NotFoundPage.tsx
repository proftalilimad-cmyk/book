import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import Seo from '@/components/Seo';

export default function NotFoundPage() {
  return (
    <>
      <Seo title="الصفحة غير موجودة" noindex />
      <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
        <span className="rounded-3xl bg-brand-50 p-6 dark:bg-brand-950/30">
          <Compass className="h-14 w-14 text-brand-600" />
        </span>
        <h1 className="mt-6 text-6xl font-black text-ink-900 dark:text-white">404</h1>
        <p className="mt-3 max-w-md text-base font-bold leading-8 text-ink-500 dark:text-ink-400">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها. تصفح آخر الأخبار من الصفحة الرئيسية.
        </p>
        <Link to="/" className="btn-primary mt-6">
          <Home className="h-4 w-4" />
          العودة إلى الرئيسية
        </Link>
      </div>
    </>
  );
}
