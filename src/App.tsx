import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import PublicLayout from '@/layouts/PublicLayout';

import HomePage from '@/pages/HomePage';
import ArticlePage from '@/pages/ArticlePage';
import CategoryPage from '@/pages/CategoryPage';
import RegionsPage from '@/pages/RegionsPage';
import RegionPage from '@/pages/RegionPage';
import SearchPage from '@/pages/SearchPage';
import TagPage from '@/pages/TagPage';
import AboutPage from '@/pages/AboutPage';
import ContactPage from '@/pages/ContactPage';
import LegalPage from '@/pages/LegalPage';
import NotFoundPage from '@/pages/NotFoundPage';

// لوحة التحكم تُحمَّل فقط عند زيارة /admin (Code Splitting)
const AdminApp = lazy(() => import('@/pages/admin/AdminApp'));

function AdminFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 dark:bg-ink-950">
      <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* ---------- الواجهة العمومية ---------- */}
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/article/:slug" element={<ArticlePage />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/regions" element={<RegionsPage />} />
          <Route path="/regions/:slug" element={<RegionPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/tag/:slug" element={<TagPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/about/contact" element={<ContactPage />} />
          <Route path="/privacy" element={<LegalPage page="privacy" />} />
          <Route path="/terms" element={<LegalPage page="terms" />} />
          <Route path="/disclaimer" element={<LegalPage page="disclaimer" />} />
          <Route path="/advertising" element={<LegalPage page="advertising" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* ---------- لوحة التحكم (lazy) ---------- */}
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminApp />
            </Suspense>
          }
        />

        <Route path="/home" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
