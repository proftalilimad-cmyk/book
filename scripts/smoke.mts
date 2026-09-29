// ============================================================
// اختبار تحميل سريع (Smoke Test) — يعاير كل مسار رئيسي ويتحقق
// من عدم وجود أخطاء تشغيل أثناء أول render.
// التشغيل: npx tsx scripts/smoke.mts
// ============================================================

import { GlobalWindow } from 'happy-dom';

const window = new GlobalWindow({ url: 'http://localhost/' }) as unknown as Window & typeof globalThis;

// polyfill مبسّط لـ matchMedia إن غاب
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!(window as any).matchMedia) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });
}

// تعريض globals
const g = globalThis as unknown as Record<string, unknown>;
const extend = (key: string, value: unknown) => {
  try {
    Object.defineProperty(g, key, { value, configurable: true, writable: true });
  } catch {
    /* خاصية للقراءة فقط — نتجاوزها */
  }
};
extend('window', window);
extend('document', window.document);
extend('localStorage', window.localStorage);
extend('sessionStorage', window.sessionStorage);
extend('location', window.location);
extend('HTMLElement', window.HTMLElement);
extend('SVGElement', window.SVGElement);
extend('Element', window.Element);
extend('Node', window.Node);
extend('CustomEvent', window.CustomEvent);
extend('Event', window.Event);
extend('getComputedStyle', window.getComputedStyle);
extend('matchMedia', window.matchMedia);
extend('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0));

const failures: string[] = [];
const asyncErrors: string[] = [];
process.on('unhandledRejection', (e) => {
  asyncErrors.push(String(e));
});

const React = await import('react');
const { renderToString } = await import('react-dom/server');
const { MemoryRouter } = await import('react-router-dom');
const { ThemeProvider } = await import('../src/hooks/useTheme');
const { AuthProvider } = await import('../src/hooks/useAuth');
const App = (await import('../src/App')).default;
const { buildDemoArticles } = await import('../src/lib/demoData');

const firstSlug = buildDemoArticles()[0].slug;
const regionSlug = 'dakhla-oued-eddahab';

const routes = [
  '/',
  `/article/${firstSlug}`,
  '/category/maroc',
  '/category/sports',
  '/regions',
  `/regions/${regionSlug}`,
  '/search?q=%D8%A7%D9%82%D8%AA%D8%B5%D8%A7%D8%AF',
  '/tag/%D8%A7%D9%84%D8%A7%D9%82%D8%AA%D8%B5%D8%A7%D8%AF',
  '/about',
  '/about/contact',
  '/privacy',
  '/terms',
  '/disclaimer',
  '/advertising',
  '/admin/login',
  '/admin',
  '/no-such-page-404',
];

for (const route of routes) {
  try {
    const html = renderToString(
      React.createElement(
        MemoryRouter,
        { initialEntries: [route] },
        React.createElement(ThemeProvider, null, React.createElement(AuthProvider, null, React.createElement(App))),
      ),
    );
    if (html.length < 200) throw new Error(`محتوى فارغ تقريباً (${html.length} حرفاً)`);
    console.log(`✓ ${route} → ${html.length} chars`);
  } catch (e) {
    failures.push(`${route}: ${e instanceof Error ? e.message : e}`);
    console.error(`✗ ${route} →`, e);
  }
}

// أمهل الوعود غير المتزامنة (useQuery إلخ)
await new Promise((r) => setTimeout(r, 800));

if (asyncErrors.length) {
  console.error('\nأخطاء غير متزامنة:');
  asyncErrors.forEach((e) => console.error(' -', e));
}

if (failures.length || asyncErrors.length) {
  console.error(`\n✗ فشل ${failures.length} مساراً + ${asyncErrors.length} خطأ غير متزامن`);
  process.exit(1);
}
console.log('\n✅ كل المسارات تعمل دون أخطاء تشغيل.');
