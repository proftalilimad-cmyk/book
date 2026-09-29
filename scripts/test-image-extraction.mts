// ============================================================
// اختبار خط استخراج الصور من الأخبار:
//  - ترتيب البحث داخل RSS: media:content → media:thumbnail → enclosure → صورة الوصف
//  - استخراج og:image → twitter:image → صورة المقال من HTML
//  - التنقية (شعارات/إعلانات/صغيرة) + ترقية HTTPS + اختيار الأفضل
//  - بيانات حقوق الصورة (الحالة/الترخيص/الإسناد) + التخزين في المقال
//  - السقوط للافتراضية في التدفق الكامل بدون شبكة
// التشغيل: npx tsx scripts/test-image-extraction.mts
// ============================================================
import { GlobalWindow } from 'happy-dom';
const window = new GlobalWindow({ url: 'http://localhost/' }) as unknown as Window & typeof globalThis;
const g = globalThis as unknown as Record<string, unknown>;
for (const [k, v] of Object.entries({ window, document: window.document, localStorage: window.localStorage, DOMParser: (window as unknown as { DOMParser: typeof DOMParser }).DOMParser })) {
  try { Object.defineProperty(g, k, { value: v, configurable: true, writable: true }); } catch { /* skip */ }
}

const { parseRss, isAggregatorLink, resolveItemUrl } = await import('../src/lib/rss');
const {
  extractImageFromHtml,
  buildImageMeta,
  categoryDefaultImage,
  displayImage,
  toHttps,
  scoreImageCandidate,
  pickBestImage,
  validateDeclaredImage,
} = await import('../src/lib/images');
const { normalizeRawItem } = await import('../src/lib/normalize');
const { resetDemoDB, loadDB } = await import('../src/lib/store');
const { ingestOneSource, buildDedupSnapshot } = await import('../src/services/ingestService');
const { createArticle } = await import('../src/services/articleService');
const { listSources } = await import('../src/services/sourceService');

let passed = 0;
let failed = 0;
const check = (name: string, cond: boolean, extra?: string) => {
  if (cond) { passed++; console.log(`✓ ${name}`); }
  else { failed++; console.error(`✗ ${name} ${extra ?? ''}`); }
};

// ---------- ترتيب الاستخراج من RSS ----------
const FEED = `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
<channel><title>اختبار</title>
<item><title>خبر A مع media:content</title><link>https://news.example/a1</link><pubDate>Sun, 28 Sep 2026 10:00:00 GMT</pubDate><description>وصف أولا</description>
<media:content url="http://cdn.news.example/img/main-a.jpg" width="1200" height="800"/></item>
<item><title>خبر B مع media:thumbnail فقط</title><link>https://news.example/b2</link><pubDate>Sun, 28 Sep 2026 09:00:00 GMT</pubDate><description>وصف</description>
<media:thumbnail url="https://cdn.news.example/img/thumb-b.jpg" width="640" height="360"/></item>
<item><title>خبر C مع enclosure</title><link>https://news.example/c3</link><pubDate>Sun, 28 Sep 2026 08:00:00 GMT</pubDate><description>وصف</description>
<enclosure url="https://cdn.news.example/img/enc-c.jpg" type="image/jpeg" length="100"/></item>
<item><title>خبر D صورة داخل الوصف</title><link>https://news.example/d4</link><pubDate>Sun, 28 Sep 2026 07:00:00 GMT</pubDate><description>&lt;img src="https://cdn.news.example/img/desc-d.jpg" width="800" height="450"/&gt;نص</description></item>
<item><title>خبر E بدون أي صورة</title><link>https://news.example/e5</link><pubDate>Sun, 28 Sep 2026 06:00:00 GMT</pubDate><description>خالٍ من الصور تماماً</description></item>
</channel></rss>`;

const items = parseRss(FEED);
check('parseRss يعيد 5 عناصر', items.length === 5, `${items.length}`);
check('media:content هو الخيار الأول', items[0]?.imageUrl === 'https://cdn.news.example/img/main-a.jpg', items[0]?.imageUrl);
check('أبعاد media:content محفوظة', items[0]?.imageWidth === 1200 && items[0]?.imageHeight === 800);
check('HTTP → HTTPS تلقائياً', !items[0]?.imageUrl?.startsWith('http://'));
check('media:thumbnail عند غياب content', items[1]?.imageUrl === 'https://cdn.news.example/img/thumb-b.jpg');
check('enclosure (image/*) كخيار ثالث', items[2]?.imageUrl === 'https://cdn.news.example/img/enc-c.jpg');
check('صورة داخل الوصف كسقوط', items[3]?.imageUrl === 'https://cdn.news.example/img/desc-d.jpg');
check('العنصر الخالي بلا صورة', !items[4]?.imageUrl);
check('enclosure غير-صوري يُتجاهل', !parseRss('<rss><channel><item><title>x</title><link>https://e.ma/1</link><pubDate>Sun, 28 Sep 2026 06:00:00 GMT</pubDate><description>d</description><enclosure url="https://e.ma/f.mp3" type="audio/mpeg" length="1"/></item></channel></rss>')[0]?.imageUrl);

