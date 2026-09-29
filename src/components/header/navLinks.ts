import { CATEGORIES } from '@/lib/demoData';

export interface NavLinkItem {
  to: string;
  label: string;
}

// التنقل الحالي مثبّت عمداً على هذه الأقسام — الأقسام الجديدة (سياحة،
// مغاربة العالم…) لا تظهر في الشريط حفاظاً على بنية الموقع المعتمدة.
const NAV_CATEGORY_SLUGS = [
  'politics',
  'economy',
  'society',
  'education',
  'health',
  'sports',
  'culture',
  'technology',
  'incidents',
  'art',
  'weather',
  'world',
] as const;

export const NAV_LINKS: NavLinkItem[] = [
  { to: '/', label: 'الرئيسية' },
  { to: '/category/maroc', label: 'المغرب' },
  { to: '/regions', label: 'الجهات' },
  ...NAV_CATEGORY_SLUGS.map((slug) => {
    const cat = CATEGORIES.find((c) => c.slug === slug);
    return { to: `/category/${slug}`, label: cat?.name ?? slug };
  }),
];
