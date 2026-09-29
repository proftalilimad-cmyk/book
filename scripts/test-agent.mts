// ============================================================
// اختبار شامل لدورة NEWS AI AGENT في وضع DEMO:
//   رصد المصادر → منع التكرار → معالجة AI → مراجعة → نشر
// التشغيل: npx tsx scripts/test-agent.mts
// ============================================================

import { GlobalWindow } from 'happy-dom';
const window = new GlobalWindow({ url: 'http://localhost/' }) as unknown as Window & typeof globalThis;
const g = globalThis as unknown as Record<string, unknown>;
const extend = (k: string, v: unknown) => {
  try { Object.defineProperty(g, k, { value: v, configurable: true, writable: true }); } catch { /* skip */ }
};
extend('window', window);
extend('document', window.document);
extend('localStorage', window.localStorage);

const { resetDemoDB, loadDB } = await import('../src/lib/store');
const { runScan, processQueue, approveArticle } = await import('../src/services/agentService');
const { findDuplicate, titleSimilarity } = await import('../src/lib/dedup');
const { classifyArticle, generateTitle, generateSummary, extractKeywords } = await import('../src/lib/rewrite');

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) { passed++; console.log(`✓ ${name}`); }
  else { failed++; console.error(`✗ ${name} ${extra ?? ''}`); }
}

// ---------- 1) وحدة منع التكرار ----------
const dup1 = findDuplicate(
  { title: 'المنتخب الوطني يواصل تحضيراته للاستحقاقات المقبلة', source_url: 'https://x.com/a1' },
  [{ title: 'المنتخب الوطني يواصل تحضيراته استعدادا للاستحقاقات المقبلة', source_url: 'https://y.com/b99' }],
);
check('منع التكرار — تشابه العناوين', dup1.match && dup1.reason === 'title-similarity');

const dup2 = findDuplicate(
  { title: 'خبر مختلف تماماً لا علاقة له', source_url: 'https://x.com/a1/' },
  [{ title: 'أي عنوان آخر', source_url: 'https://x.com/a1' }],
);
check('منع التكرار — تطابق الرابط', dup2.match && dup2.reason === 'url');

const sim = titleSimilarity('توقعات الطقس غدا بالمغرب', 'حالة الطقس غدا في مختلف مناطق المغرب');
check('دالة التشابه ترجع قيماً منطقية', sim > 0 && sim < 1, `sim=${sim.toFixed(2)}`);

// ---------- 2) محرك المعالجة ----------
check('تنظيف العنوان من «عاجل»', generateTitle('عاجل.. نتائج مهمة اليوم') === 'نتائج مهمة اليوم');
check('توليد ملخص', generateSummary('الجملة الأولى هنا. الجملة الثانية بعدها. والثالثة أيضاً طويلة بعض الشيء.')?.length > 10);
check('التصنيف الآلي — رياضة', classifyArticle('المنتخب الوطني يستعد للمباراة في البطولة') === 'sports');
check('التصنيف الآلي — تعليم', classifyArticle('نتائج الباكالوريا والامتحانات الدراسية للتلاميذ') === 'education');
check('الكلمات المفتاحية تُستخرج', extractKeywords('الاقتصاد المغربي ينمو والاقتصاد يتطور والاستثمار', 'economy').length >= 2);

// ---------- 3) الدورة الكاملة ----------
resetDemoDB();
const before = loadDB().articles.length;

console.log('\n— تشغيل دورة المراقبة…');
const report = await runScan();
console.log(`   found=${report.foundItems} added=${report.added} dup=${report.duplicatesSkipped}`);

check('الوكيل رصد المواد', report.foundItems === 8, `found=${report.foundItems}`);
check('الوكيل أضاف مواد جديدة بحالة FETCHED', report.added === 7, `added=${report.added}`);
check('الوكيل تجاوز خبراً مكرراً واحداً', report.duplicatesSkipped === 1, `dup=${report.duplicatesSkipped}`);

const afterScan = loadDB();
check('قاعدة البيانات نمت (7 مواد + سجل تكرار)', afterScan.articles.length === before + 8, `${afterScan.articles.length - before}`);
const fetched = afterScan.articles.filter((a) => a.status === 'fetched');
check('المواد الجديدة بحالة FETCHED', fetched.length === 7);
check('المصدر محفوظ في كل مادة', fetched.every((a) => a.source_url && a.source_name));
check('حقول منع التكرار v2 موجودة', fetched.every((a) => a.canonical_url && a.normalized_title && a.content_hash && (a.source_references ?? []).length === 1));
check('المكرر سُجّل DUPLICATE مع مجموعة', afterScan.articles.filter((a) => a.status === 'duplicate' && a.duplicate_group_id).length === 1);

console.log('\n— تشغيل المعالجة الآلية…');
const processed = await processQueue();
check('عولجت كل المواد', processed === 7, `processed=${processed}`);

const pending = loadDB().articles.filter((a) => a.status === 'pending_review');
const reviewRequired = loadDB().articles.filter((a) => a.status === 'review_required');
check('المواد أصبحت PENDING REVIEW (أو تحقق لازم)', pending.length + reviewRequired.length === 7, `pending=${pending.length} rr=${reviewRequired.length}`);
check('المواد السليمة وثّقت VERIFIED في السجل', pending.every((a) => (a.agent_log ?? []).some((l) => l.step === 'VERIFIED')), `${pending.length}/7`);
check('العناوين أُعيد توليدها (بدون «مصدر»)', pending.every((a) => !a.title.startsWith('مصدر')));
check('المحتوى أُعيدت صياغته بفقرات HTML', pending.every((a) => a.content.includes('<p>') && !a.content.includes('<raw>')));
check('التصنيف حُدّد لكل مادة', pending.every((a) => Boolean(a.category)));
check('حقول SEO موجودة', pending.every((a) => a.meta_title && a.meta_description));
check('سجل الوكيل كامل المراحل', pending.every((a) => (a.agent_log ?? []).length >= 3));
const weatherItem = pending.find((a) => a.category === 'weather');
check('مادة الطقس صُنفت صحيحاً', Boolean(weatherItem), pending.map((p) => p.category).join(','));

console.log('\n— اعتماد ونشر…');
await approveArticle(pending[0].id);
const pub = loadDB().articles.find((a) => a.id === pending[0].id)!;
check('النشر يضبط الحالة PUBLISHED', pub.status === 'published');
check('النشر يحدّث سجل الوكيل', (pub.agent_log ?? []).some((l) => l.step === 'PUBLISHED'));

// لا نشر تلقائي: بقية المواد تبقى للمراجعة
check('لا نشر تلقائي — البقية تنتظر المراجعة', loadDB().articles.filter((a) => a.status === 'pending_review').length === 6);

console.log(`\n${failed === 0 ? '✅' : '❌'} النتيجة: ${passed} نجح · ${failed} فشل`);
process.exit(failed === 0 ? 0 : 1);