// ---------- Google News: الرابط الأصلي من مرساة الوصف ----------
check('isAggregatorLink يكشف Google News', isAggregatorLink('https://news.google.com/rss/articles/CBMidxyz') && !isAggregatorLink('https://www.hespress.com/x.html'));
check('resolveItemUrl يفضّل الأصل عند تعرّفه', resolveItemUrl({ link: 'https://news.google.com/rss/articles/x', articleUrl: 'https://p.ma/1' }) === 'https://p.ma/1');
check('resolveItemUrl يبقي الرابط المباشر', resolveItemUrl({ link: 'https://www.le360.ma/a' }) === 'https://www.le360.ma/a');

const GN_FEED = `<?xml version="1.0"?><rss version="2.0"><channel><title>Google News</title>
<item><title>قرار جديد حول الدعم - هسبريس</title>
<link>https://news.google.com/rss/articles/CBMidabc123?hl=ar</link>
<pubDate>Sun, 28 Sep 2026 11:00:00 GMT</pubDate>
<description>&lt;a href="https://www.hespress.com/art-445566.html" target="_blank"&gt;قرار جديد حول الدعم&lt;/a&gt;&amp;nbsp;&lt;font color="#6f6f6f"&gt;هسبريس&lt;/font&gt;</description>
<source url="https://www.hespress.com">هسبريس</source></item>
<item><title>مادة ثانية</title><link>https://news.google.com/rss/articles/CBMiother</link>
<pubDate>Sun, 28 Sep 2026 10:30:00 GMT</pubDate><description>بلا مرساة خارجية</description>
<source url="https://www.le360.ma">Le360</source></item>
</channel></rss>`;
const gn = parseRss(GN_FEED);
check('Google News: الاسم من <source>', gn[0]?.publisherName === 'هسبريس');
check('Google News: رابط المقال الأصلي من مرساة الوصف', gn[0]?.articleUrl === 'https://www.hespress.com/art-445566.html', gn[0]?.articleUrl);
check('Google News: بلا مرساة خارجية ⇒ يبقى التحويلي', gn[1]?.articleUrl === undefined && resolveItemUrl(gn[1]!).includes('news.google.com'));
check('تغذية ناشر مباشر: لا تعويض للرابط', resolveItemUrl(parseRss('<rss><channel><item><title>x</title><link>https://www.hespress.com/a.html</link><pubDate>Sun, 28 Sep 2026 06:00:00 GMT</pubDate><description>&lt;a href="https://ads.t/banner"&gt;إعلان&lt;/a&gt;</description></item></channel></rss>')[0]!) === 'https://www.hespress.com/a.html');

// ---------- استخراج og/twitter من HTML ----------
const HTML = `<html><head>
<meta property="og:image" content="https://cdn.site.example/og-main.jpg" />
<meta name="twitter:image" content="https://cdn.site.example/tw.jpg" />
</head><body><article><img src="/relative/article.jpg" width="1200"/></article></body></html>`;
const fromHtml = extractImageFromHtml(HTML, 'https://site.example/news/1');
check('og:image يتقدم twitter:image', fromHtml?.url === 'https://cdn.site.example/og-main.jpg', fromHtml?.url);

const twOnly = extractImageFromHtml('<html><head><meta name="twitter:image" content="//cdn.site.example/tw2.jpg"/></head><body></body></html>', 'https://site.example/x');
check('twitter:image يعمل (بروتوكول نسبي → https)', twOnly?.url === 'https://cdn.site.example/tw2.jpg', twOnly?.url);

const imgOnly = extractImageFromHtml('<html><body><article><img src="https://cdn.site.example/story.jpg?w=1024"/></article></body></html>', 'https://site.example/x');
check('صورة المقال الرئيسية كسقوط أخير', imgOnly?.url === 'https://cdn.site.example/story.jpg?w=1024', imgOnly?.url);

const bad = extractImageFromHtml('<html><body><article><img src="https://site.example/pixel-tracker.gif"/><img src="https://site.example/logo.png"/><img src="https://cdn.site.example/ok.jpg"/></article></body></html>', 'https://site.example/x');
check('استبعاد تتبّع/شعارات تلقائياً', bad?.url === 'https://cdn.site.example/ok.jpg', bad?.url);

