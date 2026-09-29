import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, Twitter, Music2, Mail, MapPin, Phone } from 'lucide-react';
import Logo, { StarMark } from '@/components/Logo';
import { CATEGORIES, REGIONS } from '@/lib/demoData';
import { useQuery } from '@/hooks/useQuery';
import { getSettings } from '@/services/settingsService';

const LEGAL = [
  { to: '/about', label: 'من نحن' },
  { to: '/about/contact', label: 'اتصل بنا' },
  { to: '/privacy', label: 'سياسة الخصوصية' },
  { to: '/terms', label: 'شروط الاستخدام' },
  { to: '/disclaimer', label: 'إخلاء المسؤولية' },
  { to: '/advertising', label: 'إعلانات' },
];

export default function Footer() {
  const { data: settings } = useQuery(getSettings, []);
  const social = settings?.social;

  const socialLinks = [
    { name: 'فيسبوك', href: social?.facebook || '#', icon: Facebook },
    { name: 'إنستغرام', href: social?.instagram || '#', icon: Instagram },
    { name: 'يوتيوب', href: social?.youtube || '#', icon: Youtube },
    { name: 'إكس (تويتر)', href: social?.x || '#', icon: Twitter },
    { name: 'تيك توك', href: social?.tiktok || '#', icon: Music2 },
  ];

  return (
    <footer className="mt-16 bg-ink-950 text-ink-200">
      {/* خط الهوية */}
      <div className="h-1 bg-gradient-to-l from-brand-600 via-brand-500 to-cedar-600" />

      <div className="container-x grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-5">
        {/* العلامة */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <StarMark className="h-10 w-10" />
            <span className="text-xl font-black text-white">
              NEWS <span className="text-brand-500">MAROC</span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-7 text-ink-400">
            منصة إخبارية مغربية مستقلة تقدم الأخبار الوطنية والجهوية والدولية بأسلوب عصري ومهني،
            مع التزام كامل بقواعد التحرير الصحفي وإحالة كل مادة إلى مصدرها الأصلي.
          </p>
          <div className="mt-5 flex items-center gap-2">
            {socialLinks.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.name}
                title={s.name}
                className="rounded-xl bg-white/5 p-2.5 text-ink-300 transition-colors hover:bg-brand-600 hover:text-white"
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
          <div className="mt-6 space-y-1.5 text-xs text-ink-500">
            <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-brand-500" /> المملكة المغربية</p>
            <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-brand-500" /> contact@newsmaroc.ma</p>
            <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-brand-500" /> +212 5 00 00 00 00</p>
          </div>
        </div>

        {/* الأقسام */}
        <nav aria-label="أقسام الموقع">
          <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-white">الأقسام</h3>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            {CATEGORIES.slice(0, 10).map((c) => (
              <li key={c.slug}>
                <Link to={`/category/${c.slug}`} className="text-ink-400 transition-colors hover:text-brand-400">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* الجهات */}
        <nav aria-label="الجهات">
          <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-white">الجهات</h3>
          <ul className="space-y-2.5 text-sm">
            {REGIONS.slice(0, 6).map((r) => (
              <li key={r.slug}>
                <Link to={`/regions/${r.slug}`} className="text-ink-400 transition-colors hover:text-brand-400">
                  {r.name}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/regions" className="font-bold text-brand-400 hover:text-brand-300">
                جميع الجهات ←
              </Link>
            </li>
          </ul>
        </nav>

        {/* روابط المؤسسة */}
        <nav aria-label="روابط المؤسسة">
          <h3 className="mb-4 text-sm font-black uppercase tracking-wide text-white">المؤسسة</h3>
          <ul className="space-y-2.5 text-sm">
            {LEGAL.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-ink-400 transition-colors hover:text-brand-400">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-5 text-xs text-ink-500 sm:flex-row">
          <p>© {new Date().getFullYear()} NEWS MAROC — جميع الحقوق محفوظة.</p>
          <p className="flex items-center gap-1.5">
            صُنع بإتقان في المغرب
            <span className="inline-block h-3 w-4 rounded-[3px] bg-gradient-to-b from-brand-600 to-brand-700" />
          </p>
        </div>
      </div>
    </footer>
  );
}
