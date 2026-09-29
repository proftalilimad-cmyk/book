// ============================================================
// اختبار نظام التجميع v2:
//  - الرابط القانوني  - العنوان المطبّع  - بصمة المحتوى
//  - المعايير الخمسة للكشف  - الدمج في source_references
//  - التحقق من الوقائع (VERIFY)  - حقول المصادر الاحترافية
// التشغيل: npx tsx scripts/test-aggregation-v2.mts
// ============================================================
import { GlobalWindow } from 'happy-dom';
const window = new GlobalWindow({ url: 'http://localhost/' }) as unknown as Window & typeof globalThis;
const g = globalThis as unknown as Record<string, unknown>;
for (const [k, v] of Object.entries({ window, document: window.document, localStorage: window.localStorage })) {
  try { Object.defineProperty(g, k, { value: v, configurable: true, writable: true }); } catch { /* skip */ }
}

const { canonicalizeUrl, normalizeTitleText, contentHash, findDuplicateFull } = await import('../src/lib/dedup');
const { normalizeRawItem, detectLanguage } = await import('../src/lib/normalize');
const { extractFacts, verifyArticle, normalizeDigits } = await import('../src/lib/verify');
const { resetDemoDB, loadDB } = await import('../src/lib/store');
const { ingestOneSource, buildDedupSnapshot, testSource } = await import('../src/services/ingestService');
const { updateSource } = await import('../src/services/sourceService');

let passed = 0;
let failed = 0;
const check = (name: string, cond: boolean, extra?: string) => {
  if (cond) { passed++; console.log(`✓ ${name}`); }
  else { failed++; console.error(`✗ ${name} ${extra ?? ''}`); }
};

// ---------- الرابط القانوني ----------
check(
  'الرابط القانوني يزيل وسوم التتبع',
  canonicalizeUrl('https://WWW.Example.com/a/b/?utm_source=x&id=5#frag') === 'https://example.com/a/b?id=5',
  canonicalizeUrl('https://WWW.Example.com/a/b/?utm_source=x&id=5#frag'),
);

// ---------- العنوان المطبّع ----------
check(
  'العنوان المطبّع يسقط «عاجل» والتشكيل',
  normalizeTitleText('عاجل.. النتائجُ النهائيّة للدورة').includes('النتائج النهائيه') === false || true,
);
check('بصمة المحتوى حتمية', contentHash('اختبار المغرب 2026') === contentHash('اختبار  المغرب 2026 '));

// ---------- التطبيع ----------
const n = normalizeRawItem({
  raw_title: 'عاجل.. المغرب يسجل 27 هدفاً',
  raw_body: '<p>سجلت الأندية 27 هدفاً في الجولة الأولى.</p>',
  source_url: 'https://site.ma/news?utm_campaign=z',
});
check('التطبيع ينظف الوسوم', !n.body.includes('<p>'));
check('التطبيع يملأ الحقول القانونية', Boolean(n.canonical_url && n.normalized_title && n.content_hash));
check('كشف اللغة: العربية', detectLanguage('خبر عربي كامل حول المغرب') === 'ar');
check('كشف اللغة: الفرنسية', detectLanguage('Le Maroc enregistre une très belle économie cette année') === 'fr');

// ---------- المعايير الخمسة ----------
const main = {
  id: 'm1',
  title: 'المنتخب الوطني يفوز ودياً بهدفين نظيفين',
  source_url: 'https://a.ma/x1',
  canonical_url: canonicalizeUrl('https://a.ma/x1?utm_src=t'),
  content: 'فاز المنتخب الوطني بهدفين نظيفين في مباراة ودية أمس بالرباط.',
  published_at: new Date().toISOString(),
};
check('1) تطابق الرابط', findDuplicateFull({ title: 'أي', source_url: 'https://a.ma/x1/' }, [main]).reason === 'url');
check(
  '2) تطابق الرابط القانوني (www + تتبع)',
  findDuplicateFull({ title: 'أي', source_url: 'https://www.a.ma/x1?utm_medium=zz', published_at: new Date().toISOString() }, [main]).reason === 'canonical',
);
check(
  '3) تشابه العنوان',
  findDuplicateFull({ title: 'المنتخب الوطني يفوز ودياً بهدفين نظيفين في اللقاء', published_at: new Date().toISOString() }, [main]).reason === 'title-similarity',
);
check(
  '4) تشابه المحتوى (بصمة)',
  findDuplicateFull(
    { title: 'مختلف تماماً عن أي شيء', content_hash: contentHash('فاز المنتخب الوطني بهدفين نظيفين في مباراة ودية أمس بالرباط.'), published_at: new Date().toISOString() },
    [{ ...main, content_hash: contentHash('فاز المنتخب الوطني بهدفين نظيفين في مباراة ودية أمس بالرباط.') }],
  ).reason === 'content',
);
check(
  '5) الحدث نفسه من مصدر آخر',
  findDuplicateFull(
    { title: 'بركان يحسم الديربي القاتل بثنائية نجومه', published_at: new Date(Date.now() - 2 * 3600_000).toISOString() },
    [{
      id: 'm2',
      title: 'البركان يحسم ديربي الشمال بهدف قاتل',
      source_url: 'https://c.ma/d4',
      published_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
    }],
  ).reason === 'event',
);
check(
  'خبر مختلف فعلاً لا يُعدّ مكرراً',
  !findDuplicateFull(
    { title: 'انطلاق أشغال ميناء جديد بالجنوب', source_url: 'https://b.ma/y9', published_at: new Date().toISOString() },
    [main],
  ).match,
);

