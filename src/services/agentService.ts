// ============================================================
// NEWS AI AGENT — وكيل الأخبار الذكي
//  1) مراقبة المصادر  2) اكتشاف الأخبار الجديدة  3) منع التكرار
//  4) استخلاص المعلومات  5) توليد العنوان والملخص  6) إعادة الصياغة
//  7) التصنيف  8) الكلمات المفتاحية  9) SEO  10) إرسال للمراجعة
//  دورة الحالة: NEW → PROCESSING → AI_EDITED → PENDING_REVIEW → PUBLISHED
// ============================================================

import { supabase, dataMode } from '@/lib/supabaseClient';
import { loadDB } from '@/lib/store';
import {
  buildSeoFields,
  classifyArticle,
  detectRegion,
  extractKeywords,
  generateSummary,
  generateTitle,
  rewriteBody,
} from '@/lib/rewrite';
import { extractFacts, verifyArticle } from '@/lib/verify';
import { buildDedupSnapshot, ingestOneSource } from '@/services/ingestService';
import { listSources } from '@/services/sourceService';
import { addLog } from '@/services/settingsService';
import { updateArticle } from '@/services/articleService';
import { uid } from '@/lib/utils';

export interface ScanReport {
  scannedSources: number;
  foundItems: number;
  added: number;
  duplicatesSkipped: number;
  errors: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function agentLog(step: string, note?: string) {
  return { at: new Date().toISOString(), step, note };
}

/** 1-3: مراقبة المصادر، اكتشاف الجديد، ومنع التكرار مع الدمج */
export async function runScan(onProgress?: (msg: string) => void): Promise<ScanReport> {
  const sources = await listSources();
  // أولوية أعلى = فحص أسبق
  const active = sources
    .filter((s) => s.status === 'active')
    .sort((a, b) => (b.priority ?? 3) - (a.priority ?? 3));
  const report: ScanReport = {
    scannedSources: active.length,
    foundItems: 0,
    added: 0,
    duplicatesSkipped: 0,
    errors: [],
  };

  if (active.length === 0) {
    await addLog('warn', 'AGENT_SCAN', 'لا توجد مصادر نشطة للمراقبة. أضف مصادر من إدارة المصادر.');
    return report;
  }

  onProgress?.(`مراقبة ${active.length} مصدر نشط…`);
  await addLog('info', 'AGENT_SCAN', `بدء دورة مراقبة على ${active.length} مصدر نشط.`);

  // ---------- وضع الإنتاج: Edge Function تؤدي الدورة كاملة على الخادم ----------
  if (dataMode === 'supabase' && supabase) {
    const { data, error } = await supabase.functions.invoke('news-agent', {
      body: { action: 'scan' },
    });
    if (error) {
      report.errors.push(error.message);
      await addLog('error', 'AGENT_SCAN', `فشل استدعاء Edge Function: ${error.message}`);
      return report;
    }
    report.foundItems = data?.found ?? 0;
    report.added = data?.added ?? 0;
    report.duplicatesSkipped = data?.duplicatesSkipped ?? 0;
    report.errors = data?.errors ?? [];
    onProgress?.(`خادم الوكيل: رُصدت ${report.foundItems} مادة — أُرسلت ${report.added} للمراجعة، ${report.duplicatesSkipped} مكررة.`);
    await addLog(
      'info',
      'AGENT_SCAN_DONE',
      `دورة الخادم: found=${report.foundItems}, added=${report.added}, dup=${report.duplicatesSkipped}`,
    );
    return report;
  }

  // ---------- وضع DEMO: تجميع كامل عبر خدمة INGEST (جلب→تطبيع→منع تكرار→دمج) ----------
  const snapshot = await buildDedupSnapshot();

  let idx = 0;
  for (const source of active) {
    idx += 1;
    onProgress?.(`(${idx}/${active.length}) جلب: ${source.name}…`);
    const r = await ingestOneSource(source, { snapshot });
    if (r.error) {
      report.errors.push(`${source.name}: ${r.error}`);
      continue;
    }
    report.foundItems += r.found;
    report.added += r.added;
    report.duplicatesSkipped += r.duplicates;
    onProgress?.(
      `(${idx}/${active.length}) ${source.name}: ${r.found} مادة — ${r.added} جديدة${r.merged > 0 ? `، ${r.merged} مُدمجة في أخبار رئيسية` : ''}`,
    );
  }

  onProgress?.(`انتهت المراقبة: ${report.added} جديدة، ${report.duplicatesSkipped} مكررة، ${report.errors.length} أخطاء.`);
  await addLog(
    'info',
    'AGENT_SCAN_DONE',
    `اكتملت المراقبة — رُصدت ${report.foundItems} مادة، أُضيفت ${report.added}، تُجاهلت ${report.duplicatesSkipped} مكررة، أخطاء: ${report.errors.length}.`,
  );
  return report;
}

/** 4-11: معالجة مواد FETCHED/NEW عبر مراحل الذكاء الاصطناعي (وضع DEMO المحلي):
 *  EXTRACT → REWRITE AR → VERIFY → CLASSIFY → SEO → PENDING_REVIEW أو REVIEW_REQUIRED */
export async function processQueue(onProgress?: (msg: string) => void): Promise<number> {
  if (dataMode === 'supabase') {
    onProgress?.('في وضع الإنتاج تتم المعالجة داخل Edge Function (news-agent) على الخادم.');
    return 0;
  }
  const queue = loadDB().articles.filter((a) => a.status === 'fetched' || a.status === 'new');
  if (queue.length === 0) {
    onProgress?.('لا توجد مواد بحالة FETCHED في قائمة الانتظار.');
    return 0;
  }
  let processed = 0;
  for (const article of queue) {
    const raw = article.content.replace(/<\/?raw>/g, '');
    const pushLog = (step: string, note?: string) => [
      ...(article.agent_log ?? []),
      ...(loadDB().articles.find((x) => x.id === article.id)?.agent_log ?? []),
      agentLog(step, note),
    ];

    await updateArticle(article.id, { status: 'processing', agent_log: [] });
    await addLog('info', 'AGENT_PROCESSING', `بدء معالجة: ${article.title.slice(0, 60)}…`);
    onProgress?.(`معالجة: ${article.title.slice(0, 50)}…`);
    await sleep(500);

    // EXTRACT — استخلاص الوقائع من النص الخام
    const facts = extractFacts(raw);

    // REWRITE IN ARABIC — عنوان وملخص ومحتوى عربي أصلي + تصنيف + SEO
    const title = generateTitle(article.title);
    const summary = generateSummary(raw);
    const content = rewriteBody(title, raw, article.source_name);
    const category = classifyArticle(`${title} ${raw}`);
    const region = detectRegion(`${title} ${raw}`);
    const keywords = extractKeywords(`${title}. ${raw}`, category);
    const seo = buildSeoFields(title, summary);

    await updateArticle(article.id, { status: 'ai_edited', agent_log: [] });
    await sleep(300);

    // VERIFY — فحص الوقائع قبل العرض على المحرر
    const verification = verifyArticle({
      rawText: raw,
      rewrittenText: `${title}. ${summary}. ${content}`,
      title,
      source_url: article.source_url,
      source_published_at: article.source_published_at,
      otherSourcesText: [],
    });

    const logs = [
      ...pushLog('PROCESSING', `استُخلصت ${facts.numbers.length + facts.years.length} رقماً وتاريخاً من المادة الخام`),
      agentLog('REWRITTEN', 'توليد العنوان والملخص وإعادة الصياغة العربية والتصنيف وSEO'),
      verification.ok
        ? agentLog('VERIFIED', `فحص الوقائع ناجح (ثقة ${Math.round(verification.score * 100)}%)`)
        : agentLog('REVIEW_REQUIRED', `فحص الوقائع أثار ملاحظات: ${verification.issues.join(' | ')}`),
    ];

    await updateArticle(article.id, {
      title,
      summary,
      content,
      category,
      region: region ?? article.region,
      tags: keywords.slice(0, 5),
      keywords,
      meta_title: seo.meta_title,
      meta_description: seo.meta_description,
      // الصورة المجلوبة مع الخبر محفوظة — الافتراضية تُعيَّن فقط عند غيابها
      featured_image:
        article.image_url && /^https?:\/\//.test(article.image_url)
          ? article.image_url
          : region
            ? `/demo-images/region-${region}.svg`
            : `/demo-images/${category}-${(processed % 3) as 0 | 1 | 2}.svg`,
      image_alt: article.image_alt ?? title,
      status: verification.ok ? 'pending_review' : 'review_required',
      agent_log: [
        ...logs,
        agentLog(
          verification.ok ? 'PENDING_REVIEW' : 'REVIEW_REQUIRED',
          verification.ok ? 'بانتظار مراجعة المحرر قبل النشر' : 'معلومة غير مؤكدة — مطلوب تحقق بشري قبل أي نشر',
        ),
      ],
    });
    await addLog(
      'info',
      verification.ok ? 'AGENT_PENDING' : 'AGENT_REVIEW_REQUIRED',
      verification.ok
        ? `أُرسل للمراجعة: ${title.slice(0, 70)}…`
        : `أُرسل لمراجعة مستعجلة (ملاحظات تحقق): ${title.slice(0, 60)}…`,
      { id: article.id },
    );
    onProgress?.(
      verification.ok
        ? `أُرسل إلى المراجعة: ${title.slice(0, 50)}…`
        : `⚠ يحتاج تحققاً: ${title.slice(0, 45)}…`,
    );
    processed += 1;
    await sleep(250);
  }
  await addLog('info', 'AGENT_PROCESS_DONE', `اكتملت معالجة ${processed} مادة.`);
  return processed;
}

/** الموافقة على مادة من قائمة المراجعة = نشر */
export async function approveArticle(id: string): Promise<void> {
  const a = loadDB().articles.find((x) => x.id === id);
  await updateArticle(id, {
    status: 'published',
    published_at: new Date().toISOString(),
    agent_log: [...(a?.agent_log ?? []), agentLog('PUBLISHED', 'اعتمدها المحرر ونُشرت للعموم')],
  });
  await addLog('info', 'EDITOR_APPROVE', `اعتُمدت ونُشرت مادة (ID: ${id.slice(0, 8)}…)`);
}

export async function rejectArticle(id: string): Promise<void> {
  const a = loadDB().articles.find((x) => x.id === id);
  await updateArticle(id, {
    status: 'rejected',
    agent_log: [...(a?.agent_log ?? []), agentLog('REJECTED', 'رفضها المحرر بعد المراجعة')],
  });
  await addLog('warn', 'EDITOR_REJECT', `رُفضت مادة من قائمة المراجعة (ID: ${id.slice(0, 8)}…)`);
}

export function makeAgentNote(): string {
  return `agent-${uid().slice(0, 6)}`;
}
