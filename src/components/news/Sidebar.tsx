import MostRead from '@/components/news/MostRead';
import NewsletterBox from '@/components/news/NewsletterBox';
import AdSlot from '@/components/AdSlot';

/** الشريط الجانبي الموحد للصفحات الداخلية */
export default function Sidebar() {
  return (
    <aside className="space-y-6">
      <MostRead />
      <AdSlot slot="sidebar" label="300 × 250 — Sidebar" />
      <NewsletterBox />
    </aside>
  );
}