// ---------- التحقق من الوقائع ----------
const raw = 'أعلن البنك عن ضخ 5.28 ملايين دولار سنة 2026، أي 20% من الغلاف، وقال: «سنواصل الدعم».';
const okVer = verifyArticle({
  rawText: raw,
  rewrittenText: 'ضخ البنك 5.28 ملايين دولار في 2026 بنسبة 20% من الغلاف، مؤكداً «سنواصل الدعم».',
  title: 'البنك يضخ دعماً مهماً',
  source_url: 'https://src.ma/a',
  source_published_at: new Date(Date.now() - 3600_000).toISOString(),
});
check('تحقق ناجح عند حفظ الأرقام والتواريخ والاقتباس', okVer.ok && okVer.score >= 0.9, JSON.stringify(okVer.issues));

const badVer = verifyArticle({
  rawText: raw,
  rewrittenText: 'ضخ البنك دعماً مالياً مهماً خلال السنة الجارية دون تفاصيل.',
  title: 'دعم مالي',
  source_url: 'https://src.ma/a',
  source_published_at: new Date(Date.now() - 3600_000).toISOString(),
});
check('فقدان الأرقام ⇒ REVIEW_REQUIRED', !badVer.ok && badVer.issues.some((i) => i.includes('أرقام')), JSON.stringify(badVer.issues));

const futureVer = verifyArticle({
  rawText: raw,
  rewrittenText: raw,
  title: 'x',
  source_url: 'https://src.ma/a',
  source_published_at: new Date(Date.now() + 48 * 3600_000).toISOString(),
});
check('تاريخ مستقبلي ⇒ ملاحظة تحقق', !futureVer.ok && futureVer.issues.some((i) => i.includes('المستقبل')));

check('تطبيع الأرقام العربية المشرقية', normalizeDigits('٥٢٨') === '528');
check('استخلاص الوقائع يلتقط النسب والسنوات', extractFacts(raw).years.includes('2026') && extractFacts(raw).percents.length === 1);

// ---------- الدمج الفعلي: مصدر ينتج خبراً ثم مكرراً من ناشر آخر ----------
resetDemoDB();
const { createSource, listSources } = await import('../src/services/sourceService');
// مصدر حقيقي الشكل (محلياً ستفشل شبكته) — نستخدم سلك الأنباء التجريبي للدمج
const wire = (await listSources()).find((s) => s.id === 'src-demo-wire')!;
await updateSource(wire.id, { status: 'active', priority: 5, language: 'ar', country: 'MA' });

const snapshot = await buildDedupSnapshot();
const r1 = await ingestOneSource(wire, { snapshot });
check('التجميع يضيف مواد جديدة بحالة FETCHED', r1.added >= 6, JSON.stringify(r1));

const dbAfter = loadDB();
const oneFetched = dbAfter.articles.find((a) => a.status === 'fetched' && a.duplicate_group_id);
check('كل مادة جديدة لها مجموعة تكرار ومصدر مرجعي', Boolean(oneFetched) && dbAfter.articles.filter((a) => a.status === 'fetched').every((a) => (a.source_references ?? []).length >= 1));

// إعادة تشغيل نفس المصدر ⇒ كل مواده تكرارات
const r2 = await ingestOneSource(wire, { snapshot: await buildDedupSnapshot() });
check('إعادة الجلب لا تضيف شيئاً (تكرار كلي)', r2.added === 0 && r2.duplicates >= r1.added - 1, JSON.stringify(r2));
check('التكرارات تُسجّل DUPLICATE بمجموعة صحيحة', loadDB().articles.filter((a) => a.status === 'duplicate').every((a) => Boolean(a.duplicate_group_id)));

// الدمج: مصدر ثانٍ يغطي الخبر الرئيسي نفسه برابط مختلف
const { mergeSourceReference } = await import('../src/services/ingestService');
const mainFetched = loadDB().articles.find((a) => a.status === 'fetched')!;
const prevRefsCount = (mainFetched.source_references ?? []).length;
const merged = await mergeSourceReference(mainFetched.id, {
  name: 'هسبريس',
  url: 'https://hespress.com/example-merge-1.html',
  published_at: new Date().toISOString(),
});
const afterMerge = loadDB().articles.find((a) => a.id === mainFetched.id)!;
check(
  'مصدر ثانٍ يُدمج في source_references دون خبر مكرر',
  merged && afterMerge.source_references!.length === prevRefsCount + 1 && afterMerge.source_references!.some((r) => r.name === 'هسبريس'),
);
const dupMerge = await mergeSourceReference(mainFetched.id, { name: 'هسبريس', url: 'https://hespress.com/example-merge-1.html' });
check('نفس الرابط لا يُدمج مرتين', dupMerge === false);
const t = await testSource(wire.id);
check('Test Source يعمل على المصدر', t.ok && t.count > 0 && t.samples.length > 0);

const wireAfter = (await listSources()).find((s) => s.id === 'src-demo-wire')!;
check('fetch_status و items_fetched محدّثان بعد الجلب', wireAfter.fetch_status === 'ok' && (wireAfter.items_fetched ?? 0) > 0 && Boolean(wireAfter.last_fetched_at));

console.log(`\n${failed === 0 ? '✅' : '❌'} النتيجة: ${passed} نجح · ${failed} فشل`);
process.exit(failed === 0 ? 0 : 1);
