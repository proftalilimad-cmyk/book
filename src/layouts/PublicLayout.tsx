import { Outlet } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import TopBar from '@/components/header/TopBar';
import Header from '@/components/header/Header';
import BreakingTicker from '@/components/header/BreakingTicker';
import Footer from '@/components/footer/Footer';
import { cx } from '@/lib/utils';

function BackToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="العودة إلى الأعلى"
      className={cx(
        'fixed bottom-5 start-5 z-40 rounded-full bg-brand-600 p-3 text-white shadow-lg transition-all hover:bg-brand-700',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <Header />
      <BreakingTicker />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}