const relImg = extractImageFromHtml('<html><body><article><img src="/wp-content/uploads/2026/09/x.jpg"/></article></body></html>', 'https://site.example/news/1');
check('المسار النسبي يُحوّل مطلقاً', relImg?.url === 'https://site.example/wp-content/uploads/2026/09/x.jpg', relImg?.url);

// ---------- أدوات التنقية ----------
check('score: استبعاد pixel/tracker', scoreImageCandidate({ url: 'https://x.example/pixel.gif', via: 'x' }) < 0);
check('score: استبعاد logo', scoreImageCandidate({ url: 'https://x.example/Logo-Final.png', via: 'x' }) < 0);
check('score: استبعاد الصغيرة جداً', scoreImageCandidate({ url: 'https://cdn.x.example/a.jpg', width: 100, height: 50, via: 'x' }) < 0);
check('score: قبول صورة قرار معقولة', scoreImageCandidate({ url: 'https://images.unsplash.com/photo-abc?w=1200', via: 'x' }) > 0);
check('pickBest: يفضّل الأنسب', pickBestImage([
  { url: 'https://a.example/small.png', width: 60, height: 40, via: 'x' },
  { url: 'https://img.hespress.com/wp-content/a.jpg', width: 900, height: 600, via: 'x' },
])?.url === 'https://img.hespress.com/wp-content/a.jpg');
check('toHttps يرقّع //', toHttps('//cdn.example/x.jpg') === 'https://cdn.example/x.jpg');

// ---------- بيانات الحقوق ----------
const metaPub = buildImageMeta({
  extracted: { url: 'https://cdn.hespress.com/img.jpg', via: 'rss' },
  publisherName: 'هسبريس',
  sourcePageUrl: 'https://hespress.com/123.html',
  title: 'خبر تجريبي',
  category: 'maroc',
});
check('حقوق مجهولة عند غياب ترخيص مصرّح', metaPub.image_rights === 'unknown' && metaPub.image_status === 'unknown_rights');
check('الإسناد يذكر اسم الجهة', (metaPub.image_attribution ?? '').includes('هسبريس'), metaPub.image_attribution);
check('رابط صفحة الأصل محفوظ', metaPub.image_source_url === 'https://hespress.com/123.html');
check('featured_image تشير إلى الأصل (بلا نسخ محلي)', metaPub.featured_image === 'https://cdn.hespress.com/img.jpg');

const metaNone = buildImageMeta({
  extracted: null,
  publisherName: 'هسبريس',
  sourcePageUrl: 'https://hespress.com/123.html',
  title: 'خبر',
  category: 'sport',
});
check('الافتراضية عند الغياب', metaNone.image_status === 'not_found' && (metaNone.image_url ?? metaNone.featured_image).startsWith('/demo-images/sport-'));
check('الافتراضية مرخّصة محلياً', metaNone.image_rights === 'licensed' && (metaNone.image_license ?? '').includes('licensed'));

const metaCC = buildImageMeta({
  extracted: { url: 'https://upload.wikimedia.org/wikipedia/commons/9/99/x.jpg', via: 'og:image' },
  declaredLicense: 'CC BY 2.0',
  publisherName: 'ويكيميديا',
  sourcePageUrl: 'https://commons.wikimedia.org/x',
  title: 'خبر',
  category: 'culture',
});
check('الترخيص المصرّح يُعتمد (publisher+found)', metaCC.image_rights === 'publisher' && metaCC.image_status === 'found' && (metaCC.image_license ?? '').includes('CC'));

const metaDubious = buildImageMeta({
  extracted: { url: 'https://site.example/x/7', via: 'og:image' },
  publisherName: 'موقع',
  sourcePageUrl: 'https://site.example/n',
  title: 't',
  category: 'maroc',
});
check('رابط مشبوه البنية → يتطلب مراجعة', metaDubious.image_status === 'requires_review', metaDubious.image_status);

// ---------- حالة INVALID للصورة المصرّح بها المرفوضة ----------
const vLogo = validateDeclaredImage('http://cdn.news.example/logo-2026.png');
check('validate: شعار مصرّح به في RSS يُرفض كـ INVALID', vLogo.invalid && vLogo.candidate === null);
const vTiny = validateDeclaredImage('https://cdn.news.example/a.jpg', 120, 60);
check('validate: صغيرة جداً تُرفض كـ INVALID', vTiny.invalid);
const vBroken = validateDeclaredImage('not-a-url');
check('validate: رابط معطوب يُرفض كـ INVALID', vBroken.invalid && vBroken.candidate === null);
const vOk = validateDeclaredImage('https://img.le360.ma/uploads/photo.jpg', 1200, 675);
check('validate: صورة صحيحة تُقبل وترقَّع HTTPS', !vOk.invalid && vOk.candidate?.url === 'https://img.le360.ma/uploads/photo.jpg');
const metaInvalid = buildImageMeta({
  extracted: null,
  invalidUrl: vLogo.invalid ? 'https://cdn.news.example/logo-2026.png' : undefined,
  publisherName: 'صحيفة',
  sourcePageUrl: 'https://news.example/a1',
  title: 'خبر',
  category: 'sport',
});
check('buildImageMeta: INVALID يحمل حالة invalid + افتراضية القسم', metaInvalid.image_status === 'invalid' && metaInvalid.featured_image.startsWith('/demo-images/sport-'));
check('buildImageMeta: INVALID يحفظ الرابط المرفوع للتوثيق', metaInvalid.image_url === 'https://cdn.news.example/logo-2026.png');

// ---------- أدوات العرض ----------
check('الافتراضية ضمن القسم', categoryDefaultImage('sport').startsWith('/demo-images/sport-'));
check('قسم غير معروف → maroc', categoryDefaultImage('unknown-cat!').startsWith('/demo-images/maroc-'));
check('displayImage يختار المجلوبة', displayImage({ image_url: 'https://cdn.x/y.jpg', featured_image: '/x.svg', category: 'maroc' }) === 'https://cdn.x/y.jpg');
check('displayImage يسقط للقسم', displayImage({ image_url: undefined, featured_image: undefined, category: 'sport' }).startsWith('/demo-images/sport-'));

// ---------- التخزين الكامل (محاكاة مسار خبر حقيقي) ----------
resetDemoDB();
const parsed0 = items[0]!;
const norm = normalizeRawItem({
  raw_title: parsed0.title,
  raw_body: `${parsed0.title} — ${parsed0.description}`,
  source_url: parsed0.link,
  source_published_at: parsed0.pubDateIso,
});
const meta = buildImageMeta({
  extracted: { url: parsed0.imageUrl!, width: parsed0.imageWidth, height: parsed0.imageHeight, via: 'media:content' },
  publisherName: 'صحيفة اختبار',
  sourcePageUrl: norm.source_url,
  title: norm.title,
  category: 'maroc',
  declaredLicense: 'publisher-feed',
});
const draft = await createArticle({
  title: norm.title,
  summary: norm.body.slice(0, 200),
  content: `<raw>${norm.body}</raw>`,
  category: 'maroc',
  tags: [],
  ...meta,
  source_name: 'صحيفة اختبار',
  source_url: norm.source_url,
  source_published_at: norm.source_published_at,
  canonical_url: norm.canonical_url,
  normalized_title: norm.normalized_title,
  content_hash: norm.content_hash,
  source_references: [{ id: 'r1', name: 'صحيفة اختبار', url: norm.source_url, published_at: norm.source_published_at }],
  status: 'fetched',
  is_demo: false,
});
const stored = loadDB().articles.find((a) => a.id === draft.id);
check('image_url مخزّن في المقال', stored?.image_url === 'https://cdn.news.example/img/main-a.jpg', stored?.image_url);
check('الأبعاد مخزّنة', stored?.image_width === 1200 && stored?.image_height === 800);
check('الحالة/الحقوق مخزّنة', stored?.image_status === 'found' && stored?.image_rights === 'publisher');
check('featured_image = الصورة المجلوبة', stored?.featured_image === stored?.image_url);
check('اسم جهة الصورة مخزّن', stored?.image_source_name === 'صحيفة اختبار');

// ---------- التدفق الكامل من سلك الأنباء (بدون شبكة — سقوط افتراضي) ----------
resetDemoDB();
const wire = (await listSources()).find((s) => s.id === 'src-demo-wire')!;
check('سلك الأنباء التجريبي موجود', Boolean(wire));
if (wire) {
  const snapshot = await buildDedupSnapshot();
  const rep = await ingestOneSource(wire, { snapshot });
  check('الجلب يضيف أخباراً جديدة', rep.found > 0 && rep.added > 0, `${JSON.stringify(rep)}`);
  const wireArticles = loadDB().articles.filter((a) => a.source_url?.includes('wire.demo.example'));
  check('المادة المجلوبة بلا صورة → حالتها not_found', wireArticles.length > 0 && wireArticles.every((a) => a.image_status === 'not_found'));
  check('المادة المجلوبة بلا صورة → افتراضية القسم', wireArticles.every((a) => (a.featured_image ?? '').startsWith('/demo-images/')));
  check('أعمدة الحقوق مضبوطة على الافتراضية المرخّصة', wireArticles.every((a) => a.image_rights === 'licensed'));
  check('لا استدعاء شبكة للصفحات التجريبية (لا image_url خارجي)', wireArticles.every((a) => !a.image_url?.startsWith('http')));
}

console.log(`\n${'='.repeat(50)}\nالنتيجة: ${passed} ناجح / ${failed} فاشل من ${passed + failed}`);
if (failed > 0) process.exit(1);
